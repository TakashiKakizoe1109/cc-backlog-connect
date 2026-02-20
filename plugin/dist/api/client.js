"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BacklogApiClient = exports.BacklogClientError = void 0;
const TIMEOUT_MS = 30_000;
const PAGE_SIZE = 100;
const MAX_RETRIES = 3;
const BACKLOG_ERROR_CODES = {
    1: "InternalError",
    2: "LicenceError",
    3: "LicenceExpiredError",
    4: "AccessDeniedError",
    5: "UnauthorizedOperationError",
    6: "NoResourceError",
    7: "InvalidRequestError",
    8: "SpaceOverCapacityError",
    9: "ResourceOverflowError",
    10: "TooLargeFileError",
    11: "AuthenticationError",
    12: "RequiredMFAError",
    13: "TooManyRequestsError",
};
class BacklogClientError extends Error {
    statusCode;
    errors;
    constructor(message, statusCode, errors) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.name = "BacklogClientError";
    }
}
exports.BacklogClientError = BacklogClientError;
class BacklogApiClient {
    baseUrl;
    apiKey;
    space;
    rateLimitState = {
        read: { remaining: Infinity, reset: 0 },
        update: { remaining: Infinity, reset: 0 },
    };
    constructor(config) {
        this.space = config.space;
        this.baseUrl = `https://${config.space}.backlog.com/api/v2`;
        this.apiKey = config.apiKey;
    }
    handleError(response, errors) {
        if (errors && errors.length > 0) {
            const messages = errors.map((e) => {
                const codeName = BACKLOG_ERROR_CODES[e.code] ?? `ErrorCode(${e.code})`;
                const more = e.moreInfo ? ` (${e.moreInfo})` : "";
                return `[${codeName}] ${e.message}${more}`;
            });
            throw new BacklogClientError(messages.join("\n"), response.status, errors);
        }
        const httpMessages = {
            401: "Authentication failed. Check your API key.",
            403: "Access denied. Check your permissions.",
            404: "Resource not found. Check your space/project settings.",
        };
        const message = httpMessages[response.status] ?? `API error: ${response.status} ${response.statusText}`;
        throw new BacklogClientError(message, response.status, errors);
    }
    static computeRetryWaitMs(resetHeader, fallbackMs = 60_000) {
        if (!resetHeader)
            return fallbackMs;
        const resetAt = Number(resetHeader) * 1000;
        if (!Number.isFinite(resetAt))
            return fallbackMs;
        const wait = resetAt - Date.now();
        return Math.max(wait, 1000);
    }
    updateRateLimit(response, category) {
        const remaining = response.headers.get("X-RateLimit-Remaining");
        const reset = response.headers.get("X-RateLimit-Reset");
        if (remaining !== null)
            this.rateLimitState[category].remaining = Number(remaining);
        if (reset !== null)
            this.rateLimitState[category].reset = Number(reset);
    }
    async waitIfThrottled(category) {
        const state = this.rateLimitState[category];
        if (state.remaining <= 5 && state.reset > 0) {
            const wait = Math.max(state.reset * 1000 - Date.now(), 0);
            if (wait > 0) {
                console.warn(`Rate limit low (${state.remaining} remaining). Waiting ${Math.ceil(wait / 1000)}s...`);
                await new Promise((resolve) => setTimeout(resolve, wait));
                state.remaining = Infinity;
            }
        }
    }
    async request(path, params = {}, retryCount = 0) {
        await this.waitIfThrottled("read");
        const url = new URL(`${this.baseUrl}${path}`);
        url.searchParams.set("apiKey", this.apiKey);
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
            const response = await fetch(url.toString(), {
                signal: controller.signal,
            });
            if (response.status === 429) {
                if (retryCount >= MAX_RETRIES) {
                    throw new BacklogClientError("Rate limit exceeded. Max retries reached.", 429);
                }
                const resetHeader = response.headers.get("X-RateLimit-Reset");
                const wait = BacklogApiClient.computeRetryWaitMs(resetHeader);
                console.warn(`Rate limited. Waiting ${Math.ceil(wait / 1000)}s before retry...`);
                await new Promise((resolve) => setTimeout(resolve, wait));
                return this.request(path, params, retryCount + 1);
            }
            this.updateRateLimit(response, "read");
            if (!response.ok) {
                let errors;
                try {
                    const body = (await response.json());
                    errors = body.errors;
                }
                catch { }
                this.handleError(response, errors);
            }
            return (await response.json());
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async requestWithBody(method, path, body, retryCount = 0) {
        await this.waitIfThrottled("update");
        const url = new URL(`${this.baseUrl}${path}`);
        url.searchParams.set("apiKey", this.apiKey);
        const formBody = new URLSearchParams();
        if (body) {
            for (const [key, value] of Object.entries(body)) {
                if (value === undefined || value === null)
                    continue;
                if (Array.isArray(value)) {
                    for (const v of value) {
                        formBody.append(`${key}[]`, String(v));
                    }
                }
                else {
                    formBody.append(key, String(value));
                }
            }
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
            const response = await fetch(url.toString(), {
                method,
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: formBody.toString(),
                signal: controller.signal,
            });
            if (response.status === 429) {
                if (retryCount >= MAX_RETRIES) {
                    throw new BacklogClientError("Rate limit exceeded. Max retries reached.", 429);
                }
                const resetHeader = response.headers.get("X-RateLimit-Reset");
                const wait = BacklogApiClient.computeRetryWaitMs(resetHeader);
                console.warn(`Rate limited. Waiting ${Math.ceil(wait / 1000)}s before retry...`);
                await new Promise((resolve) => setTimeout(resolve, wait));
                return this.requestWithBody(method, path, body, retryCount + 1);
            }
            this.updateRateLimit(response, "update");
            if (!response.ok) {
                let errors;
                try {
                    const respBody = (await response.json());
                    errors = respBody.errors;
                }
                catch { }
                this.handleError(response, errors);
            }
            const text = await response.text();
            if (!text)
                return {};
            return JSON.parse(text);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    // --- Project ---
    async getProject(projectKey) {
        return this.request(`/projects/${projectKey}`);
    }
    // --- Issues ---
    async getIssues(projectId, opts = {}) {
        const allIssues = [];
        let offset = 0;
        while (true) {
            const params = {
                "projectId[]": String(projectId),
                count: String(PAGE_SIZE),
                offset: String(offset),
                sort: "updated",
                order: "desc",
            };
            if (opts.keyword)
                params.keyword = opts.keyword;
            if (opts.parentChild !== undefined)
                params.parentChild = String(opts.parentChild);
            const arrayParams = [
                ["statusId", opts.statusId],
                ["issueTypeId", opts.issueTypeId],
                ["categoryId", opts.categoryId],
                ["milestoneId", opts.milestoneId],
                ["assigneeId", opts.assigneeId],
                ["versionId", opts.versionId],
                ["priorityId", opts.priorityId],
                ["createdUserId", opts.createdUserId],
                ["resolutionId", opts.resolutionId],
            ];
            for (const [name, ids] of arrayParams) {
                if (ids) {
                    for (let i = 0; i < ids.length; i++) {
                        params[`${name}[${i}]`] = String(ids[i]);
                    }
                }
            }
            const issues = await this.request("/issues", params);
            allIssues.push(...issues);
            if (issues.length < PAGE_SIZE)
                break;
            offset += PAGE_SIZE;
        }
        return allIssues;
    }
    async searchIssues(projectId, opts = {}) {
        const params = {
            "projectId[]": String(projectId),
            count: String(opts.count ?? PAGE_SIZE),
            offset: String(opts.offset ?? 0),
            sort: "updated",
            order: "desc",
        };
        if (opts.keyword)
            params.keyword = opts.keyword;
        if (opts.parentChild !== undefined)
            params.parentChild = String(opts.parentChild);
        const arrayParams = [
            ["statusId", opts.statusId],
            ["assigneeId", opts.assigneeId],
            ["issueTypeId", opts.issueTypeId],
            ["categoryId", opts.categoryId],
            ["milestoneId", opts.milestoneId],
            ["versionId", opts.versionId],
            ["priorityId", opts.priorityId],
            ["createdUserId", opts.createdUserId],
            ["resolutionId", opts.resolutionId],
        ];
        for (const [name, ids] of arrayParams) {
            if (ids) {
                for (let i = 0; i < ids.length; i++) {
                    params[`${name}[${i}]`] = String(ids[i]);
                }
            }
        }
        return this.request("/issues", params);
    }
    async countIssues(projectId, opts = {}) {
        const params = {
            "projectId[]": String(projectId),
        };
        if (opts.keyword)
            params.keyword = opts.keyword;
        if (opts.parentChild !== undefined)
            params.parentChild = String(opts.parentChild);
        const arrayParams = [
            ["statusId", opts.statusId],
            ["assigneeId", opts.assigneeId],
            ["issueTypeId", opts.issueTypeId],
            ["categoryId", opts.categoryId],
            ["milestoneId", opts.milestoneId],
            ["versionId", opts.versionId],
            ["priorityId", opts.priorityId],
            ["createdUserId", opts.createdUserId],
            ["resolutionId", opts.resolutionId],
        ];
        for (const [name, ids] of arrayParams) {
            if (ids) {
                for (let i = 0; i < ids.length; i++) {
                    params[`${name}[${i}]`] = String(ids[i]);
                }
            }
        }
        return this.request("/issues/count", params);
    }
    async getIssue(issueKey) {
        return this.request(`/issues/${issueKey}`);
    }
    async addIssue(params) {
        const body = {
            projectId: params.projectId,
            summary: params.summary,
            issueTypeId: params.issueTypeId,
            priorityId: params.priorityId,
        };
        if (params.description !== undefined)
            body.description = params.description;
        if (params.assigneeId !== undefined)
            body.assigneeId = params.assigneeId;
        if (params.categoryId)
            body.categoryId = params.categoryId;
        if (params.versionId)
            body.versionId = params.versionId;
        if (params.milestoneId)
            body.milestoneId = params.milestoneId;
        if (params.dueDate)
            body.dueDate = params.dueDate;
        if (params.estimatedHours !== undefined)
            body.estimatedHours = params.estimatedHours;
        if (params.actualHours !== undefined)
            body.actualHours = params.actualHours;
        if (params.parentIssueId !== undefined)
            body.parentIssueId = params.parentIssueId;
        return this.requestWithBody("POST", "/issues", body);
    }
    async updateIssue(issueKey, params) {
        const body = {};
        if (params.summary !== undefined)
            body.summary = params.summary;
        if (params.description !== undefined)
            body.description = params.description;
        if (params.statusId !== undefined)
            body.statusId = params.statusId;
        if (params.assigneeId !== undefined)
            body.assigneeId = params.assigneeId;
        if (params.priorityId !== undefined)
            body.priorityId = params.priorityId;
        if (params.issueTypeId !== undefined)
            body.issueTypeId = params.issueTypeId;
        if (params.categoryId)
            body.categoryId = params.categoryId;
        if (params.versionId)
            body.versionId = params.versionId;
        if (params.milestoneId)
            body.milestoneId = params.milestoneId;
        if (params.dueDate !== undefined)
            body.dueDate = params.dueDate;
        if (params.estimatedHours !== undefined)
            body.estimatedHours = params.estimatedHours;
        if (params.actualHours !== undefined)
            body.actualHours = params.actualHours;
        if (params.resolutionId !== undefined)
            body.resolutionId = params.resolutionId;
        if (params.comment !== undefined)
            body.comment = params.comment;
        return this.requestWithBody("PATCH", `/issues/${issueKey}`, body);
    }
    async deleteIssue(issueKey) {
        return this.requestWithBody("DELETE", `/issues/${issueKey}`);
    }
    // --- Comments ---
    async getComments(issueKey) {
        const allComments = [];
        let minId;
        while (true) {
            const params = {
                count: String(PAGE_SIZE),
                order: "asc",
            };
            if (minId !== undefined) {
                params.minId = String(minId);
            }
            const comments = await this.request(`/issues/${issueKey}/comments`, params);
            allComments.push(...comments);
            if (comments.length < PAGE_SIZE)
                break;
            minId = comments[comments.length - 1].id + 1;
        }
        return allComments;
    }
    async getComment(issueKey, commentId) {
        return this.request(`/issues/${issueKey}/comments/${commentId}`);
    }
    async addComment(issueKey, content, notifiedUserIds) {
        const body = { content };
        if (notifiedUserIds && notifiedUserIds.length > 0) {
            body.notifiedUserId = notifiedUserIds;
        }
        return this.requestWithBody("POST", `/issues/${issueKey}/comments`, body);
    }
    async updateComment(issueKey, commentId, content) {
        return this.requestWithBody("PATCH", `/issues/${issueKey}/comments/${commentId}`, { content });
    }
    async deleteComment(issueKey, commentId) {
        return this.requestWithBody("DELETE", `/issues/${issueKey}/comments/${commentId}`);
    }
    // --- Attachments ---
    async getAttachments(issueKey) {
        return this.request(`/issues/${issueKey}/attachments`);
    }
    async downloadAttachment(issueKey, attachmentId) {
        const url = new URL(`${this.baseUrl}/issues/${issueKey}/attachments/${attachmentId}`);
        url.searchParams.set("apiKey", this.apiKey);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
            const response = await fetch(url.toString(), {
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new BacklogClientError(`Failed to download attachment ${attachmentId}: ${response.status}`, response.status);
            }
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    // --- Project Metadata ---
    async getStatuses(projectKey) {
        return this.request(`/projects/${projectKey}/statuses`);
    }
    async getIssueTypes(projectKey) {
        return this.request(`/projects/${projectKey}/issueTypes`);
    }
    async getPriorities() {
        return this.request("/priorities");
    }
    async getResolutions() {
        return this.request("/resolutions");
    }
    async getCategories(projectKey) {
        return this.request(`/projects/${projectKey}/categories`);
    }
    async getVersions(projectKey) {
        return this.request(`/projects/${projectKey}/versions`);
    }
    async getProjectUsers(projectKey) {
        return this.request(`/projects/${projectKey}/users`);
    }
    // --- Wiki ---
    async getWikiPages(projectIdOrKey, keyword) {
        const params = { projectIdOrKey };
        if (keyword)
            params.keyword = keyword;
        return this.request("/wikis", params);
    }
    async getWikiPage(wikiId) {
        return this.request(`/wikis/${wikiId}`);
    }
    async addWikiPage(projectId, name, content, mailNotify) {
        const body = { projectId, name, content };
        if (mailNotify !== undefined)
            body.mailNotify = mailNotify;
        return this.requestWithBody("POST", "/wikis", body);
    }
    async updateWikiPage(wikiId, opts) {
        const body = {};
        if (opts.name !== undefined)
            body.name = opts.name;
        if (opts.content !== undefined)
            body.content = opts.content;
        if (opts.mailNotify !== undefined)
            body.mailNotify = opts.mailNotify;
        return this.requestWithBody("PATCH", `/wikis/${wikiId}`, body);
    }
    async deleteWikiPage(wikiId, mailNotify) {
        const body = {};
        if (mailNotify !== undefined)
            body.mailNotify = mailNotify;
        return this.requestWithBody("DELETE", `/wikis/${wikiId}`, body);
    }
    async countWikiPages(projectIdOrKey) {
        return this.request("/wikis/count", { projectIdOrKey });
    }
    // --- Rate Limit ---
    async getRateLimit() {
        const response = await this.request("/rateLimit");
        return response.rateLimit;
    }
    // --- Documents ---
    async getDocuments(projectId, opts) {
        const params = {
            "projectId[]": String(projectId),
            offset: String(opts?.offset ?? 0),
        };
        if (opts?.keyword)
            params.keyword = opts.keyword;
        if (opts?.sort)
            params.sort = opts.sort;
        if (opts?.order)
            params.order = opts.order;
        if (opts?.count !== undefined)
            params.count = String(opts.count);
        return this.request("/documents", params);
    }
    async getDocument(documentId) {
        return this.request(`/documents/${documentId}`);
    }
    async getDocumentTree(projectIdOrKey) {
        return this.request("/documents/tree", { projectIdOrKey });
    }
    async downloadDocumentAttachment(documentId, attachmentId, retryCount = 0) {
        await this.waitIfThrottled("read");
        const url = new URL(`${this.baseUrl}/documents/${documentId}/attachments/${attachmentId}`);
        url.searchParams.set("apiKey", this.apiKey);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
            const response = await fetch(url.toString(), {
                signal: controller.signal,
            });
            if (response.status === 429) {
                if (retryCount >= MAX_RETRIES) {
                    throw new BacklogClientError("Rate limit exceeded. Max retries reached.", 429);
                }
                const resetHeader = response.headers.get("X-RateLimit-Reset");
                const wait = BacklogApiClient.computeRetryWaitMs(resetHeader);
                console.warn(`Rate limited. Waiting ${Math.ceil(wait / 1000)}s before retry...`);
                await new Promise((resolve) => setTimeout(resolve, wait));
                return this.downloadDocumentAttachment(documentId, attachmentId, retryCount + 1);
            }
            this.updateRateLimit(response, "read");
            if (!response.ok) {
                throw new BacklogClientError(`Failed to download document attachment ${attachmentId}: ${response.status}`, response.status);
            }
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
        catch (error) {
            if (error instanceof BacklogClientError) {
                throw error;
            }
            const message = error instanceof Error ? error.message : String(error);
            throw new BacklogClientError(`Failed to download document attachment ${attachmentId}: ${message}`, 0);
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async addDocument(projectId, opts) {
        const body = { projectId };
        if (opts?.title !== undefined)
            body.title = opts.title;
        if (opts?.content !== undefined)
            body.content = opts.content;
        if (opts?.emoji !== undefined)
            body.emoji = opts.emoji;
        if (opts?.parentId !== undefined)
            body.parentId = opts.parentId;
        if (opts?.addLast !== undefined)
            body.addLast = opts.addLast;
        return this.requestWithBody("POST", "/documents", body);
    }
    async deleteDocument(documentId) {
        return this.requestWithBody("DELETE", `/documents/${documentId}`);
    }
}
exports.BacklogApiClient = BacklogApiClient;

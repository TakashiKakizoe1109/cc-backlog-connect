"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BacklogApiClient = exports.BacklogClientError = void 0;
const TIMEOUT_MS = 30_000;
const PAGE_SIZE = 100;
const RATE_LIMIT_WAIT_MS = 60_000;
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
    constructor(config) {
        this.space = config.space;
        this.baseUrl = `https://${config.space}.backlog.com/api/v2`;
        this.apiKey = config.apiKey;
    }
    handleError(response, errors) {
        const messages = {
            401: "Authentication failed. Check your API key.",
            403: "Access denied. Check your permissions.",
            404: "Resource not found. Check your space/project settings.",
        };
        const message = messages[response.status] ?? `API error: ${response.status} ${response.statusText}`;
        throw new BacklogClientError(message, response.status, errors);
    }
    async request(path, params = {}) {
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
                console.warn(`Rate limited. Waiting ${RATE_LIMIT_WAIT_MS / 1000}s before retry...`);
                await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
                return this.request(path, params);
            }
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
    async requestWithBody(method, path, body) {
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
                console.warn(`Rate limited. Waiting ${RATE_LIMIT_WAIT_MS / 1000}s before retry...`);
                await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
                return this.requestWithBody(method, path, body);
            }
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
            const arrayParams = [
                ["statusId", opts.statusId],
                ["issueTypeId", opts.issueTypeId],
                ["categoryId", opts.categoryId],
                ["milestoneId", opts.milestoneId],
                ["assigneeId", opts.assigneeId],
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
        const arrayParams = [
            ["statusId", opts.statusId],
            ["assigneeId", opts.assigneeId],
            ["issueTypeId", opts.issueTypeId],
            ["categoryId", opts.categoryId],
            ["milestoneId", opts.milestoneId],
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
        const arrayParams = [
            ["statusId", opts.statusId],
            ["assigneeId", opts.assigneeId],
            ["issueTypeId", opts.issueTypeId],
            ["categoryId", opts.categoryId],
            ["milestoneId", opts.milestoneId],
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
}
exports.BacklogApiClient = BacklogApiClient;

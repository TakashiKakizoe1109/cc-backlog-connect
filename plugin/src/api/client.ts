import { BacklogConfig } from "../config/types";
import {
  BacklogProject,
  BacklogIssue,
  BacklogComment,
  BacklogAttachment,
  BacklogApiError,
  BacklogIssueType,
  BacklogPriority,
  BacklogResolution,
  BacklogCategory,
  BacklogVersion,
  BacklogUser,
  BacklogWikiPage,
  AddIssueParams,
  UpdateIssueParams,
} from "./types";

const TIMEOUT_MS = 30_000;
const PAGE_SIZE = 100;
const RATE_LIMIT_WAIT_MS = 60_000;

export class BacklogClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errors?: BacklogApiError[]
  ) {
    super(message);
    this.name = "BacklogClientError";
  }
}

export class BacklogApiClient {
  private baseUrl: string;
  private apiKey: string;
  public space: string;

  constructor(config: BacklogConfig) {
    this.space = config.space;
    this.baseUrl = `https://${config.space}.backlog.com/api/v2`;
    this.apiKey = config.apiKey;
  }

  private handleError(response: Response, errors?: BacklogApiError[]): never {
    const messages: Record<number, string> = {
      401: "Authentication failed. Check your API key.",
      403: "Access denied. Check your permissions.",
      404: "Resource not found. Check your space/project settings.",
    };

    const message = messages[response.status] ?? `API error: ${response.status} ${response.statusText}`;
    throw new BacklogClientError(message, response.status, errors);
  }

  private async request<T>(path: string, params: Record<string, string> = {}): Promise<T> {
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
        return this.request<T>(path, params);
      }

      if (!response.ok) {
        let errors: BacklogApiError[] | undefined;
        try {
          const body = (await response.json()) as { errors?: BacklogApiError[] };
          errors = body.errors;
        } catch {}

        this.handleError(response, errors);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async requestWithBody<T>(
    method: "POST" | "PATCH" | "DELETE",
    path: string,
    body?: Record<string, string | number | boolean | string[] | number[]>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set("apiKey", this.apiKey);

    const formBody = new URLSearchParams();
    if (body) {
      for (const [key, value] of Object.entries(body)) {
        if (value === undefined || value === null) continue;
        if (Array.isArray(value)) {
          for (const v of value) {
            formBody.append(`${key}[]`, String(v));
          }
        } else {
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
        return this.requestWithBody<T>(method, path, body);
      }

      if (!response.ok) {
        let errors: BacklogApiError[] | undefined;
        try {
          const respBody = (await response.json()) as { errors?: BacklogApiError[] };
          errors = respBody.errors;
        } catch {}

        this.handleError(response, errors);
      }

      const text = await response.text();
      if (!text) return {} as T;
      return JSON.parse(text) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  // --- Project ---

  async getProject(projectKey: string): Promise<BacklogProject> {
    return this.request<BacklogProject>(`/projects/${projectKey}`);
  }

  // --- Issues ---

  async getIssues(
    projectId: number,
    opts: {
      statusId?: number[];
      issueTypeId?: number[];
      categoryId?: number[];
      milestoneId?: number[];
      assigneeId?: number[];
      keyword?: string;
    } = {}
  ): Promise<BacklogIssue[]> {
    const allIssues: BacklogIssue[] = [];
    let offset = 0;

    while (true) {
      const params: Record<string, string> = {
        "projectId[]": String(projectId),
        count: String(PAGE_SIZE),
        offset: String(offset),
        sort: "updated",
        order: "desc",
      };

      if (opts.keyword) params.keyword = opts.keyword;
      const arrayParams: [string, number[] | undefined][] = [
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

      const issues = await this.request<BacklogIssue[]>("/issues", params);
      allIssues.push(...issues);

      if (issues.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    return allIssues;
  }

  async searchIssues(
    projectId: number,
    opts: {
      keyword?: string;
      statusId?: number[];
      assigneeId?: number[];
      issueTypeId?: number[];
      categoryId?: number[];
      milestoneId?: number[];
      count?: number;
      offset?: number;
    } = {}
  ): Promise<BacklogIssue[]> {
    const params: Record<string, string> = {
      "projectId[]": String(projectId),
      count: String(opts.count ?? PAGE_SIZE),
      offset: String(opts.offset ?? 0),
      sort: "updated",
      order: "desc",
    };
    if (opts.keyword) params.keyword = opts.keyword;
    const arrayParams: [string, number[] | undefined][] = [
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
    return this.request<BacklogIssue[]>("/issues", params);
  }

  async countIssues(
    projectId: number,
    opts: {
      statusId?: number[];
      assigneeId?: number[];
      issueTypeId?: number[];
      categoryId?: number[];
      milestoneId?: number[];
      keyword?: string;
    } = {}
  ): Promise<{ count: number }> {
    const params: Record<string, string> = {
      "projectId[]": String(projectId),
    };
    if (opts.keyword) params.keyword = opts.keyword;
    const arrayParams: [string, number[] | undefined][] = [
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
    return this.request<{ count: number }>("/issues/count", params);
  }

  async getIssue(issueKey: string): Promise<BacklogIssue> {
    return this.request<BacklogIssue>(`/issues/${issueKey}`);
  }

  async addIssue(params: AddIssueParams): Promise<BacklogIssue> {
    const body: Record<string, string | number | boolean | number[]> = {
      projectId: params.projectId,
      summary: params.summary,
      issueTypeId: params.issueTypeId,
      priorityId: params.priorityId,
    };
    if (params.description !== undefined) body.description = params.description;
    if (params.assigneeId !== undefined) body.assigneeId = params.assigneeId;
    if (params.categoryId) body.categoryId = params.categoryId;
    if (params.versionId) body.versionId = params.versionId;
    if (params.milestoneId) body.milestoneId = params.milestoneId;
    if (params.dueDate) body.dueDate = params.dueDate;
    if (params.estimatedHours !== undefined) body.estimatedHours = params.estimatedHours;
    if (params.actualHours !== undefined) body.actualHours = params.actualHours;
    if (params.parentIssueId !== undefined) body.parentIssueId = params.parentIssueId;
    return this.requestWithBody<BacklogIssue>("POST", "/issues", body);
  }

  async updateIssue(issueKey: string, params: UpdateIssueParams): Promise<BacklogIssue> {
    const body: Record<string, string | number | boolean | number[]> = {};
    if (params.summary !== undefined) body.summary = params.summary;
    if (params.description !== undefined) body.description = params.description;
    if (params.statusId !== undefined) body.statusId = params.statusId;
    if (params.assigneeId !== undefined) body.assigneeId = params.assigneeId;
    if (params.priorityId !== undefined) body.priorityId = params.priorityId;
    if (params.issueTypeId !== undefined) body.issueTypeId = params.issueTypeId;
    if (params.categoryId) body.categoryId = params.categoryId;
    if (params.versionId) body.versionId = params.versionId;
    if (params.milestoneId) body.milestoneId = params.milestoneId;
    if (params.dueDate !== undefined) body.dueDate = params.dueDate;
    if (params.estimatedHours !== undefined) body.estimatedHours = params.estimatedHours;
    if (params.actualHours !== undefined) body.actualHours = params.actualHours;
    if (params.resolutionId !== undefined) body.resolutionId = params.resolutionId;
    if (params.comment !== undefined) body.comment = params.comment;
    return this.requestWithBody<BacklogIssue>("PATCH", `/issues/${issueKey}`, body);
  }

  async deleteIssue(issueKey: string): Promise<BacklogIssue> {
    return this.requestWithBody<BacklogIssue>("DELETE", `/issues/${issueKey}`);
  }

  // --- Comments ---

  async getComments(issueKey: string): Promise<BacklogComment[]> {
    const allComments: BacklogComment[] = [];
    let minId: number | undefined;

    while (true) {
      const params: Record<string, string> = {
        count: String(PAGE_SIZE),
        order: "asc",
      };
      if (minId !== undefined) {
        params.minId = String(minId);
      }

      const comments = await this.request<BacklogComment[]>(
        `/issues/${issueKey}/comments`,
        params
      );
      allComments.push(...comments);

      if (comments.length < PAGE_SIZE) break;
      minId = comments[comments.length - 1].id + 1;
    }

    return allComments;
  }

  async getComment(issueKey: string, commentId: number): Promise<BacklogComment> {
    return this.request<BacklogComment>(`/issues/${issueKey}/comments/${commentId}`);
  }

  async addComment(
    issueKey: string,
    content: string,
    notifiedUserIds?: number[]
  ): Promise<BacklogComment> {
    const body: Record<string, string | number | number[]> = { content };
    if (notifiedUserIds && notifiedUserIds.length > 0) {
      body.notifiedUserId = notifiedUserIds;
    }
    return this.requestWithBody<BacklogComment>("POST", `/issues/${issueKey}/comments`, body);
  }

  async updateComment(
    issueKey: string,
    commentId: number,
    content: string
  ): Promise<BacklogComment> {
    return this.requestWithBody<BacklogComment>(
      "PATCH",
      `/issues/${issueKey}/comments/${commentId}`,
      { content }
    );
  }

  async deleteComment(issueKey: string, commentId: number): Promise<BacklogComment> {
    return this.requestWithBody<BacklogComment>(
      "DELETE",
      `/issues/${issueKey}/comments/${commentId}`
    );
  }

  // --- Attachments ---

  async getAttachments(issueKey: string): Promise<BacklogAttachment[]> {
    return this.request<BacklogAttachment[]>(`/issues/${issueKey}/attachments`);
  }

  async downloadAttachment(issueKey: string, attachmentId: number): Promise<Buffer> {
    const url = new URL(`${this.baseUrl}/issues/${issueKey}/attachments/${attachmentId}`);
    url.searchParams.set("apiKey", this.apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new BacklogClientError(
          `Failed to download attachment ${attachmentId}: ${response.status}`,
          response.status
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timeout);
    }
  }

  // --- Project Metadata ---

  async getStatuses(projectKey: string): Promise<{ id: number; name: string }[]> {
    return this.request<{ id: number; name: string }[]>(
      `/projects/${projectKey}/statuses`
    );
  }

  async getIssueTypes(projectKey: string): Promise<BacklogIssueType[]> {
    return this.request<BacklogIssueType[]>(`/projects/${projectKey}/issueTypes`);
  }

  async getPriorities(): Promise<BacklogPriority[]> {
    return this.request<BacklogPriority[]>("/priorities");
  }

  async getResolutions(): Promise<BacklogResolution[]> {
    return this.request<BacklogResolution[]>("/resolutions");
  }

  async getCategories(projectKey: string): Promise<BacklogCategory[]> {
    return this.request<BacklogCategory[]>(`/projects/${projectKey}/categories`);
  }

  async getVersions(projectKey: string): Promise<BacklogVersion[]> {
    return this.request<BacklogVersion[]>(`/projects/${projectKey}/versions`);
  }

  async getProjectUsers(projectKey: string): Promise<BacklogUser[]> {
    return this.request<BacklogUser[]>(`/projects/${projectKey}/users`);
  }

  // --- Wiki ---

  async getWikiPages(projectIdOrKey: string, keyword?: string): Promise<BacklogWikiPage[]> {
    const params: Record<string, string> = { projectIdOrKey };
    if (keyword) params.keyword = keyword;
    return this.request<BacklogWikiPage[]>("/wikis", params);
  }

  async getWikiPage(wikiId: number): Promise<BacklogWikiPage> {
    return this.request<BacklogWikiPage>(`/wikis/${wikiId}`);
  }

  async addWikiPage(
    projectId: number,
    name: string,
    content: string,
    mailNotify?: boolean
  ): Promise<BacklogWikiPage> {
    const body: Record<string, string | number | boolean> = { projectId, name, content };
    if (mailNotify !== undefined) body.mailNotify = mailNotify;
    return this.requestWithBody<BacklogWikiPage>("POST", "/wikis", body);
  }

  async updateWikiPage(
    wikiId: number,
    opts: { name?: string; content?: string; mailNotify?: boolean }
  ): Promise<BacklogWikiPage> {
    const body: Record<string, string | number | boolean> = {};
    if (opts.name !== undefined) body.name = opts.name;
    if (opts.content !== undefined) body.content = opts.content;
    if (opts.mailNotify !== undefined) body.mailNotify = opts.mailNotify;
    return this.requestWithBody<BacklogWikiPage>("PATCH", `/wikis/${wikiId}`, body);
  }

  async deleteWikiPage(wikiId: number, mailNotify?: boolean): Promise<BacklogWikiPage> {
    const body: Record<string, string | number | boolean> = {};
    if (mailNotify !== undefined) body.mailNotify = mailNotify;
    return this.requestWithBody<BacklogWikiPage>("DELETE", `/wikis/${wikiId}`, body);
  }

  async countWikiPages(projectIdOrKey: string): Promise<{ count: number }> {
    return this.request<{ count: number }>("/wikis/count", { projectIdOrKey });
  }
}

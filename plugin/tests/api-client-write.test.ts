import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BacklogApiClient, BacklogClientError } from "../src/api/client";
import { BacklogIssue, BacklogComment } from "../src/api/types";

const mockConfig = {
  space: "test-space",
  apiKey: "test-api-key",
  projectKey: "PROJ",
};

function makeIssueResponse(overrides: Partial<BacklogIssue> = {}): BacklogIssue {
  return {
    id: 1,
    issueKey: "PROJ-1",
    summary: "テスト課題",
    description: "説明",
    status: { id: 1, name: "処理中" },
    issueType: { id: 1, name: "タスク" },
    priority: { id: 2, name: "中" },
    assignee: null,
    createdUser: { id: 1, name: "user", userId: "user" },
    created: "2026-01-01T00:00:00Z",
    updated: "2026-01-01T00:00:00Z",
    dueDate: null,
    estimatedHours: null,
    actualHours: null,
    ...overrides,
  };
}

function makeCommentResponse(overrides: Partial<BacklogComment> = {}): BacklogComment {
  return {
    id: 100,
    content: "テストコメント",
    createdUser: { id: 1, name: "user", userId: "user" },
    created: "2026-01-01T00:00:00Z",
    updated: null,
    ...overrides,
  };
}

describe("BacklogApiClient - Write Operations", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("addIssue", () => {
    it("POST /issues with correct body", async () => {
      const issueResp = makeIssueResponse({ issueKey: "PROJ-99", summary: "新規課題" });
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(issueResp),
      });

      const client = new BacklogApiClient(mockConfig);
      const result = await client.addIssue({
        projectId: 10,
        summary: "新規課題",
        issueTypeId: 1,
        priorityId: 2,
      });

      expect(result.issueKey).toBe("PROJ-99");
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toContain("/issues");
      expect(opts.method).toBe("POST");
      expect(opts.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
      expect(opts.body).toContain("summary=%E6%96%B0%E8%A6%8F%E8%AA%B2%E9%A1%8C");
      expect(opts.body).toContain("projectId=10");
      expect(opts.body).toContain("issueTypeId=1");
      expect(opts.body).toContain("priorityId=2");
    });

    it("includes optional parameters when provided", async () => {
      const issueResp = makeIssueResponse();
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(issueResp),
      });

      const client = new BacklogApiClient(mockConfig);
      await client.addIssue({
        projectId: 10,
        summary: "課題",
        issueTypeId: 1,
        priorityId: 2,
        description: "説明文",
        assigneeId: 5,
        dueDate: "2026-12-31",
      });

      const [, opts] = fetchSpy.mock.calls[0];
      expect(opts.body).toContain("description=");
      expect(opts.body).toContain("assigneeId=5");
      expect(opts.body).toContain("dueDate=2026-12-31");
    });
  });

  describe("updateIssue", () => {
    it("PATCH /issues/:key with status change", async () => {
      const issueResp = makeIssueResponse({ status: { id: 4, name: "完了" } });
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(issueResp),
      });

      const client = new BacklogApiClient(mockConfig);
      const result = await client.updateIssue("PROJ-1", { statusId: 4 });

      expect(result.status.name).toBe("完了");
      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toContain("/issues/PROJ-1");
      expect(opts.method).toBe("PATCH");
      expect(opts.body).toContain("statusId=4");
    });

    it("sends comment with update", async () => {
      const issueResp = makeIssueResponse();
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(issueResp),
      });

      const client = new BacklogApiClient(mockConfig);
      await client.updateIssue("PROJ-1", { statusId: 4, comment: "対応完了" });

      const [, opts] = fetchSpy.mock.calls[0];
      expect(opts.body).toContain("comment=");
    });
  });

  describe("deleteIssue", () => {
    it("DELETE /issues/:key", async () => {
      const issueResp = makeIssueResponse();
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(issueResp),
      });

      const client = new BacklogApiClient(mockConfig);
      const result = await client.deleteIssue("PROJ-1");

      expect(result.issueKey).toBe("PROJ-1");
      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toContain("/issues/PROJ-1");
      expect(opts.method).toBe("DELETE");
    });
  });

  describe("addComment", () => {
    it("POST /issues/:key/comments", async () => {
      const commentResp = makeCommentResponse();
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(commentResp),
      });

      const client = new BacklogApiClient(mockConfig);
      const result = await client.addComment("PROJ-1", "テストコメント");

      expect(result.id).toBe(100);
      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toContain("/issues/PROJ-1/comments");
      expect(opts.method).toBe("POST");
      expect(opts.body).toContain("content=");
    });

    it("includes notifiedUserId as array", async () => {
      const commentResp = makeCommentResponse();
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(commentResp),
      });

      const client = new BacklogApiClient(mockConfig);
      await client.addComment("PROJ-1", "テスト", [1, 2]);

      const [, opts] = fetchSpy.mock.calls[0];
      expect(opts.body).toContain("notifiedUserId");
    });
  });

  describe("updateComment", () => {
    it("PATCH /issues/:key/comments/:id", async () => {
      const commentResp = makeCommentResponse({ content: "更新済み" });
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(commentResp),
      });

      const client = new BacklogApiClient(mockConfig);
      const result = await client.updateComment("PROJ-1", 100, "更新済み");

      expect(result.content).toBe("更新済み");
      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toContain("/issues/PROJ-1/comments/100");
      expect(opts.method).toBe("PATCH");
    });
  });

  describe("deleteComment", () => {
    it("DELETE /issues/:key/comments/:id", async () => {
      const commentResp = makeCommentResponse();
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(commentResp),
      });

      const client = new BacklogApiClient(mockConfig);
      const result = await client.deleteComment("PROJ-1", 100);

      expect(result.id).toBe(100);
      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toContain("/issues/PROJ-1/comments/100");
      expect(opts.method).toBe("DELETE");
    });
  });

  describe("error handling", () => {
    it("throws BacklogClientError on 404", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ errors: [{ message: "Not found", code: 6, moreInfo: "" }] }),
      });

      const client = new BacklogApiClient(mockConfig);
      await expect(client.addIssue({
        projectId: 10,
        summary: "test",
        issueTypeId: 1,
        priorityId: 2,
      })).rejects.toThrow(BacklogClientError);
    });

    it("retries on 429 rate limit", async () => {
      vi.useFakeTimers();

      const issueResp = makeIssueResponse();
      fetchSpy
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(issueResp),
        });

      const client = new BacklogApiClient(mockConfig);
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const promise = client.addIssue({
        projectId: 10,
        summary: "test",
        issueTypeId: 1,
        priorityId: 2,
      });

      await vi.advanceTimersByTimeAsync(60_000);
      const result = await promise;

      expect(result.issueKey).toBe("PROJ-1");
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Rate limited"));

      warnSpy.mockRestore();
      vi.useRealTimers();
    });
  });
});

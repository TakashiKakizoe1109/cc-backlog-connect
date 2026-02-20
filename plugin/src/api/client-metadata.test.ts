import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BacklogApiClient } from "./client";

const mockConfig = {
  space: "test-space",
  apiKey: "test-api-key",
  projectKey: "PROJ",
};

const emptyHeaders = new Headers();

function mockOkJson(data: unknown) {
  return { ok: true, headers: emptyHeaders, json: async () => data };
}

describe("BacklogApiClient - Metadata Operations", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getIssueTypes", () => {
    it("GET /projects/:key/issueTypes", async () => {
      const types = [
        { id: 1, name: "タスク" },
        { id: 2, name: "バグ" },
      ];
      fetchSpy.mockResolvedValueOnce(mockOkJson(types));

      const client = new BacklogApiClient(mockConfig);
      const result = await client.getIssueTypes("PROJ");

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("タスク");
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("/projects/PROJ/issueTypes");
    });
  });

  describe("getPriorities", () => {
    it("GET /priorities", async () => {
      const priorities = [
        { id: 2, name: "高" },
        { id: 3, name: "中" },
        { id: 4, name: "低" },
      ];
      fetchSpy.mockResolvedValueOnce(mockOkJson(priorities));

      const client = new BacklogApiClient(mockConfig);
      const result = await client.getPriorities();

      expect(result).toHaveLength(3);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("/priorities");
    });
  });

  describe("getResolutions", () => {
    it("GET /resolutions", async () => {
      const resolutions = [
        { id: 0, name: "対応済み" },
        { id: 1, name: "対応しない" },
      ];
      fetchSpy.mockResolvedValueOnce(mockOkJson(resolutions));

      const client = new BacklogApiClient(mockConfig);
      const result = await client.getResolutions();

      expect(result).toHaveLength(2);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("/resolutions");
    });
  });

  describe("getCategories", () => {
    it("GET /projects/:key/categories", async () => {
      const categories = [{ id: 1, name: "バックエンド", displayOrder: 0 }];
      fetchSpy.mockResolvedValueOnce(mockOkJson(categories));

      const client = new BacklogApiClient(mockConfig);
      const result = await client.getCategories("PROJ");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("バックエンド");
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("/projects/PROJ/categories");
    });
  });

  describe("getVersions", () => {
    it("GET /projects/:key/versions", async () => {
      const versions = [{
        id: 1,
        projectId: 10,
        name: "v1.0",
        description: "初回リリース",
        startDate: null,
        releaseDueDate: "2026-03-01",
        archived: false,
        displayOrder: 0,
      }];
      fetchSpy.mockResolvedValueOnce(mockOkJson(versions));

      const client = new BacklogApiClient(mockConfig);
      const result = await client.getVersions("PROJ");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("v1.0");
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("/projects/PROJ/versions");
    });
  });

  describe("getProjectUsers", () => {
    it("GET /projects/:key/users", async () => {
      const users = [
        { id: 1, name: "田中太郎", userId: "tanaka" },
        { id: 2, name: "山田花子", userId: "yamada" },
      ];
      fetchSpy.mockResolvedValueOnce(mockOkJson(users));

      const client = new BacklogApiClient(mockConfig);
      const result = await client.getProjectUsers("PROJ");

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("田中太郎");
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("/projects/PROJ/users");
    });
  });

  describe("searchIssues", () => {
    it("includes keyword and statusId params", async () => {
      fetchSpy.mockResolvedValueOnce(mockOkJson([]));

      const client = new BacklogApiClient(mockConfig);
      await client.searchIssues(10, { keyword: "バグ", statusId: [1, 2] });

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("keyword=");
      expect(url).toContain("statusId");
    });

    it("issueTypeId フィルタを送信する", async () => {
      fetchSpy.mockResolvedValueOnce(mockOkJson([]));

      const client = new BacklogApiClient(mockConfig);
      await client.searchIssues(10, { issueTypeId: [1, 2] });

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("issueTypeId");
    });

    it("categoryId フィルタを送信する", async () => {
      fetchSpy.mockResolvedValueOnce(mockOkJson([]));

      const client = new BacklogApiClient(mockConfig);
      await client.searchIssues(10, { categoryId: [3] });

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("categoryId");
    });

    it("milestoneId フィルタを送信する", async () => {
      fetchSpy.mockResolvedValueOnce(mockOkJson([]));

      const client = new BacklogApiClient(mockConfig);
      await client.searchIssues(10, { milestoneId: [5] });

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("milestoneId");
    });

    it("assigneeId フィルタを送信する", async () => {
      fetchSpy.mockResolvedValueOnce(mockOkJson([]));

      const client = new BacklogApiClient(mockConfig);
      await client.searchIssues(10, { assigneeId: [10] });

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("assigneeId");
    });

    it("複数フィルタを組み合わせて送信する", async () => {
      fetchSpy.mockResolvedValueOnce(mockOkJson([]));

      const client = new BacklogApiClient(mockConfig);
      await client.searchIssues(10, {
        keyword: "test",
        statusId: [1],
        issueTypeId: [2],
        categoryId: [3],
        milestoneId: [4],
        assigneeId: [5],
      });

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("keyword=test");
      expect(url).toContain("statusId");
      expect(url).toContain("issueTypeId");
      expect(url).toContain("categoryId");
      expect(url).toContain("milestoneId");
      expect(url).toContain("assigneeId");
    });
  });

  describe("countIssues", () => {
    it("GET /issues/count", async () => {
      fetchSpy.mockResolvedValueOnce(mockOkJson({ count: 15 }));

      const client = new BacklogApiClient(mockConfig);
      const result = await client.countIssues(10);

      expect(result.count).toBe(15);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("/issues/count");
    });

    it("フィルタ付きで件数を取得する", async () => {
      fetchSpy.mockResolvedValueOnce(mockOkJson({ count: 5 }));

      const client = new BacklogApiClient(mockConfig);
      const result = await client.countIssues(10, {
        issueTypeId: [1],
        categoryId: [2],
        milestoneId: [3],
        keyword: "バグ",
      });

      expect(result.count).toBe(5);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("issueTypeId");
      expect(url).toContain("categoryId");
      expect(url).toContain("milestoneId");
      expect(url).toContain("keyword=");
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BacklogApiClient } from "./client";
import { BacklogWikiPage } from "./types";

const mockConfig = {
  space: "test-space",
  apiKey: "test-api-key",
  projectKey: "PROJ",
};

function makeWikiResponse(overrides: Partial<BacklogWikiPage> = {}): BacklogWikiPage {
  return {
    id: 1,
    projectId: 10,
    name: "テストページ",
    content: "# テスト\n\n内容",
    tags: [],
    attachments: [],
    createdUser: { id: 1, name: "user", userId: "user" },
    created: "2026-01-01T00:00:00Z",
    updatedUser: { id: 1, name: "user", userId: "user" },
    updated: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("BacklogApiClient - Wiki Operations", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getWikiPages", () => {
    it("GET /wikis with projectIdOrKey", async () => {
      const pages = [makeWikiResponse(), makeWikiResponse({ id: 2, name: "ページ2" })];
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => pages,
      });

      const client = new BacklogApiClient(mockConfig);
      const result = await client.getWikiPages("PROJ");

      expect(result).toHaveLength(2);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("/wikis");
      expect(url).toContain("projectIdOrKey=PROJ");
    });

    it("includes keyword param when provided", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const client = new BacklogApiClient(mockConfig);
      await client.getWikiPages("PROJ", "設計");

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("keyword=");
    });
  });

  describe("getWikiPage", () => {
    it("GET /wikis/:wikiId", async () => {
      const page = makeWikiResponse({ content: "詳細な内容" });
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => page,
      });

      const client = new BacklogApiClient(mockConfig);
      const result = await client.getWikiPage(1);

      expect(result.content).toBe("詳細な内容");
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("/wikis/1");
    });
  });

  describe("addWikiPage", () => {
    it("POST /wikis with required params", async () => {
      const page = makeWikiResponse({ name: "新規ページ" });
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(page),
      });

      const client = new BacklogApiClient(mockConfig);
      const result = await client.addWikiPage(10, "新規ページ", "内容です");

      expect(result.name).toBe("新規ページ");
      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toContain("/wikis");
      expect(opts.method).toBe("POST");
      expect(opts.body).toContain("projectId=10");
      expect(opts.body).toContain("name=");
      expect(opts.body).toContain("content=");
    });

    it("includes mailNotify when provided", async () => {
      const page = makeWikiResponse();
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(page),
      });

      const client = new BacklogApiClient(mockConfig);
      await client.addWikiPage(10, "ページ", "内容", true);

      const [, opts] = fetchSpy.mock.calls[0];
      expect(opts.body).toContain("mailNotify=true");
    });
  });

  describe("updateWikiPage", () => {
    it("PATCH /wikis/:wikiId", async () => {
      const page = makeWikiResponse({ content: "更新内容" });
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(page),
      });

      const client = new BacklogApiClient(mockConfig);
      const result = await client.updateWikiPage(1, { content: "更新内容" });

      expect(result.content).toBe("更新内容");
      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toContain("/wikis/1");
      expect(opts.method).toBe("PATCH");
      expect(opts.body).toContain("content=");
    });

    it("updates name and content together", async () => {
      const page = makeWikiResponse({ name: "新名前", content: "新内容" });
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(page),
      });

      const client = new BacklogApiClient(mockConfig);
      await client.updateWikiPage(1, { name: "新名前", content: "新内容" });

      const [, opts] = fetchSpy.mock.calls[0];
      expect(opts.body).toContain("name=");
      expect(opts.body).toContain("content=");
    });
  });

  describe("deleteWikiPage", () => {
    it("DELETE /wikis/:wikiId", async () => {
      const page = makeWikiResponse();
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(page),
      });

      const client = new BacklogApiClient(mockConfig);
      const result = await client.deleteWikiPage(1);

      expect(result.id).toBe(1);
      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toContain("/wikis/1");
      expect(opts.method).toBe("DELETE");
    });
  });

  describe("countWikiPages", () => {
    it("GET /wikis/count", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 42 }),
      });

      const client = new BacklogApiClient(mockConfig);
      const result = await client.countWikiPages("PROJ");

      expect(result.count).toBe(42);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("/wikis/count");
      expect(url).toContain("projectIdOrKey=PROJ");
    });
  });
});

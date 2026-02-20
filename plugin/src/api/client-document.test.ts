import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BacklogApiClient, BacklogClientError } from "./client";
import { BacklogDocument, BacklogDocumentTree } from "./types";

const mockConfig = {
  space: "test-space",
  apiKey: "test-api-key",
  projectKey: "PROJ",
};

const emptyHeaders = new Headers();

function mockOkJson(data: unknown) {
  return { ok: true, headers: emptyHeaders, json: async () => data };
}

function mockOkText(data: unknown) {
  return { ok: true, status: 200, headers: emptyHeaders, text: async () => JSON.stringify(data) };
}

function mockOkBinary(buffer: Buffer) {
  return { ok: true, status: 200, headers: emptyHeaders, arrayBuffer: async () => buffer };
}

function makeDocumentResponse(overrides: Partial<BacklogDocument> = {}): BacklogDocument {
  return {
    id: "abc123",
    projectId: 10,
    title: "テストドキュメント",
    plain: "# テスト\n内容",
    statusId: 1,
    attachments: [],
    tags: [],
    createdUser: { id: 1, name: "user", userId: "user" },
    created: "2026-01-01T00:00:00Z",
    updatedUser: { id: 1, name: "user", userId: "user" },
    updated: "2026-01-02T00:00:00Z",
    ...overrides,
  };
}

function makeTreeResponse(): BacklogDocumentTree {
  return {
    projectId: 10,
    activeTree: {
      id: "root",
      name: "root",
      children: [{ id: "abc123", name: "テストドキュメント", children: [] }],
    },
    trashTree: { id: "trash", name: "trash", children: [] },
  };
}

describe("BacklogApiClient - Document Operations", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getRateLimit", () => {
    it("GET /rateLimit", async () => {
      const data = {
        rateLimit: {
          read: { limit: 600, remaining: 595, reset: 1700000000 },
          update: { limit: 150, remaining: 148, reset: 1700000000 },
          search: { limit: 150, remaining: 143, reset: 1700000000 },
          icon: { limit: 60, remaining: 58, reset: 1700000000 },
        },
      };
      fetchSpy.mockResolvedValueOnce(mockOkJson(data));

      const client = new BacklogApiClient(mockConfig);
      const result = await client.getRateLimit();

      expect(result.read.remaining).toBe(595);
      expect(result.update.limit).toBe(150);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("/rateLimit");
    });
  });

  describe("getDocuments", () => {
    it("GET /documents with projectId", async () => {
      const docs = [makeDocumentResponse()];
      fetchSpy.mockResolvedValueOnce(mockOkJson(docs));

      const client = new BacklogApiClient(mockConfig);
      const result = await client.getDocuments(10);

      expect(result).toHaveLength(1);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("/documents");
      expect(url).toContain("projectId%5B%5D=10");
      expect(url).toContain("offset=0");
    });

    it("keyword オプションを送信する", async () => {
      fetchSpy.mockResolvedValueOnce(mockOkJson([]));

      const client = new BacklogApiClient(mockConfig);
      await client.getDocuments(10, { keyword: "API設計" });

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("keyword=");
    });

    it("count/offset オプションを送信する", async () => {
      fetchSpy.mockResolvedValueOnce(mockOkJson([]));

      const client = new BacklogApiClient(mockConfig);
      await client.getDocuments(10, { count: 20, offset: 40 });

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("count=20");
      expect(url).toContain("offset=40");
    });
  });

  describe("getDocument", () => {
    it("GET /documents/:documentId", async () => {
      const doc = makeDocumentResponse({ title: "詳細ドキュメント" });
      fetchSpy.mockResolvedValueOnce(mockOkJson(doc));

      const client = new BacklogApiClient(mockConfig);
      const result = await client.getDocument("abc123");

      expect(result.title).toBe("詳細ドキュメント");
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("/documents/abc123");
    });
  });

  describe("getDocumentTree", () => {
    it("GET /documents/tree with projectIdOrKey", async () => {
      const tree = makeTreeResponse();
      fetchSpy.mockResolvedValueOnce(mockOkJson(tree));

      const client = new BacklogApiClient(mockConfig);
      const result = await client.getDocumentTree("PROJ");

      expect(result.activeTree.children).toHaveLength(1);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("/documents/tree");
      expect(url).toContain("projectIdOrKey=PROJ");
    });
  });

  describe("downloadDocumentAttachment", () => {
    it("GET /documents/:documentId/attachments/:attachmentId", async () => {
      const file = Buffer.from("binary");
      fetchSpy.mockResolvedValueOnce(mockOkBinary(file));

      const client = new BacklogApiClient(mockConfig);
      const result = await client.downloadDocumentAttachment("abc123", 1);

      expect(Buffer.from(result).toString("utf8")).toBe("binary");
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("/documents/abc123/attachments/1");
    });

    it("429 の場合はリトライして成功する", async () => {
      vi.useFakeTimers();
      const rateLimitHeaders = new Headers();
      rateLimitHeaders.set("X-RateLimit-Reset", String(Math.floor(Date.now() / 1000) + 30));

      const file = Buffer.from("binary");
      fetchSpy
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: rateLimitHeaders,
          json: async () => ({}),
        })
        .mockResolvedValueOnce(mockOkBinary(file));

      const client = new BacklogApiClient(mockConfig);
      const promise = client.downloadDocumentAttachment("abc123", 1);

      await vi.advanceTimersByTimeAsync(30_000);
      const result = await promise;
      expect(Buffer.from(result).toString("utf8")).toBe("binary");
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it("fetch 失敗を BacklogClientError に正規化する", async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError("network down"));

      const client = new BacklogApiClient(mockConfig);
      const promise = client.downloadDocumentAttachment("abc123", 1);
      await expect(promise).rejects.toBeInstanceOf(BacklogClientError);
      await expect(promise).rejects.toThrow("Failed to download document attachment");
    });
  });

  describe("addDocument", () => {
    it("POST /documents with projectId", async () => {
      const doc = {
        id: "abc123",
        projectId: 10,
        title: "新規ドキュメント",
        plain: "# テスト\n内容",
        statusId: 1,
        emoji: "memo",
        attachments: [],
        tags: [],
        createdUserId: 1,
        created: "2026-01-01T00:00:00Z",
        updatedUserId: 1,
        updated: "2026-01-02T00:00:00Z",
      };
      fetchSpy.mockResolvedValueOnce(mockOkText(doc));

      const client = new BacklogApiClient(mockConfig);
      const result = await client.addDocument(10, { title: "新規ドキュメント", content: "内容" });

      expect(result.title).toBe("新規ドキュメント");
      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toContain("/documents");
      expect(opts.method).toBe("POST");
      expect(opts.body).toContain("projectId=10");
      expect(opts.body).toContain("title=");
      expect(opts.body).toContain("content=");
    });

    it("parentId と emoji を送信する", async () => {
      const doc = makeDocumentResponse();
      fetchSpy.mockResolvedValueOnce(mockOkText(doc));

      const client = new BacklogApiClient(mockConfig);
      await client.addDocument(10, { parentId: "parent123", emoji: "doc" });

      const [, opts] = fetchSpy.mock.calls[0];
      expect(opts.body).toContain("parentId=parent123");
      expect(opts.body).toContain("emoji=");
    });
  });

  describe("deleteDocument", () => {
    it("DELETE /documents/:documentId", async () => {
      const doc = {
        id: "abc123",
        projectId: 10,
        title: "テストドキュメント",
        plain: null,
        statusId: 2,
        emoji: "memo",
        attachments: [],
        tags: [],
        createdUserId: 1,
        created: "2026-01-01T00:00:00Z",
        updatedUserId: 1,
        updated: "2026-01-02T00:00:00Z",
      };
      fetchSpy.mockResolvedValueOnce(mockOkText(doc));

      const client = new BacklogApiClient(mockConfig);
      const result = await client.deleteDocument("abc123");

      expect(result.id).toBe("abc123");
      expect(result.plain).toBeNull();
      expect(result.updatedUserId).toBe(1);
      const [url, opts] = fetchSpy.mock.calls[0];
      expect(url).toContain("/documents/abc123");
      expect(opts.method).toBe("DELETE");
    });
  });
});

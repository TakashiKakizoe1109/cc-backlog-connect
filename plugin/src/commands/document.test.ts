import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { documentCommand } from "./document";
import * as loader from "../config/loader";
import * as clientModule from "../api/client";
import { writeFile } from "fs/promises";

vi.mock("../config/loader");
vi.mock("../api/client");
vi.mock("fs/promises", () => ({
  writeFile: vi.fn(),
}));

const writeConfig = { space: "s", apiKey: "k", projectKey: "P", mode: "write" as const };
const readConfig = { space: "s", apiKey: "k", projectKey: "P", mode: "read" as const };

const sampleDoc = {
  id: "abc123",
  projectId: 10,
  title: "テストドキュメント",
  plain: "# テスト\n内容",
  statusId: 1,
  attachments: [],
  tags: [],
  createdUser: { id: 1, name: "User", userId: "user" },
  created: "2025-01-01T00:00:00Z",
  updatedUser: { id: 1, name: "User", userId: "user" },
  updated: "2025-01-02T00:00:00Z",
};

const sampleTree = {
  projectId: 10,
  activeTree: { id: "root", name: "root", children: [{ id: "abc123", name: "テスト", children: [] }] },
  trashTree: { id: "trash", name: "trash", children: [] },
};

const mockClient = {
  space: "s",
  getProject: vi.fn(),
  getDocuments: vi.fn(),
  getDocument: vi.fn(),
  getDocumentTree: vi.fn(),
  downloadDocumentAttachment: vi.fn(),
  addDocument: vi.fn(),
  deleteDocument: vi.fn(),
};

let mockExit: ReturnType<typeof vi.spyOn>;
let mockLog: ReturnType<typeof vi.spyOn>;
let mockError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.mocked(clientModule.BacklogApiClient).mockImplementation(() => mockClient as any);
  mockClient.getProject.mockResolvedValue({ id: 10, projectKey: "P", name: "Test" });
  Object.values(mockClient).forEach((m) => typeof m === "function" && "mockClear" in m && m.mockClear());
  mockClient.getProject.mockResolvedValue({ id: 10, projectKey: "P", name: "Test" });

  mockExit = vi.spyOn(process, "exit").mockImplementation((() => { throw new Error("exit"); }) as never);
  mockLog = vi.spyOn(console, "log").mockImplementation(() => {});
  mockError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  mockExit.mockRestore();
  mockLog.mockRestore();
  mockError.mockRestore();
});

describe("documentCommand", () => {
  it("サブコマンドなしでエラー終了する", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    await expect(documentCommand([])).rejects.toThrow("exit");
  });

  it("設定未定義でエラー終了する", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(null);
    await expect(documentCommand(["list"])).rejects.toThrow("exit");
  });

  describe("list", () => {
    it("ドキュメント一覧をJSON出力する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.getDocuments.mockResolvedValue([sampleDoc]);

      await documentCommand(["list"]);

      expect(mockClient.getProject).toHaveBeenCalledWith("P");
      expect(mockClient.getDocuments).toHaveBeenCalledWith(10, expect.objectContaining({}));
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("abc123"));
    });

    it("キーワード付きで検索できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.getDocuments.mockResolvedValue([]);

      await documentCommand(["list", "--keyword", "テスト"]);

      expect(mockClient.getDocuments).toHaveBeenCalledWith(10, expect.objectContaining({ keyword: "テスト" }));
    });

    it("--project で別プロジェクトを指定できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.getDocuments.mockResolvedValue([]);

      await documentCommand(["list", "--project", "OTHER"]);

      expect(mockClient.getProject).toHaveBeenCalledWith("OTHER");
    });

    it("--count と --offset を渡せる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.getDocuments.mockResolvedValue([]);

      await documentCommand(["list", "--count", "20", "--offset", "40"]);

      expect(mockClient.getDocuments).toHaveBeenCalledWith(10, expect.objectContaining({ count: 20, offset: 40 }));
    });

    it("不正な --count でエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);

      await expect(documentCommand(["list", "--count", "abc"])).rejects.toThrow("exit");

      expect(mockError).toHaveBeenCalledWith(expect.stringContaining("--count"));
      expect(mockClient.getDocuments).not.toHaveBeenCalled();
    });

    it("不正な --offset でエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);

      await expect(documentCommand(["list", "--offset", "abc"])).rejects.toThrow("exit");

      expect(mockError).toHaveBeenCalledWith(expect.stringContaining("--offset"));
      expect(mockClient.getDocuments).not.toHaveBeenCalled();
    });

    it("値なしの --count でエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);

      await expect(documentCommand(["list", "--count"])).rejects.toThrow("exit");

      expect(mockError).toHaveBeenCalledWith(expect.stringContaining("--count"));
      expect(mockClient.getDocuments).not.toHaveBeenCalled();
    });

    it("値なしの --offset でエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);

      await expect(documentCommand(["list", "--offset"])).rejects.toThrow("exit");

      expect(mockError).toHaveBeenCalledWith(expect.stringContaining("--offset"));
      expect(mockClient.getDocuments).not.toHaveBeenCalled();
    });
  });

  describe("get", () => {
    it("ドキュメントを取得する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.getDocument.mockResolvedValue(sampleDoc);

      await documentCommand(["get", "abc123"]);

      expect(mockClient.getDocument).toHaveBeenCalledWith("abc123");
    });

    it("documentId なしでエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(documentCommand(["get"])).rejects.toThrow("exit");
    });
  });

  describe("tree", () => {
    it("ツリー構造を表示する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.getDocumentTree.mockResolvedValue(sampleTree);

      await documentCommand(["tree"]);

      expect(mockClient.getDocumentTree).toHaveBeenCalledWith("P");
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Active Documents"));
    });

    it("--project で別プロジェクトを指定できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.getDocumentTree.mockResolvedValue(sampleTree);

      await documentCommand(["tree", "--project", "OTHER"]);

      expect(mockClient.getDocumentTree).toHaveBeenCalledWith("OTHER");
    });
  });

  describe("attachments", () => {
    it("添付ファイルをダウンロードできる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.downloadDocumentAttachment.mockResolvedValue(Buffer.from("file"));

      await documentCommand(["attachments", "abc123", "1", "--output", "/tmp/file.bin"]);

      expect(mockClient.downloadDocumentAttachment).toHaveBeenCalledWith("abc123", 1);
      expect(writeFile).toHaveBeenCalledWith("/tmp/file.bin", expect.any(Buffer));
    });

    it("documentId なしでエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(documentCommand(["attachments"])).rejects.toThrow("exit");
    });

    it("attachmentId なしでエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(documentCommand(["attachments", "abc123"])).rejects.toThrow("exit");
    });

    it("不正な attachmentId でエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(documentCommand(["attachments", "abc123", "abc", "--output", "/tmp/file.bin"])).rejects.toThrow("exit");
    });

    it("--output なしでエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(documentCommand(["attachments", "abc123", "1"])).rejects.toThrow("exit");
    });

    it("値なしの --output でエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(documentCommand(["attachments", "abc123", "1", "--output"])).rejects.toThrow("exit");
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining("--output"));
    });
  });

  describe("add", () => {
    it("write モードでドキュメントを作成できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      mockClient.addDocument.mockResolvedValue(sampleDoc);

      await documentCommand(["add", "--title", "新規", "--content", "内容"]);

      expect(mockClient.addDocument).toHaveBeenCalledWith(10, expect.objectContaining({
        title: "新規",
        content: "内容",
      }));
    });

    it("read モードでブロックされる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(documentCommand(["add", "--title", "x"])).rejects.toThrow("exit");
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining("write mode"));
    });

    it("--title なしでエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      await expect(documentCommand(["add", "--content", "内容"])).rejects.toThrow("exit");
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining("title"));
    });

    it("値なしの --title でエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      await expect(documentCommand(["add", "--title", "--content", "内容"])).rejects.toThrow("exit");
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining("title"));
      expect(mockClient.addDocument).not.toHaveBeenCalled();
    });

    it("--content も --content-stdin もなしでエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      await expect(documentCommand(["add", "--title", "タイトル"])).rejects.toThrow("exit");
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining("content"));
    });

    it("--content-stdin 指定時に TTY ならエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      const originalIsTTY = process.stdin.isTTY;
      const originalAsyncIterator = (process.stdin as any)[Symbol.asyncIterator];
      Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
      Object.defineProperty(process.stdin, Symbol.asyncIterator, {
        value: async function* () {},
        configurable: true,
      });

      try {
        await expect(documentCommand(["add", "--title", "タイトル", "--content-stdin"])).rejects.toThrow("exit");
      } finally {
        Object.defineProperty(process.stdin, "isTTY", { value: originalIsTTY, configurable: true });
        if (originalAsyncIterator) {
          Object.defineProperty(process.stdin, Symbol.asyncIterator, {
            value: originalAsyncIterator,
            configurable: true,
          });
        } else {
          delete (process.stdin as any)[Symbol.asyncIterator];
        }
      }

      expect(mockError).toHaveBeenCalledWith(expect.stringContaining("TTY"));
      expect(mockClient.addDocument).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("write モードでドキュメントを削除できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      mockClient.deleteDocument.mockResolvedValue(sampleDoc);

      await documentCommand(["delete", "abc123"]);

      expect(mockClient.deleteDocument).toHaveBeenCalledWith("abc123");
    });

    it("read モードでブロックされる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(documentCommand(["delete", "abc123"])).rejects.toThrow("exit");
    });

    it("documentId なしでエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      await expect(documentCommand(["delete"])).rejects.toThrow("exit");
    });
  });

  it("不明なサブコマンドでエラー終了する", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    await expect(documentCommand(["unknown"])).rejects.toThrow("exit");
  });

  it("BacklogClientError をハンドリングする", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
    const err = Object.assign(new Error("API error"), { name: "BacklogClientError", statusCode: 500 });
    Object.setPrototypeOf(err, clientModule.BacklogClientError.prototype);
    mockClient.getDocuments.mockRejectedValue(err);

    await expect(documentCommand(["list"])).rejects.toThrow("exit");
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining("API error"));
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { commentCommand } from "./comment";
import * as loader from "../config/loader";
import * as clientModule from "../api/client";

vi.mock("../config/loader");
vi.mock("../api/client");

const writeConfig = { space: "s", apiKey: "k", projectKey: "P", mode: "write" as const };
const readConfig = { space: "s", apiKey: "k", projectKey: "P", mode: "read" as const };

const mockClient = {
  space: "s",
  getComments: vi.fn(),
  getComment: vi.fn(),
  addComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
};

let mockExit: ReturnType<typeof vi.spyOn>;
let mockLog: ReturnType<typeof vi.spyOn>;
let mockError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.mocked(clientModule.BacklogApiClient).mockImplementation(() => mockClient as any);
  Object.values(mockClient).forEach((m) => typeof m === "function" && "mockClear" in m && m.mockClear());

  mockExit = vi.spyOn(process, "exit").mockImplementation((() => { throw new Error("exit"); }) as never);
  mockLog = vi.spyOn(console, "log").mockImplementation(() => {});
  mockError = vi.spyOn(console, "error").mockImplementation(() => {});

  return () => {
    mockExit.mockRestore();
    mockLog.mockRestore();
    mockError.mockRestore();
  };
});

describe("commentCommand", () => {
  it("サブコマンドなしでエラー終了する", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    await expect(commentCommand([])).rejects.toThrow("exit");
  });

  it("設定未定義でエラー終了する", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(null);
    await expect(commentCommand(["list", "PROJ-1"])).rejects.toThrow("exit");
  });

  describe("list", () => {
    it("コメント一覧をJSON出力する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.getComments.mockResolvedValue([{ id: 1, content: "test" }]);

      await commentCommand(["list", "PROJ-1"]);

      expect(mockClient.getComments).toHaveBeenCalledWith("PROJ-1");
      expect(mockLog).toHaveBeenCalled();
    });

    it("課題キーなしでエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(commentCommand(["list"])).rejects.toThrow("exit");
    });
  });

  describe("add", () => {
    it("write モードでコメントを追加できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      mockClient.addComment.mockResolvedValue({ id: 100 });

      await commentCommand(["add", "PROJ-1", "--content", "テスト"]);

      expect(mockClient.addComment).toHaveBeenCalledWith("PROJ-1", "テスト");
    });

    it("read モードでブロックされる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(commentCommand(["add", "PROJ-1", "--content", "x"])).rejects.toThrow("exit");
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining("write mode"));
    });

    it("content なしでエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      await expect(commentCommand(["add", "PROJ-1"])).rejects.toThrow("exit");
    });
  });

  describe("get", () => {
    it("コメントをJSON出力する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.getComment.mockResolvedValue({ id: 100, content: "test" });

      await commentCommand(["get", "PROJ-1", "--comment-id", "100"]);

      expect(mockClient.getComment).toHaveBeenCalledWith("PROJ-1", 100);
    });

    it("comment-id なしでエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(commentCommand(["get", "PROJ-1"])).rejects.toThrow("exit");
    });
  });

  describe("update", () => {
    it("write モードでコメントを更新できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      mockClient.updateComment.mockResolvedValue({ id: 100, content: "更新" });

      await commentCommand(["update", "PROJ-1", "--comment-id", "100", "--content", "更新"]);

      expect(mockClient.updateComment).toHaveBeenCalledWith("PROJ-1", 100, "更新");
    });

    it("read モードでブロックされる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(
        commentCommand(["update", "PROJ-1", "--comment-id", "100", "--content", "x"])
      ).rejects.toThrow("exit");
    });
  });

  describe("delete", () => {
    it("write モードでコメントを削除できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      mockClient.deleteComment.mockResolvedValue({ id: 100 });

      await commentCommand(["delete", "PROJ-1", "--comment-id", "100"]);

      expect(mockClient.deleteComment).toHaveBeenCalledWith("PROJ-1", 100);
    });

    it("read モードでブロックされる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(commentCommand(["delete", "PROJ-1", "--comment-id", "100"])).rejects.toThrow("exit");
    });
  });

  it("不明なサブコマンドでエラー終了する", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    await expect(commentCommand(["unknown"])).rejects.toThrow("exit");
  });
});

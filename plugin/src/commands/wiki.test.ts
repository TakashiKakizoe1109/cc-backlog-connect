import { describe, it, expect, vi, beforeEach } from "vitest";
import { wikiCommand } from "./wiki";
import * as loader from "../config/loader";
import * as clientModule from "../api/client";

vi.mock("../config/loader");
vi.mock("../api/client");

const writeConfig = { space: "s", apiKey: "k", projectKey: "P", mode: "write" as const };
const readConfig = { space: "s", apiKey: "k", projectKey: "P", mode: "read" as const };

const mockClient = {
  space: "s",
  getWikiPages: vi.fn(),
  getWikiPage: vi.fn(),
  addWikiPage: vi.fn(),
  updateWikiPage: vi.fn(),
  deleteWikiPage: vi.fn(),
  countWikiPages: vi.fn(),
  getProject: vi.fn(),
};

let mockExit: ReturnType<typeof vi.spyOn>;
let mockLog: ReturnType<typeof vi.spyOn>;
let mockError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.mocked(clientModule.BacklogApiClient).mockImplementation(() => mockClient as any);
  mockClient.getProject.mockResolvedValue({ id: 10 });
  Object.values(mockClient).forEach((m) => typeof m === "function" && "mockClear" in m && m.mockClear());
  mockClient.getProject.mockResolvedValue({ id: 10 });

  mockExit = vi.spyOn(process, "exit").mockImplementation((() => { throw new Error("exit"); }) as never);
  mockLog = vi.spyOn(console, "log").mockImplementation(() => {});
  mockError = vi.spyOn(console, "error").mockImplementation(() => {});

  return () => {
    mockExit.mockRestore();
    mockLog.mockRestore();
    mockError.mockRestore();
  };
});

describe("wikiCommand", () => {
  it("サブコマンドなしでエラー終了する", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    await expect(wikiCommand([])).rejects.toThrow("exit");
  });

  it("設定未定義でエラー終了する", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(null);
    await expect(wikiCommand(["list"])).rejects.toThrow("exit");
  });

  describe("list", () => {
    it("Wiki一覧をJSON出力する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.getWikiPages.mockResolvedValue([{ id: 1, name: "p" }]);

      await wikiCommand(["list"]);

      expect(mockClient.getWikiPages).toHaveBeenCalledWith("P", undefined);
    });

    it("キーワード付きで検索できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.getWikiPages.mockResolvedValue([]);

      await wikiCommand(["list", "--keyword", "設計"]);

      expect(mockClient.getWikiPages).toHaveBeenCalledWith("P", "設計");
    });
  });

  describe("get", () => {
    it("Wikiページを取得する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.getWikiPage.mockResolvedValue({ id: 1, name: "p" });

      await wikiCommand(["get", "1"]);

      expect(mockClient.getWikiPage).toHaveBeenCalledWith(1);
    });

    it("wikiId なしでエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(wikiCommand(["get"])).rejects.toThrow("exit");
    });
  });

  describe("create", () => {
    it("write モードでWikiページを作成できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      mockClient.addWikiPage.mockResolvedValue({ id: 1, name: "新規" });

      await wikiCommand(["create", "--name", "新規", "--content", "内容"]);

      expect(mockClient.addWikiPage).toHaveBeenCalledWith(10, "新規", "内容", undefined);
    });

    it("read モードでブロックされる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(wikiCommand(["create", "--name", "x", "--content", "y"])).rejects.toThrow("exit");
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining("write mode"));
    });

    it("name なしでエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      await expect(wikiCommand(["create"])).rejects.toThrow("exit");
    });
  });

  describe("update", () => {
    it("write モードでWikiページを更新できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      mockClient.updateWikiPage.mockResolvedValue({ id: 1, name: "更新" });

      await wikiCommand(["update", "1", "--content", "新内容"]);

      expect(mockClient.updateWikiPage).toHaveBeenCalledWith(1, expect.objectContaining({ content: "新内容" }));
    });

    it("read モードでブロックされる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(wikiCommand(["update", "1", "--content", "x"])).rejects.toThrow("exit");
    });

    it("wikiId なしでエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      await expect(wikiCommand(["update"])).rejects.toThrow("exit");
    });
  });

  describe("delete", () => {
    it("write モードでWikiページを削除できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      mockClient.deleteWikiPage.mockResolvedValue({ id: 1, name: "削除" });

      await wikiCommand(["delete", "1"]);

      expect(mockClient.deleteWikiPage).toHaveBeenCalledWith(1, undefined);
    });

    it("read モードでブロックされる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(wikiCommand(["delete", "1"])).rejects.toThrow("exit");
    });
  });

  describe("count", () => {
    it("Wiki件数を取得する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.countWikiPages.mockResolvedValue({ count: 10 });

      await wikiCommand(["count"]);

      expect(mockClient.countWikiPages).toHaveBeenCalledWith("P");
    });
  });

  it("不明なサブコマンドでエラー終了する", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    await expect(wikiCommand(["unknown"])).rejects.toThrow("exit");
  });
});

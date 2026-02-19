import { describe, it, expect, vi, beforeEach } from "vitest";
import { issueCommand } from "./issue";
import * as loader from "../config/loader";
import * as clientModule from "../api/client";
import * as cacheModule from "../cache/metadata";

vi.mock("../config/loader");
vi.mock("../api/client");
vi.mock("../cache/metadata");

const writeConfig = { space: "s", apiKey: "k", projectKey: "P", mode: "write" as const };
const readConfig = { space: "s", apiKey: "k", projectKey: "P", mode: "read" as const };

const mockClient = {
  space: "s",
  getIssue: vi.fn(),
  addIssue: vi.fn(),
  updateIssue: vi.fn(),
  deleteIssue: vi.fn(),
  searchIssues: vi.fn(),
  countIssues: vi.fn(),
  getProject: vi.fn(),
};

let mockExit: ReturnType<typeof vi.spyOn>;
let mockLog: ReturnType<typeof vi.spyOn>;
let mockError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(clientModule.BacklogApiClient).mockImplementation(() => mockClient as any);
  vi.mocked(cacheModule.readCache).mockReturnValue(null);
  vi.mocked(cacheModule.writeCache).mockImplementation(() => {});
  vi.mocked(cacheModule.resolveNameToId).mockReturnValue(undefined);
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

describe("issueCommand", () => {
  it("サブコマンドなしでエラー終了する", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    await expect(issueCommand([])).rejects.toThrow("exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("設定未定義でエラー終了する", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(null);
    await expect(issueCommand(["get", "PROJ-1"])).rejects.toThrow("exit");
  });

  describe("get", () => {
    it("課題をJSON出力する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      mockClient.getIssue.mockResolvedValue({ issueKey: "PROJ-1", summary: "テスト" });

      await issueCommand(["get", "PROJ-1"]);

      expect(mockClient.getIssue).toHaveBeenCalledWith("PROJ-1");
      expect(mockLog).toHaveBeenCalled();
    });

    it("課題キーなしでエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      await expect(issueCommand(["get"])).rejects.toThrow("exit");
    });
  });

  describe("create", () => {
    it("write モードで課題を作成できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      mockClient.addIssue.mockResolvedValue({ issueKey: "PROJ-99", summary: "新規" });

      await issueCommand(["create", "--summary", "新規", "--type-id", "1", "--priority-id", "3"]);

      expect(mockClient.addIssue).toHaveBeenCalledWith(
        expect.objectContaining({ summary: "新規", issueTypeId: 1, priorityId: 3 })
      );
    });

    it("read モードでブロックされる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(
        issueCommand(["create", "--summary", "x", "--type-id", "1", "--priority-id", "3"])
      ).rejects.toThrow("exit");
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining("write mode"));
    });

    it("必須オプション不足でエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      await expect(issueCommand(["create", "--summary", "x"])).rejects.toThrow("exit");
    });

    it("--type と --priority 名前フラグでキャッシュから解決して作成できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      vi.mocked(cacheModule.resolveNameToId).mockImplementation((type, name) => {
        if (type === "issue-types" && name === "タスク") return 1;
        if (type === "priorities" && name === "中") return 3;
        return undefined;
      });
      mockClient.addIssue.mockResolvedValue({ issueKey: "PROJ-99", summary: "新規" });

      await issueCommand(["create", "--summary", "新規", "--type", "タスク", "--priority", "中"]);

      expect(mockClient.addIssue).toHaveBeenCalledWith(
        expect.objectContaining({ summary: "新規", issueTypeId: 1, priorityId: 3 })
      );
    });

    it("キャッシュ無しで --type 名前を指定するとエラーになる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      vi.mocked(cacheModule.resolveNameToId).mockReturnValue(undefined);

      await expect(
        issueCommand(["create", "--summary", "x", "--type", "タスク", "--priority-id", "3"])
      ).rejects.toThrow("exit");
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining("タスク"));
    });

    it("project キャッシュがある場合は getProject を呼ばない", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      vi.mocked(cacheModule.readCache).mockReturnValue({
        cachedAt: "2026-01-01",
        data: [{ id: 10 }],
      } as any);
      mockClient.addIssue.mockResolvedValue({ issueKey: "PROJ-99", summary: "新規" });

      await issueCommand(["create", "--summary", "新規", "--type-id", "1", "--priority-id", "3"]);

      expect(mockClient.getProject).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("write モードで課題を更新できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      mockClient.updateIssue.mockResolvedValue({ issueKey: "PROJ-1", summary: "更新済" });

      await issueCommand(["update", "PROJ-1", "--status-id", "4"]);

      expect(mockClient.updateIssue).toHaveBeenCalledWith("PROJ-1", expect.objectContaining({ statusId: 4 }));
    });

    it("read モードでブロックされる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(issueCommand(["update", "PROJ-1", "--status-id", "4"])).rejects.toThrow("exit");
    });

    it("課題キーなしでエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      await expect(issueCommand(["update"])).rejects.toThrow("exit");
    });

    it("--status 名前フラグでキャッシュから解決して更新できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      vi.mocked(cacheModule.resolveNameToId).mockImplementation((type, name) => {
        if (type === "statuses" && name === "完了") return 4;
        return undefined;
      });
      mockClient.updateIssue.mockResolvedValue({ issueKey: "PROJ-1", summary: "更新済" });

      await issueCommand(["update", "PROJ-1", "--status", "完了"]);

      expect(mockClient.updateIssue).toHaveBeenCalledWith("PROJ-1", expect.objectContaining({ statusId: 4 }));
    });

    it("--status-id が --status より優先される", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      mockClient.updateIssue.mockResolvedValue({ issueKey: "PROJ-1", summary: "更新済" });

      await issueCommand(["update", "PROJ-1", "--status-id", "4"]);

      expect(cacheModule.resolveNameToId).not.toHaveBeenCalledWith("statuses", expect.any(String));
      expect(mockClient.updateIssue).toHaveBeenCalledWith("PROJ-1", expect.objectContaining({ statusId: 4 }));
    });

    it("キャッシュ無しで --status 名前を指定するとエラーになる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      vi.mocked(cacheModule.resolveNameToId).mockReturnValue(undefined);

      await expect(
        issueCommand(["update", "PROJ-1", "--status", "完了"])
      ).rejects.toThrow("exit");
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining("完了"));
    });
  });

  describe("delete", () => {
    it("write モードで課題を削除できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      mockClient.deleteIssue.mockResolvedValue({ issueKey: "PROJ-1", summary: "削除済" });

      await issueCommand(["delete", "PROJ-1"]);

      expect(mockClient.deleteIssue).toHaveBeenCalledWith("PROJ-1");
    });

    it("read モードでブロックされる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      await expect(issueCommand(["delete", "PROJ-1"])).rejects.toThrow("exit");
    });
  });

  describe("search", () => {
    it("フィルタ付きで検索できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
      mockClient.searchIssues.mockResolvedValue([]);

      await issueCommand(["search", "--keyword", "バグ", "--type-id", "1,2", "--assignee-id", "5"]);

      expect(mockClient.searchIssues).toHaveBeenCalledWith(10, expect.objectContaining({
        keyword: "バグ",
        issueTypeId: [1, 2],
        assigneeId: [5],
      }));
    });

    it("フィルタなしで全件検索できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.searchIssues.mockResolvedValue([]);

      await issueCommand(["search"]);

      expect(mockClient.searchIssues).toHaveBeenCalled();
    });

    it("--assignee 名前フラグでキャッシュから解決して検索できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      vi.mocked(cacheModule.resolveNameToId).mockImplementation((type, name) => {
        if (type === "users" && name === "山田太郎") return 100;
        return undefined;
      });
      mockClient.searchIssues.mockResolvedValue([]);

      await issueCommand(["search", "--assignee", "山田太郎"]);

      expect(mockClient.searchIssues).toHaveBeenCalledWith(10, expect.objectContaining({
        assigneeId: [100],
      }));
    });

    it("--assignee で userId でもマッチできる（resolveNameToId に委譲）", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      vi.mocked(cacheModule.resolveNameToId).mockImplementation((type, name) => {
        if (type === "users" && name === "yamada") return 100;
        return undefined;
      });
      mockClient.searchIssues.mockResolvedValue([]);

      await issueCommand(["search", "--assignee", "yamada"]);

      expect(mockClient.searchIssues).toHaveBeenCalledWith(10, expect.objectContaining({
        assigneeId: [100],
      }));
    });

    it("--version-id フィルターが searchIssues に versionId として渡される", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.searchIssues.mockResolvedValue([]);

      await issueCommand(["search", "--version-id", "10,11"]);

      expect(mockClient.searchIssues).toHaveBeenCalledWith(10, expect.objectContaining({
        versionId: [10, 11],
      }));
    });

    it("--priority-id フィルターが searchIssues に priorityId として渡される", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.searchIssues.mockResolvedValue([]);

      await issueCommand(["search", "--priority-id", "2"]);

      expect(mockClient.searchIssues).toHaveBeenCalledWith(10, expect.objectContaining({
        priorityId: [2],
      }));
    });

    it("--created-user-id フィルターが searchIssues に createdUserId として渡される", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.searchIssues.mockResolvedValue([]);

      await issueCommand(["search", "--created-user-id", "42"]);

      expect(mockClient.searchIssues).toHaveBeenCalledWith(10, expect.objectContaining({
        createdUserId: [42],
      }));
    });

    it("--resolution-id フィルターが searchIssues に resolutionId として渡される", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.searchIssues.mockResolvedValue([]);

      await issueCommand(["search", "--resolution-id", "1"]);

      expect(mockClient.searchIssues).toHaveBeenCalledWith(10, expect.objectContaining({
        resolutionId: [1],
      }));
    });

    it("--parent-child フィルターが searchIssues に parentChild として渡される", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.searchIssues.mockResolvedValue([]);

      await issueCommand(["search", "--parent-child", "4"]);

      expect(mockClient.searchIssues).toHaveBeenCalledWith(10, expect.objectContaining({
        parentChild: 4,
      }));
    });
  });

  describe("count", () => {
    it("フィルタ付きで件数を取得できる", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.countIssues.mockResolvedValue({ count: 42 });

      await issueCommand(["count", "--status-id", "1,2"]);

      expect(mockClient.countIssues).toHaveBeenCalledWith(10, expect.objectContaining({
        statusId: [1, 2],
      }));
    });

    it("--version-id フィルターが countIssues に versionId として渡される", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.countIssues.mockResolvedValue({ count: 5 });

      await issueCommand(["count", "--version-id", "10"]);

      expect(mockClient.countIssues).toHaveBeenCalledWith(10, expect.objectContaining({
        versionId: [10],
      }));
    });

    it("--parent-child フィルターが countIssues に parentChild として渡される", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
      mockClient.countIssues.mockResolvedValue({ count: 3 });

      await issueCommand(["count", "--parent-child", "2"]);

      expect(mockClient.countIssues).toHaveBeenCalledWith(10, expect.objectContaining({
        parentChild: 2,
      }));
    });
  });

  it("不明なサブコマンドでエラー終了する", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    await expect(issueCommand(["unknown"])).rejects.toThrow("exit");
  });

  it("BacklogClientError をハンドリングする", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    const err = Object.assign(new Error("Not found"), { name: "BacklogClientError", statusCode: 404 });
    Object.setPrototypeOf(err, clientModule.BacklogClientError.prototype);
    mockClient.getIssue.mockRejectedValue(err);

    await expect(issueCommand(["get", "PROJ-999"])).rejects.toThrow("exit");
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining("Not found"));
  });
});

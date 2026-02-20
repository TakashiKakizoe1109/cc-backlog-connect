import { describe, it, expect, vi, beforeEach } from "vitest";
import { projectInfoCommand } from "./project-info";
import * as loader from "../config/loader";
import * as clientModule from "../api/client";
import * as cacheModule from "../cache/metadata";

vi.mock("../config/loader");
vi.mock("../api/client");
vi.mock("../cache/metadata");

const config = { space: "s", apiKey: "k", projectKey: "P" };

const mockClient = {
  getStatuses: vi.fn(),
  getIssueTypes: vi.fn(),
  getPriorities: vi.fn(),
  getResolutions: vi.fn(),
  getProjectUsers: vi.fn(),
  getCategories: vi.fn(),
  getVersions: vi.fn(),
  getRateLimit: vi.fn(),
};

let mockExit: ReturnType<typeof vi.spyOn>;
let mockLog: ReturnType<typeof vi.spyOn>;
let mockError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.mocked(clientModule.BacklogApiClient).mockImplementation(() => mockClient as any);
  vi.mocked(loader.loadConfig).mockReturnValue(config);
  vi.mocked(cacheModule.readCache).mockReturnValue(null);
  vi.mocked(cacheModule.writeCache).mockImplementation(() => {});
  Object.values(mockClient).forEach((m) => m.mockClear());

  mockExit = vi.spyOn(process, "exit").mockImplementation((() => { throw new Error("exit"); }) as never);
  mockLog = vi.spyOn(console, "log").mockImplementation(() => {});
  mockError = vi.spyOn(console, "error").mockImplementation(() => {});

  return () => {
    mockExit.mockRestore();
    mockLog.mockRestore();
    mockError.mockRestore();
  };
});

describe("projectInfoCommand", () => {
  it("タイプなしでエラー終了する", async () => {
    await expect(projectInfoCommand([])).rejects.toThrow("exit");
  });

  it("不正なタイプでエラー終了する", async () => {
    await expect(projectInfoCommand(["invalid"])).rejects.toThrow("exit");
  });

  it("設定未定義でエラー終了する（キャッシュなし）", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(null);
    await expect(projectInfoCommand(["statuses"])).rejects.toThrow("exit");
  });

  const types = [
    ["statuses", "getStatuses", [{ id: 1, name: "Open" }]],
    ["issue-types", "getIssueTypes", [{ id: 1, name: "タスク" }]],
    ["priorities", "getPriorities", [{ id: 2, name: "中" }]],
    ["resolutions", "getResolutions", [{ id: 0, name: "対応済み" }]],
    ["users", "getProjectUsers", [{ id: 1, name: "user", userId: "u" }]],
    ["categories", "getCategories", [{ id: 1, name: "BE" }]],
    ["versions", "getVersions", [{ id: 1, name: "v1" }]],
  ] as const;

  for (const [type, method, data] of types) {
    it(`${type} を取得してJSON出力する`, async () => {
      mockClient[method].mockResolvedValue(data);

      await projectInfoCommand([type]);

      expect(mockClient[method]).toHaveBeenCalled();
      expect(mockLog).toHaveBeenCalled();
    });
  }

  it("BacklogClientError をハンドリングする", async () => {
    const err = Object.assign(new Error("API error"), { name: "BacklogClientError", statusCode: 500 });
    Object.setPrototypeOf(err, clientModule.BacklogClientError.prototype);
    mockClient.getStatuses.mockRejectedValue(err);

    await expect(projectInfoCommand(["statuses"])).rejects.toThrow("exit");
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining("API error"));
  });

  describe("--rate-limit", () => {
    const rateLimitData = {
      read:   { limit: 600, remaining: 595, reset: 1700000000 },
      update: { limit: 150, remaining: 148, reset: 1700000000 },
      search: { limit: 150, remaining: 143, reset: 1700000000 },
      icon:   { limit: 60,  remaining: 58,  reset: 1700000000 },
    };

    it("レート制限情報を表示する", async () => {
      mockClient.getRateLimit.mockResolvedValue(rateLimitData);

      await projectInfoCommand(["--rate-limit"]);

      expect(mockClient.getRateLimit).toHaveBeenCalled();
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Read:"));
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Update:"));
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Search:"));
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Icon:"));
    });

    it("remaining/limit の数値を含む", async () => {
      mockClient.getRateLimit.mockResolvedValue(rateLimitData);

      await projectInfoCommand(["--rate-limit"]);

      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("595"));
      expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("600"));
    });

    it("設定未定義でエラー終了する", async () => {
      vi.mocked(loader.loadConfig).mockReturnValue(null);
      await expect(projectInfoCommand(["--rate-limit"])).rejects.toThrow("exit");
    });

    it("BacklogClientError をハンドリングする", async () => {
      const err = Object.assign(new Error("API error"), { name: "BacklogClientError", statusCode: 500 });
      Object.setPrototypeOf(err, clientModule.BacklogClientError.prototype);
      mockClient.getRateLimit.mockRejectedValue(err);

      await expect(projectInfoCommand(["--rate-limit"])).rejects.toThrow("exit");
      expect(mockError).toHaveBeenCalledWith(expect.stringContaining("API error"));
    });
  });

  describe("cache behavior", () => {
    it("キャッシュが存在する場合はAPIを呼ばずキャッシュから返す", async () => {
      vi.mocked(cacheModule.readCache).mockReturnValue({
        cachedAt: "2026-01-01T00:00:00.000Z",
        data: [{ id: 1, name: "Open" }],
      });

      await projectInfoCommand(["statuses"]);

      expect(mockClient.getStatuses).not.toHaveBeenCalled();
      expect(mockLog).toHaveBeenCalledWith(JSON.stringify([{ id: 1, name: "Open" }], null, 2));
    });

    it("キャッシュがない場合はAPIを呼びキャッシュに書き込む", async () => {
      vi.mocked(cacheModule.readCache).mockReturnValue(null);
      mockClient.getStatuses.mockResolvedValue([{ id: 1, name: "Open" }]);

      await projectInfoCommand(["statuses"]);

      expect(mockClient.getStatuses).toHaveBeenCalled();
      expect(cacheModule.writeCache).toHaveBeenCalledWith("statuses", [{ id: 1, name: "Open" }]);
    });

    it("--refresh フラグはキャッシュがあっても API を再取得する", async () => {
      vi.mocked(cacheModule.readCache).mockReturnValue({
        cachedAt: "2026-01-01T00:00:00.000Z",
        data: [{ id: 1, name: "Open" }],
      });
      mockClient.getStatuses.mockResolvedValue([{ id: 1, name: "Open" }, { id: 4, name: "Closed" }]);

      await projectInfoCommand(["statuses", "--refresh"]);

      expect(mockClient.getStatuses).toHaveBeenCalled();
      expect(cacheModule.writeCache).toHaveBeenCalledWith("statuses", expect.any(Array));
    });

    it("--refresh なしでキャッシュなし: config load → API 呼び出し", async () => {
      vi.mocked(cacheModule.readCache).mockReturnValue(null);
      mockClient.getIssueTypes.mockResolvedValue([{ id: 1, name: "タスク" }]);

      await projectInfoCommand(["issue-types"]);

      expect(loader.loadConfig).toHaveBeenCalled();
      expect(mockClient.getIssueTypes).toHaveBeenCalled();
    });
  });
});

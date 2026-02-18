import { describe, it, expect, vi, beforeEach } from "vitest";
import { projectInfoCommand } from "./project-info";
import * as loader from "../config/loader";
import * as clientModule from "../api/client";

vi.mock("../config/loader");
vi.mock("../api/client");

const config = { space: "s", apiKey: "k", projectKey: "P" };

const mockClient = {
  getStatuses: vi.fn(),
  getIssueTypes: vi.fn(),
  getPriorities: vi.fn(),
  getResolutions: vi.fn(),
  getProjectUsers: vi.fn(),
  getCategories: vi.fn(),
  getVersions: vi.fn(),
};

let mockExit: ReturnType<typeof vi.spyOn>;
let mockLog: ReturnType<typeof vi.spyOn>;
let mockError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.mocked(clientModule.BacklogApiClient).mockImplementation(() => mockClient as any);
  vi.mocked(loader.loadConfig).mockReturnValue(config);
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

  it("設定未定義でエラー終了する", async () => {
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
});

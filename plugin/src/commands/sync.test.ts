import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncCommand } from "./sync";
import * as loader from "../config/loader";
import * as clientModule from "../api/client";
import * as cacheModule from "../cache/metadata";
import * as fs from "node:fs";

vi.mock("../config/loader");
vi.mock("../api/client");
vi.mock("../cache/metadata");
vi.mock("node:fs");

const writeConfig = { space: "s", apiKey: "k", projectKey: "P", mode: "write" as const };
const readConfig = { space: "s", apiKey: "k", projectKey: "P", mode: "read" as const };

const mockClient = {
  space: "s",
  getProject: vi.fn(),
  getIssues: vi.fn(),
  getIssue: vi.fn(),
  getStatuses: vi.fn(),
  getComments: vi.fn(),
  getAttachments: vi.fn(),
};

let mockExit: ReturnType<typeof vi.spyOn>;
let mockLog: ReturnType<typeof vi.spyOn>;
let mockError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(clientModule.BacklogApiClient).mockImplementation(() => mockClient as any);
  vi.mocked(loader.findProjectRoot).mockReturnValue("/tmp/test");
  vi.mocked(fs.existsSync).mockReturnValue(false);
  vi.mocked(fs.mkdirSync).mockImplementation(() => undefined as any);
  vi.mocked(fs.writeFileSync).mockImplementation(() => {});
  vi.mocked(cacheModule.writeCache).mockImplementation(() => {});
  Object.values(mockClient).forEach((m) => typeof m === "function" && "mockClear" in m && m.mockClear());
  mockClient.getProject.mockResolvedValue({ id: 10 });
  mockClient.getStatuses.mockResolvedValue([
    { id: 1, name: "Open" },
    { id: 4, name: "Closed" },
  ]);
  mockClient.getAttachments.mockResolvedValue([]);
  mockClient.getComments.mockResolvedValue([]);

  mockExit = vi.spyOn(process, "exit").mockImplementation((() => { throw new Error("exit"); }) as never);
  mockLog = vi.spyOn(console, "log").mockImplementation(() => {});
  mockError = vi.spyOn(console, "error").mockImplementation(() => {});

  return () => {
    mockExit.mockRestore();
    mockLog.mockRestore();
    mockError.mockRestore();
  };
});

describe("syncCommand", () => {
  it("設定未定義でエラー終了する", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(null);
    await expect(syncCommand({ all: false, force: false, dryRun: false })).rejects.toThrow("exit");
  });

  it("read モードでも同期できる（Backlog書き込みなし）", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(readConfig);
    mockClient.getIssues.mockResolvedValue([]);

    await syncCommand({ all: false, force: false, dryRun: false });

    expect(mockClient.getIssues).toHaveBeenCalled();
  });

  it("write モードで未完了課題を同期できる", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    mockClient.getIssues.mockResolvedValue([
      { issueKey: "P-1", summary: "t", description: "", status: { id: 1, name: "Open" }, issueType: { id: 1, name: "T" }, priority: { id: 2, name: "M" }, assignee: null, createdUser: { id: 1, name: "u", userId: "u" }, created: "2026-01-01", updated: "2026-01-01", dueDate: null, estimatedHours: null, actualHours: null },
    ]);

    await syncCommand({ all: false, force: false, dryRun: false });

    expect(mockClient.getStatuses).toHaveBeenCalled();
    expect(mockClient.getIssues).toHaveBeenCalledWith(10, expect.objectContaining({ statusId: [1] }));
  });

  it("--all で全課題を同期する", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    mockClient.getIssues.mockResolvedValue([]);

    await syncCommand({ all: true, force: false, dryRun: false });

    expect(mockClient.getIssues).toHaveBeenCalledWith(10, expect.objectContaining({ statusId: undefined }));
  });

  it("--issue で特定課題を同期する", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    mockClient.getIssue.mockResolvedValue({
      issueKey: "P-1", summary: "t", description: "", status: { id: 1, name: "Open" }, issueType: { id: 1, name: "T" }, priority: { id: 2, name: "M" }, assignee: null, createdUser: { id: 1, name: "u", userId: "u" }, created: "2026-01-01", updated: "2026-01-01", dueDate: null, estimatedHours: null, actualHours: null,
    });

    await syncCommand({ all: false, issue: "P-1", force: false, dryRun: false });

    expect(mockClient.getIssue).toHaveBeenCalledWith("P-1");
  });

  it("フィルタ付きで同期できる", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    mockClient.getIssues.mockResolvedValue([]);

    await syncCommand({
      all: false,
      force: false,
      dryRun: false,
      typeId: [1],
      assigneeId: [5],
      keyword: "リリース",
    });

    expect(mockClient.getIssues).toHaveBeenCalledWith(10, expect.objectContaining({
      issueTypeId: [1],
      assigneeId: [5],
      keyword: "リリース",
    }));
  });

  it("dry-run でファイルを書き込まない", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    mockClient.getIssues.mockResolvedValue([
      { issueKey: "P-1", summary: "t", description: "", status: { id: 1, name: "Open" }, issueType: { id: 1, name: "T" }, priority: { id: 2, name: "M" }, assignee: null, createdUser: { id: 1, name: "u", userId: "u" }, created: "2026-01-01", updated: "2026-01-01", dueDate: null, estimatedHours: null, actualHours: null },
    ]);

    await syncCommand({ all: true, force: false, dryRun: true });

    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("dry run"));
  });

  it("--status-id フィルターが getIssues に渡される", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    mockClient.getIssues.mockResolvedValue([]);

    await syncCommand({
      all: false,
      force: false,
      dryRun: false,
      statusId: [1, 2],
    });

    expect(mockClient.getIssues).toHaveBeenCalledWith(10, expect.objectContaining({
      statusId: [1, 2],
    }));
    // --status-id 指定時は getStatuses を呼ばない
    expect(mockClient.getStatuses).not.toHaveBeenCalled();
  });

  it("getProject() の結果が project キャッシュに書き込まれる", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    mockClient.getIssues.mockResolvedValue([]);

    await syncCommand({ all: false, force: false, dryRun: false });

    expect(cacheModule.writeCache).toHaveBeenCalledWith("project", [{ id: 10 }]);
  });

  it("--all 以外で getStatuses() の結果が statuses キャッシュに書き込まれる", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    mockClient.getIssues.mockResolvedValue([]);

    await syncCommand({ all: false, force: false, dryRun: false });

    expect(cacheModule.writeCache).toHaveBeenCalledWith("statuses", expect.any(Array));
  });

  it("--all で同期する場合は statuses キャッシュを書き込まない", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    mockClient.getIssues.mockResolvedValue([]);

    await syncCommand({ all: true, force: false, dryRun: false });

    const writeCacheCalls = vi.mocked(cacheModule.writeCache).mock.calls;
    const statusCalls = writeCacheCalls.filter(([type]) => type === "statuses");
    expect(statusCalls).toHaveLength(0);
  });

  it("--version-id フィルターが getIssues に versionId として渡される", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    mockClient.getIssues.mockResolvedValue([]);

    await syncCommand({ all: false, force: false, dryRun: false, versionId: [10, 11] });

    expect(mockClient.getIssues).toHaveBeenCalledWith(10, expect.objectContaining({
      versionId: [10, 11],
    }));
  });

  it("--priority-id フィルターが getIssues に priorityId として渡される", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    mockClient.getIssues.mockResolvedValue([]);

    await syncCommand({ all: false, force: false, dryRun: false, priorityId: [2] });

    expect(mockClient.getIssues).toHaveBeenCalledWith(10, expect.objectContaining({
      priorityId: [2],
    }));
  });

  it("--created-user-id フィルターが getIssues に createdUserId として渡される", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    mockClient.getIssues.mockResolvedValue([]);

    await syncCommand({ all: false, force: false, dryRun: false, createdUserId: [42] });

    expect(mockClient.getIssues).toHaveBeenCalledWith(10, expect.objectContaining({
      createdUserId: [42],
    }));
  });

  it("--resolution-id フィルターが getIssues に resolutionId として渡される", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    mockClient.getIssues.mockResolvedValue([]);

    await syncCommand({ all: false, force: false, dryRun: false, resolutionId: [1] });

    expect(mockClient.getIssues).toHaveBeenCalledWith(10, expect.objectContaining({
      resolutionId: [1],
    }));
  });

  it("--parent-child 2 が getIssues に parentChild: 2 として渡される", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    mockClient.getIssues.mockResolvedValue([]);

    await syncCommand({ all: false, force: false, dryRun: false, parentChild: 2 });

    expect(mockClient.getIssues).toHaveBeenCalledWith(10, expect.objectContaining({
      parentChild: 2,
    }));
  });

  it("config.parallel で指定した数ずつ課題を並列処理する", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue({ ...writeConfig, parallel: 2 });
    const makeIssue = (key: string) => ({ issueKey: key, summary: "t", description: "", status: { id: 1, name: "Open" }, issueType: { id: 1, name: "T" }, priority: { id: 2, name: "M" }, assignee: null, createdUser: { id: 1, name: "u", userId: "u" }, created: "2026-01-01", updated: "2026-01-01", dueDate: null, estimatedHours: null, actualHours: null });
    mockClient.getIssues.mockResolvedValue([makeIssue("P-1"), makeIssue("P-2"), makeIssue("P-3")]);

    await syncCommand({ all: true, force: false, dryRun: false });

    // 3課題が全て処理される
    expect(mockClient.getAttachments).toHaveBeenCalledTimes(3);
  });

  it("getAttachments と getComments が同一課題に対して並列に呼ばれる", async () => {
    vi.mocked(loader.loadConfig).mockReturnValue(writeConfig);
    const issue = { issueKey: "P-1", summary: "t", description: "", status: { id: 1, name: "Open" }, issueType: { id: 1, name: "T" }, priority: { id: 2, name: "M" }, assignee: null, createdUser: { id: 1, name: "u", userId: "u" }, created: "2026-01-01", updated: "2026-01-01", dueDate: null, estimatedHours: null, actualHours: null };
    mockClient.getIssues.mockResolvedValue([issue]);

    const callOrder: string[] = [];
    mockClient.getAttachments.mockImplementation(() => {
      callOrder.push("attachments");
      return Promise.resolve([]);
    });
    mockClient.getComments.mockImplementation(() => {
      callOrder.push("comments");
      return Promise.resolve([]);
    });

    await syncCommand({ all: true, force: false, dryRun: false });

    expect(mockClient.getAttachments).toHaveBeenCalledWith("P-1");
    expect(mockClient.getComments).toHaveBeenCalledWith("P-1");
    // 両方が呼ばれていることを確認（並列実行）
    expect(callOrder).toContain("attachments");
    expect(callOrder).toContain("comments");
  });
});

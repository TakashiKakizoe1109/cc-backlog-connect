import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncCommand } from "./sync";
import * as loader from "../config/loader";
import * as clientModule from "../api/client";
import * as fs from "node:fs";

vi.mock("../config/loader");
vi.mock("../api/client");
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
  vi.mocked(clientModule.BacklogApiClient).mockImplementation(() => mockClient as any);
  vi.mocked(loader.findProjectRoot).mockReturnValue("/tmp/test");
  vi.mocked(fs.existsSync).mockReturnValue(false);
  vi.mocked(fs.mkdirSync).mockImplementation(() => undefined as any);
  vi.mocked(fs.writeFileSync).mockImplementation(() => {});
  mockClient.getProject.mockResolvedValue({ id: 10 });
  mockClient.getStatuses.mockResolvedValue([
    { id: 1, name: "Open" },
    { id: 4, name: "Closed" },
  ]);
  mockClient.getAttachments.mockResolvedValue([]);
  mockClient.getComments.mockResolvedValue([]);
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
});

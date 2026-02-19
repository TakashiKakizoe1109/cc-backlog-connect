import { describe, it, expect, vi, beforeEach } from "vitest";
import { readCache, writeCache, resolveNameToId } from "./metadata";
import * as loader from "../config/loader";
import * as fs from "node:fs";

vi.mock("node:fs");
vi.mock("../config/loader");

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(loader.findProjectRoot).mockReturnValue("/project");
});

describe("readCache", () => {
  it("ファイルが存在しない場合はnullを返す", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(readCache("statuses")).toBeNull();
  });

  it("不正なJSONの場合はnullを返す", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("invalid json" as any);
    expect(readCache("statuses")).toBeNull();
  });

  it("構造不正（dataが配列でない）の場合はnullを返す", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ cachedAt: "2026-01-01", data: "not an array" }) as any
    );
    expect(readCache("statuses")).toBeNull();
  });

  it("cachedAtがstringでない場合はnullを返す", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ cachedAt: 12345, data: [] }) as any
    );
    expect(readCache("statuses")).toBeNull();
  });

  it("正常なキャッシュはデータを返す", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ cachedAt: "2026-01-01T00:00:00.000Z", data: [{ id: 1, name: "未対応" }] }) as any
    );
    const result = readCache<{ id: number; name: string }>("statuses");
    expect(result).not.toBeNull();
    expect(result!.data).toHaveLength(1);
    expect(result!.data[0].name).toBe("未対応");
  });
});

describe("writeCache", () => {
  it("正しい形式でファイルに書き込む", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});

    writeCache("statuses", [{ id: 1, name: "未対応" }]);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "/project/.cc-backlog/statuses.json",
      expect.stringContaining('"data"'),
      expect.objectContaining({ mode: 0o600 })
    );
  });

  it("書き込む内容に cachedAt と data が含まれる", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    let written = "";
    vi.mocked(fs.writeFileSync).mockImplementation((_p, content: any) => {
      written = content;
    });

    writeCache("statuses", [{ id: 1, name: "未対応" }]);

    const parsed = JSON.parse(written);
    expect(parsed).toHaveProperty("cachedAt");
    expect(typeof parsed.cachedAt).toBe("string");
    expect(parsed.data).toEqual([{ id: 1, name: "未対応" }]);
  });

  it("ディレクトリがなければ自動作成する", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined as any);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});

    writeCache("statuses", []);

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      "/project/.cc-backlog",
      expect.objectContaining({ recursive: true })
    );
  });
});

describe("resolveNameToId", () => {
  const setupCache = (data: Array<{ id: number; name: string; userId?: string | null }>) => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ cachedAt: "2026-01-01", data }) as any
    );
  };

  it("キャッシュがない場合はundefinedを返す", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    expect(resolveNameToId("statuses", "完了")).toBeUndefined();
  });

  it("完全一致で解決する", () => {
    setupCache([{ id: 4, name: "完了" }, { id: 1, name: "未対応" }]);
    expect(resolveNameToId("statuses", "完了")).toBe(4);
  });

  it("大文字小文字を無視して解決する", () => {
    setupCache([{ id: 1, name: "Open" }]);
    expect(resolveNameToId("statuses", "open")).toBe(1);
  });

  it("部分一致（単一ヒット）で解決する", () => {
    setupCache([{ id: 4, name: "完了" }, { id: 1, name: "未対応" }]);
    expect(resolveNameToId("statuses", "対応")).toBe(1);
  });

  it("複数ヒットの場合はundefinedを返す（曖昧）", () => {
    setupCache([{ id: 1, name: "未対応" }, { id: 2, name: "処理中" }, { id: 3, name: "対応済" }]);
    expect(resolveNameToId("statuses", "対応")).toBeUndefined();
  });

  it("usersタイプはuserIdフィールドでもマッチする", () => {
    setupCache([{ id: 100, name: "山田太郎", userId: "yamada" }]);
    expect(resolveNameToId("users", "yamada")).toBe(100);
  });

  it("usersタイプはnameフィールドでもマッチする", () => {
    setupCache([{ id: 100, name: "山田太郎", userId: "yamada" }]);
    expect(resolveNameToId("users", "山田太郎")).toBe(100);
  });

  it("usersタイプのuserIdがnullの場合はnameのみでマッチする", () => {
    setupCache([{ id: 100, name: "山田太郎", userId: null }]);
    expect(resolveNameToId("users", "山田太郎")).toBe(100);
    expect(resolveNameToId("users", "yamada")).toBeUndefined();
  });
});

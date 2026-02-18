import { describe, it, expect, vi, beforeEach } from "vitest";
import { configShow, configSet } from "./config";
import * as loader from "../config/loader";

vi.mock("../config/loader");

let mockExit: ReturnType<typeof vi.spyOn>;
let mockLog: ReturnType<typeof vi.spyOn>;
let mockError: ReturnType<typeof vi.spyOn>;
let mockWarn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.mocked(loader.loadConfig).mockReset();
  vi.mocked(loader.saveConfig).mockReset();
  vi.mocked(loader.maskApiKey).mockImplementation((k) => k.length > 8 ? k.slice(0, 4) + "..." + k.slice(-4) : "****");
  mockExit = vi.spyOn(process, "exit").mockImplementation((() => { throw new Error("exit"); }) as never);
  mockLog = vi.spyOn(console, "log").mockImplementation(() => {});
  mockError = vi.spyOn(console, "error").mockImplementation(() => {});
  mockWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

  return () => {
    mockExit.mockRestore();
    mockLog.mockRestore();
    mockError.mockRestore();
    mockWarn.mockRestore();
  };
});

describe("configShow", () => {
  it("設定が存在するとき全フィールドを表示する", () => {
    vi.mocked(loader.loadConfig).mockReturnValue({
      space: "my-space",
      apiKey: "abcdefghij",
      projectKey: "PROJ",
      mode: "write",
    });

    configShow();

    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("my-space"));
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("PROJ"));
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("write"));
  });

  it("mode 未設定のとき read をデフォルト表示する", () => {
    vi.mocked(loader.loadConfig).mockReturnValue({
      space: "s",
      apiKey: "abcdefghij",
      projectKey: "P",
    });

    configShow();

    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("read"));
  });

  it("設定がないとき終了する", () => {
    vi.mocked(loader.loadConfig).mockReturnValue(null);

    expect(() => configShow()).toThrow("exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});

describe("configSet", () => {
  it("全パラメータ指定で設定を保存する", () => {
    vi.mocked(loader.loadConfig).mockReturnValue(null);

    configSet({ space: "s", apiKey: "k", projectKey: "P", mode: "write" });

    expect(vi.mocked(loader.saveConfig)).toHaveBeenCalledWith({
      space: "s",
      apiKey: "k",
      projectKey: "P",
      mode: "write",
    });
    expect(mockLog).toHaveBeenCalledWith("Configuration saved.");
  });

  it("既存設定をマージする", () => {
    vi.mocked(loader.loadConfig).mockReturnValue({
      space: "old",
      apiKey: "old-key",
      projectKey: "OLD",
      mode: "read",
    });

    configSet({ space: "new" });

    expect(vi.mocked(loader.saveConfig)).toHaveBeenCalledWith(
      expect.objectContaining({ space: "new", apiKey: "old-key", projectKey: "OLD", mode: "read" })
    );
  });

  it("mode だけ変更できる", () => {
    vi.mocked(loader.loadConfig).mockReturnValue({
      space: "s",
      apiKey: "k",
      projectKey: "P",
    });

    configSet({ mode: "write" });

    expect(vi.mocked(loader.saveConfig)).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "write" })
    );
  });

  it("引数なしで終了する", () => {
    expect(() => configSet({})).toThrow("exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("不正な mode 値で終了する", () => {
    expect(() => configSet({ mode: "invalid" })).toThrow("exit");
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('"read" or "write"'));
  });
});

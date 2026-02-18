import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertWriteMode } from "./guard";

let mockExit: ReturnType<typeof vi.spyOn>;
let mockError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mockExit = vi.spyOn(process, "exit").mockImplementation((() => {
    throw new Error("exit");
  }) as never);
  mockError = vi.spyOn(console, "error").mockImplementation(() => {});

  return () => {
    mockExit.mockRestore();
    mockError.mockRestore();
  };
});

describe("assertWriteMode", () => {
  it("write モードなら何も起きない", () => {
    expect(() =>
      assertWriteMode({ space: "s", apiKey: "k", projectKey: "P", mode: "write" })
    ).not.toThrow();
  });

  it("read モードならプロセスが終了する", () => {
    expect(() =>
      assertWriteMode({ space: "s", apiKey: "k", projectKey: "P", mode: "read" })
    ).toThrow("exit");
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining("write mode"));
  });

  it("mode 未設定ならデフォルト read としてプロセスが終了する", () => {
    expect(() =>
      assertWriteMode({ space: "s", apiKey: "k", projectKey: "P" })
    ).toThrow("exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});

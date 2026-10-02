import { describe, it, expect } from "vitest";
import { parseArgs } from "./index";

describe("parseArgs", () => {
  it("コマンドのみ → options は空", () => {
    const result = parseArgs(["sync"]);
    expect(result.command).toBe("sync");
    expect(result.options).toEqual({});
  });

  it("引数なし → command は 'help'", () => {
    const result = parseArgs([]);
    expect(result.command).toBe("help");
  });

  it("--key value → { key: 'value' }", () => {
    const result = parseArgs(["sync", "--issue", "PROJ-123"]);
    expect(result.command).toBe("sync");
    expect(result.options.issue).toBe("PROJ-123");
  });

  it("--flag (値なし) → { flag: true }", () => {
    const result = parseArgs(["sync", "--all"]);
    expect(result.command).toBe("sync");
    expect(result.options.all).toBe(true);
  });

  it("コマンド + 複数オプション", () => {
    const result = parseArgs(["sync", "--all", "--force", "--issue", "PROJ-5"]);
    expect(result.command).toBe("sync");
    expect(result.options.all).toBe(true);
    expect(result.options.force).toBe(true);
    expect(result.options.issue).toBe("PROJ-5");
  });

  it("--flag の次に --key value が来る場合", () => {
    const result = parseArgs(["config", "--dry-run", "--space", "my-space"]);
    expect(result.command).toBe("config");
    expect(result.options["dry-run"]).toBe(true);
    expect(result.options.space).toBe("my-space");
  });
});

it("preserves JSON custom-field filters as a single sync option", () => {
  const json = '{"101":"日本語 &=","102":{"min":0},"103":[11,12]}';
  expect(parseArgs(["sync","--all","--custom-field-filters",json]).options).toEqual({all:true,"custom-field-filters":json});
});
it.each(["custom-fields","custom-field-filters"])("rejects duplicate --%s instead of silently replacing input", flag => {
  expect(() => parseArgs(["sync",`--${flag}`,"{}",`--${flag}`,"{}"])).toThrow(/Duplicate/);
});

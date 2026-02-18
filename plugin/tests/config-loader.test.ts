import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { maskApiKey, findProjectRoot } from "../src/config/loader";

describe("maskApiKey", () => {
  it("長いキー → 先頭4文字 + '...' + 末尾4文字", () => {
    expect(maskApiKey("abcdefghijklmnop")).toBe("abcd...mnop");
  });

  it("ちょうど9文字のキー → マスクされる", () => {
    expect(maskApiKey("123456789")).toBe("1234...6789");
  });

  it("8文字以下のキー → '****'", () => {
    expect(maskApiKey("12345678")).toBe("****");
    expect(maskApiKey("abc")).toBe("****");
    expect(maskApiKey("")).toBe("****");
  });
});

describe("findProjectRoot", () => {
  it(".git ディレクトリがある場合そのディレクトリを返す", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-backlog-test-"));
    const gitDir = path.join(tmpDir, ".git");
    fs.mkdirSync(gitDir);

    const subDir = path.join(tmpDir, "a", "b", "c");
    fs.mkdirSync(subDir, { recursive: true });

    const result = findProjectRoot(subDir);
    expect(result).toBe(tmpDir);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it(".cc-backlog ディレクトリがある場合そのディレクトリを返す", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-backlog-test-"));
    const configDir = path.join(tmpDir, ".cc-backlog");
    fs.mkdirSync(configDir);

    const subDir = path.join(tmpDir, "deep", "nested");
    fs.mkdirSync(subDir, { recursive: true });

    const result = findProjectRoot(subDir);
    expect(result).toBe(tmpDir);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

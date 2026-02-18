import { describe, it, expect } from "vitest";
import { formatCommentsMd } from "../src/markdown/comments";
import { BacklogComment } from "../src/api/types";

function makeComment(overrides: Partial<BacklogComment> = {}): BacklogComment {
  return {
    id: 1,
    content: "コメント内容です。",
    createdUser: { id: 10, name: "田中太郎", userId: "tanaka" },
    created: "2026-01-20T09:30:00Z",
    updated: null,
    ...overrides,
  };
}

describe("formatCommentsMd", () => {
  it("コメントありで正しい Markdown を出力する", () => {
    const comments = [makeComment()];
    const md = formatCommentsMd("PROJ-1", "テスト課題", comments);

    expect(md).not.toBeNull();
    expect(md).toContain("# Comments: [PROJ-1] テスト課題");
    expect(md).toContain("田中太郎");
    expect(md).toContain("コメント内容です。");
  });

  it("content が null のコメントのみ → null を返す", () => {
    const comments = [makeComment({ content: null })];
    const result = formatCommentsMd("PROJ-1", "テスト課題", comments);

    expect(result).toBeNull();
  });

  it("content が空文字のコメントのみ → null を返す", () => {
    const comments = [makeComment({ content: "  " })];
    const result = formatCommentsMd("PROJ-1", "テスト課題", comments);

    expect(result).toBeNull();
  });

  it("複数コメントがセパレータ '---' で区切られる", () => {
    const comments = [
      makeComment({ id: 1, content: "最初のコメント" }),
      makeComment({
        id: 2,
        content: "2番目のコメント",
        createdUser: { id: 20, name: "山田花子", userId: "yamada" },
      }),
    ];
    const md = formatCommentsMd("PROJ-1", "テスト課題", comments)!;

    expect(md).toContain("最初のコメント");
    expect(md).toContain("2番目のコメント");
    expect(md).toContain("---");
    expect(md).toContain("田中太郎");
    expect(md).toContain("山田花子");
  });
});

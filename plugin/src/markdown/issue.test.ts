import { describe, it, expect } from "vitest";
import { formatIssueMd } from "./issue";
import { BacklogIssue, BacklogAttachment } from "../api/types";

function makeIssue(overrides: Partial<BacklogIssue> = {}): BacklogIssue {
  return {
    id: 1,
    issueKey: "PROJ-1",
    summary: "テスト課題",
    description: "課題の説明文です。",
    status: { id: 1, name: "処理中" },
    issueType: { id: 1, name: "タスク" },
    priority: { id: 2, name: "中" },
    assignee: { id: 10, name: "田中太郎", userId: "tanaka" },
    createdUser: { id: 20, name: "山田花子", userId: "yamada" },
    created: "2026-01-15T10:30:00Z",
    updated: "2026-02-01T14:00:00Z",
    dueDate: null,
    estimatedHours: null,
    actualHours: null,
    ...overrides,
  };
}

describe("formatIssueMd", () => {
  it("全フィールドありの課題で正しい Markdown を出力する", () => {
    const issue = makeIssue({
      dueDate: "2026-03-01T00:00:00Z",
      estimatedHours: 8,
      actualHours: 5,
    });

    const md = formatIssueMd(issue, "my-space");

    expect(md).toContain("# [PROJ-1] テスト課題");
    expect(md).toContain("https://my-space.backlog.com/view/PROJ-1");
    expect(md).toContain("**Status**: 処理中");
    expect(md).toContain("**Type**: タスク");
    expect(md).toContain("**Priority**: 中");
    expect(md).toContain("**Assignee**: 田中太郎");
    expect(md).toContain("**Reporter**: 山田花子");
    expect(md).toContain("**Created**: 2026-01-15");
    expect(md).toContain("**Updated**: 2026-02-01");
    expect(md).toContain("**Due Date**: 2026-03-01");
    expect(md).toContain("**Estimated Hours**: 8");
    expect(md).toContain("**Actual Hours**: 5");
    expect(md).toContain("課題の説明文です。");
  });

  it("assignee が null の場合 Assignee 行が出力されない", () => {
    const issue = makeIssue({ assignee: null });
    const md = formatIssueMd(issue, "my-space");

    expect(md).not.toContain("Assignee");
  });

  it("description が null の場合 '(No description)' が出力される", () => {
    const issue = makeIssue({ description: null });
    const md = formatIssueMd(issue, "my-space");

    expect(md).toContain("(No description)");
  });

  it("dueDate / estimatedHours / actualHours が null の場合それぞれの行が出力されない", () => {
    const issue = makeIssue({
      dueDate: null,
      estimatedHours: null,
      actualHours: null,
    });
    const md = formatIssueMd(issue, "my-space");

    expect(md).not.toContain("Due Date");
    expect(md).not.toContain("Estimated Hours");
    expect(md).not.toContain("Actual Hours");
  });

  it("添付ファイルありの場合 Attachments セクションが出力される", () => {
    const issue = makeIssue();
    const attachments: BacklogAttachment[] = [
      { id: 1, name: "screenshot.png", size: 12345 },
      { id: 2, name: "design.pdf", size: 67890 },
    ];
    const md = formatIssueMd(issue, "my-space", attachments);

    expect(md).toContain("## Attachments");
    expect(md).toContain("[screenshot.png](attachments/screenshot.png)");
    expect(md).toContain("[design.pdf](attachments/design.pdf)");
  });

  it("添付ファイルなしの場合 Attachments セクションが出力されない", () => {
    const issue = makeIssue();
    const md = formatIssueMd(issue, "my-space", []);

    expect(md).not.toContain("Attachments");
  });
});

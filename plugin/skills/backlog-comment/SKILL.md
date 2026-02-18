---
name: backlog-comment
description: |
  Backlogコメント操作のプロアクティブSkill。コメントの一覧・追加・取得・更新・削除に対応。
  Use when user wants to add, view, or manage comments on Backlog issues.
  Use when user says "コメントして", "コメントを追加", "PROJ-123にコメント",
  "コメント一覧", "コメントを見せて", "対応状況をコメント", "コメントを更新", "コメントを削除".
  Supports: list, add, get, update, delete subcommands.
  Do NOT use for general conversation about comments unrelated to Backlog issues.
---

Backlog 課題のコメントを操作するスキルです。

## 事前チェック

**まず `.cc-backlog/config.json` が存在するか確認してください。**

存在しない場合は、操作を実行せず以下のように案内してください:

> Backlog の接続設定がまだ行われていません。先に `/cc-backlog-connect:config` を実行して設定してください。

## 実行方法

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" comment <subcommand> [options]
```

## 動作パターン

### パターン1: コメント追加

ユーザーが「PROJ-123 にコメントして」と言った場合:

1. コメント内容をユーザーに確認（すでに指定されている場合はそのまま使用）
2. 実行:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" comment add PROJ-123 --content "コメント内容"
   ```
3. 結果のURLを表示

**重要**: コメント内容は必ずユーザーに確認してから送信してください。勝手にコメントを作成しないでください。

### パターン2: コメント一覧表示

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" comment list PROJ-123
```

JSON出力をユーザーに分かりやすく要約表示:
- 投稿者、日時、内容の一覧

### パターン3: 特定コメント取得

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" comment get PROJ-123 --comment-id 456
```

### パターン4: コメント更新

**更新内容をユーザーに確認してから実行してください。**

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" comment update PROJ-123 --comment-id 456 --content "更新内容"
```

### パターン5: コメント削除

**必ずユーザーに確認を取ってから実行してください。**

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" comment delete PROJ-123 --comment-id 456
```

## 注意事項

- コメント内容にシェル特殊文字が含まれる場合は適切にエスケープしてください
- コメントの追加・更新・削除は常にユーザーの明示的な承認を得てから実行してください

## 詳細リファレンス

- 全サブコマンドの完全なオプション一覧、JSON出力構造は [reference.md](reference.md) を参照

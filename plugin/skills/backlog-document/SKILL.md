---
name: backlog-document
description: |
  Backlog Document操作のプロアクティブSkill。階層型ドキュメントの一覧・ツリー表示・取得・作成・削除・添付ファイル確認に対応。
  Note: Backlog の Document 機能（Wiki とは別の階層型ドキュメント機能）のみ対象。
  Use when user mentions "Backlog ドキュメント", "ドキュメントツリー", "document tree",
  "ドキュメントを追加", "ドキュメントを見せて", "Backlog document", "ドキュメント一覧".
  Use when user says "Backlogのドキュメント構造を確認", "ドキュメントを参照して実装",
  "ドキュメントを作成して", "階層構造を見せて".
  Supports: list, get, tree, attachments, add, delete subcommands.
  Supports --content-stdin for long content via pipe.
  Do NOT use for Wiki pages (use backlog-wiki skill instead).
  Do NOT use for local markdown files or non-Backlog documentation.
---

Backlog の階層型 Document を操作するスキルです。

**Note:** Backlog の Document は Wiki とは別機能です。`documentId` は **string 型**（Wiki の `wikiId: number` とは異なります）。

## 事前チェック

**まず `.cc-backlog/config.json` が存在するか確認してください。**

存在しない場合は、操作を実行せず以下のように案内してください:

> Backlog の接続設定がまだ行われていません。先に `/cc-backlog-connect:config` を実行して設定してください。

## 実行方法

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document <subcommand> [options]
```

## 動作パターン

### パターン1: ドキュメント一覧表示

ユーザーが「Backlog のドキュメント一覧を見せて」と言った場合:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document list
```

キーワードフィルター付き:
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document list --keyword "API設計"
```

JSON出力をユーザーに分かりやすく表示:
- ドキュメントタイトル、ID、最終更新日の一覧

### パターン2: ツリー構造表示（最頻出）

ユーザーが「ドキュメントの階層構造を確認したい」と言った場合:

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document tree
```

出力はツリー形式（Active Documents + Trash）。documentId を特定するためのナビゲーションに使用。

### パターン3: 単一ドキュメント参照

1. まずツリーまたは一覧で documentId を確認:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document tree
   ```
2. ドキュメント取得:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document get <documentId>
   ```
3. 取得した `plain` フィールド（Markdown）をコンテキストとして活用

### パターン4: 添付ファイル一覧

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document attachments <documentId>
```

### パターン5: ドキュメント作成（write モード必須）

ユーザーが「Backlog にドキュメントを追加して」と言った場合:

1. タイトルをユーザーに確認
2. 内容を整形
3. 実行:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document add --title "タイトル" --content "内容"
   ```
   内容が長い場合はstdin経由:
   ```bash
   echo '内容' | node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document add --title "タイトル" --content-stdin
   ```
4. 作成されたドキュメントのIDとタイトルを表示

### パターン6: ドキュメント削除（write モード必須）

**必ずユーザーに確認を取ってから実行してください。**

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document delete <documentId>
```

## 注意事項

- `documentId` は string 型（例: `"abc123def456"`）。数値ではない
- Wiki の `wikiId`（数値）と混同しないこと
- 削除前は必ずユーザー確認を取る
- write モード操作（add/delete）は config の mode が write の場合のみ実行可能
- 複数プロジェクトを扱う場合は `--project <projectKey>` で指定

## 詳細リファレンス

- 全サブコマンドの完全なオプション一覧、JSON出力構造は [reference.md](reference.md) を参照

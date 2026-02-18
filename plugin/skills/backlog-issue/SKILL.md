---
name: backlog-issue
description: |
  Backlog課題操作のプロアクティブSkill。課題の取得・作成・更新・削除・検索・件数取得に対応。
  Use when user mentions a Backlog issue key (format: LETTERS-NUMBERS like PROJ-123, ABC-45),
  talks about Backlog tasks/issues/bugs, or wants to create/update/check Backlog issues.
  Use when user says "Backlogの課題", "課題を作って", "PROJ-123について",
  "ステータスを変更", "担当者を変更", "課題を検索", "課題を確認", "課題の一覧".
  Supports: get, create, update, delete, search, count subcommands.
  Can resolve human-readable names (status/priority/user) to IDs via project-info.
  Do NOT use for general project management unrelated to Nulab Backlog.
---

Backlog の課題を操作するスキルです。

## 事前チェック

**まず `.cc-backlog/config.json` が存在するか確認してください。**

存在しない場合は、操作を実行せず以下のように案内してください:

> Backlog の接続設定がまだ行われていません。先に `/cc-backlog-connect:config` を実行して設定してください。

## 実行方法

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue <subcommand> [options]
```

## 動作パターン

### パターン1: 課題キー検出 → 情報取得

ユーザーが課題キー（例: `PROJ-123`）に言及した場合:

1. `node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue get PROJ-123` を実行
2. 取得した JSON を以下の形式で要約表示:
   - 課題キー、タイトル、ステータス、担当者、優先度
   - 説明文（長い場合は要約）
   - URL

### パターン2: 課題の更新

ユーザーが「ステータスを変更して」「担当者を変えて」等と言った場合:

1. まずメタデータを取得して名前→IDを解決:
   - ステータス変更 → `node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" project-info statuses`
   - 優先度変更 → `node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" project-info priorities`
   - 担当者変更 → `node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" project-info users`
   - 種別変更 → `node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" project-info issue-types`
2. ユーザーの指定した名前をIDに変換
3. `node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue update <ISSUE-KEY> --status-id <id>` 等を実行

**例: 「PROJ-123 のステータスを完了にして」**
```bash
# 1. ステータス一覧取得
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" project-info statuses
# → [{"id": 4, "name": "完了"}, ...]

# 2. 更新実行
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue update PROJ-123 --status-id 4
```

### パターン3: 課題の新規作成

ユーザーが「課題を作って」「Backlogにチケット登録して」等と言った場合:

1. 必須パラメータを確認:
   - `--summary`: タイトル（ユーザーに確認）
   - `--type-id`: 課題種別ID（`project-info issue-types` で取得）
   - `--priority-id`: 優先度ID（`project-info priorities` で取得）
2. オプションパラメータを必要に応じて確認:
   - `--description`: 説明文
   - `--assignee-id`: 担当者ID
   - `--due-date`: 期限 (YYYY-MM-DD)
3. 実行:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue create --summary "タイトル" --type-id <id> --priority-id <id> --description "説明"
   ```

### パターン4: 課題の検索

```bash
# キーワード検索
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue search --keyword "バグ"

# ステータス指定検索
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue search --status-id 1,2

# 課題数取得
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue count
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue count --status-id 1
```

### パターン5: 課題の削除

**必ずユーザーに確認を取ってから実行してください。**

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue delete PROJ-123
```

## 出力形式

- **読み取り系** (get, search, count): JSON出力。ユーザーに分かりやすく要約してください。
- **書き込み系** (create, update, delete): 結果サマリーとURLが出力されます。

## 詳細リファレンス

- 全サブコマンドの完全なオプション一覧、APIパラメータ、JSON出力構造は [reference.md](reference.md) を参照

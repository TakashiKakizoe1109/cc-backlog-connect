---
name: backlog-issue
description: |
  Backlog課題操作のプロアクティブSkill。課題の取得・作成・更新・削除・検索・件数取得・同期に対応。
  Use when user mentions a Backlog issue key (format: LETTERS-NUMBERS like PROJ-123, ABC-45),
  talks about Backlog tasks/issues/bugs, or wants to create/update/check Backlog issues.
  Use when user says "Backlogの課題", "課題を作って", "PROJ-123について",
  "ステータスを変更", "担当者を変更", "課題を検索", "課題を確認", "課題の一覧",
  "同期したい", "課題を落として", "sync", "ローカルに保存", "課題を同期".
  Supports: get, create, update, delete, search, count subcommands and sync command.
  Can resolve human-readable names (status/priority/user) to IDs via cache or project-info.
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

### パターン2: 課題の更新（キャッシュ利用の高速パターン）

ユーザーが「ステータスを変更して」「担当者を変えて」等と言った場合:

**キャッシュがある場合（推奨）**: 名前ベースフラグを直接使用（API往復が不要）

```bash
# ステータスを名前で指定（キャッシュから解決）
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue update PROJ-123 --status "完了"

# 担当者を名前で指定
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue update PROJ-123 --assignee "山田太郎"

# 優先度を名前で指定
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue update PROJ-123 --priority "高"

# 種別を名前で指定
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue update PROJ-123 --type "バグ"
```

**キャッシュがない場合**: `project-info` でメタデータを取得してIDを解決

```bash
# 1. ステータス一覧取得（キャッシュに保存される）
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" project-info statuses
# → [{"id": 4, "name": "完了"}, ...]

# 2. 更新実行（ID指定）
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue update PROJ-123 --status-id 4
```

**例: 「PROJ-123 のステータスを完了にして」**
```bash
# キャッシュがあれば1コマンドで完了
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue update PROJ-123 --status "完了"
```

### パターン3: 課題の新規作成

ユーザーが「課題を作って」「Backlogにチケット登録して」等と言った場合:

**キャッシュを使う場合（名前指定）:**
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue create --summary "タイトル" --type "タスク" --priority "中"
```

**ID指定の場合:**
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue create --summary "タイトル" --type-id <id> --priority-id <id>
```

キャッシュがない場合は先に `project-info issue-types` と `project-info priorities` を実行してください。

### パターン4: 課題の検索・フィルタリング

```bash
# キーワード検索
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue search --keyword "バグ"

# ステータス指定（名前またはID）
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue search --status "完了"
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue search --status-id 1,2

# 担当者で絞り込み（名前・userIdまたはID）
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue search --assignee "山田太郎"
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue search --assignee "yamada"

# 種別で絞り込み
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue search --type "バグ"

# カテゴリーで絞り込み
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue search --category "バックエンド"

# マイルストーンで絞り込み
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue search --milestone "v1.0"

# 発生バージョンで絞り込み
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue search --version "v1.0"

# 優先度で絞り込み
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue search --priority "高"

# 登録者で絞り込み
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue search --created-user "山田太郎"

# 完了理由で絞り込み
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue search --resolution "対応済み"

# 親課題のみ絞り込み（0=全て 1=子課題以外 2=子課題のみ 3=どちらでもない 4=親課題のみ）
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue search --parent-child 4

# 課題数取得
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue count --status "完了"
```

**フィルタID解決の手順（キャッシュなし時）:**
| 項目 | 解決コマンド | 名前フラグ | IDフラグ |
|---|---|---|---|
| ステータス | `project-info statuses` | `--status` | `--status-id` |
| 担当者 | `project-info users` | `--assignee` | `--assignee-id` |
| 種別 | `project-info issue-types` | `--type` | `--type-id` |
| カテゴリー | `project-info categories` | `--category` | `--category-id` |
| マイルストーン | `project-info versions` | `--milestone` | `--milestone-id` |
| 発生バージョン | `project-info versions` | `--version` | `--version-id` |
| 優先度 | `project-info priorities` | `--priority` | `--priority-id` |
| 登録者 | `project-info users` | `--created-user` | `--created-user-id` |
| 完了理由 | `project-info resolutions` | `--resolution` | `--resolution-id` |

### パターン5: 課題の削除

**必ずユーザーに確認を取ってから実行してください。**

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue delete PROJ-123
```

### パターン6: 課題の同期（ローカル Markdown へ）

ユーザーが「同期したい」「課題を落としたい」「ローカルに保存して」等と言った場合:

**注意: sync は `issue` サブコマンドではなく、トップレベルの `sync` コマンドです。**
**read モードでも実行可能です（Backlog への書き込みは行いません）。**

```bash
# 未完了の課題を同期（ステータスキャッシュも更新される）
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" sync

# 全課題を同期
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" sync --all

# 特定の課題のみ
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" sync --issue PROJ-123

# プレビュー（ファイル書き込みなし）
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" sync --dry-run

# 既存ファイルを上書き
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" sync --force

# フィルタ付き同期（名前またはID）
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" sync --status "完了"
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" sync --status-id 1,2
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" sync --type "バグ" --assignee "yamada"
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" sync --keyword "リリース"
```

同期先: `docs/backlog/{課題キー}/` に `issue.md`, `comments.md`, `attachments/` が生成されます。

## 出力形式

- **読み取り系** (get, search, count): JSON出力。ユーザーに分かりやすく要約してください。
- **書き込み系** (create, update, delete): 結果サマリーとURLが出力されます。

## 詳細リファレンス

- 全サブコマンドの完全なオプション一覧、APIパラメータ、JSON出力構造は [reference.md](reference.md) を参照

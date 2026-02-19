# backlog-issue リファレンス

## サブコマンド一覧

| サブコマンド   | 説明     | 必須引数                                      |
|----------|--------|-------------------------------------------|
| `get`    | 課題詳細取得 | `<ISSUE-KEY>`                             |
| `create` | 課題新規作成 | `--summary`, (`--type-id` or `--type`), (`--priority-id` or `--priority`) |
| `update` | 課題更新   | `<ISSUE-KEY>` + 更新フィールド                   |
| `delete` | 課題削除   | `<ISSUE-KEY>`                             |
| `search` | 課題検索   | (任意フィルタ)                                  |
| `count`  | 課題数取得  | (任意フィルタ)                                  |

## CLI オプション詳細

### issue get

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue get <ISSUE-KEY>
```

引数: 課題キー（例: `PROJ-123`）

### issue create

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue create [options]
```

| オプション               | 必須  | 型      | 説明                                     |
|---------------------|-----|--------|----------------------------------------|
| `--summary`         | YES | string | 課題タイトル                                 |
| `--type-id`         | YES* | number | 課題種別ID（`project-info issue-types` で取得） |
| `--type`            | YES* | string | 課題種別名（キャッシュから解決。`--type-id` と排他）      |
| `--priority-id`     | YES* | number | 優先度ID（`project-info priorities` で取得）   |
| `--priority`        | YES* | string | 優先度名（キャッシュから解決。`--priority-id` と排他）   |
| `--description`     | no  | string | 説明文                                    |
| `--assignee-id`     | no  | number | 担当者ID（`project-info users` で取得）        |
| `--assignee`        | no  | string | 担当者名（キャッシュから解決。`--assignee-id` と排他）   |
| `--due-date`        | no  | string | 期限（YYYY-MM-DD）                         |
| `--estimated-hours` | no  | number | 予定時間                                   |
| `--actual-hours`    | no  | number | 実績時間                                   |

*: `--type-id` か `--type` のどちらか一方が必須。`--priority-id` か `--priority` のどちらか一方が必須。

### issue update

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue update <ISSUE-KEY> [options]
```

| オプション               | 型      | 説明                                     |
|---------------------|--------|----------------------------------------|
| `--summary`         | string | タイトル変更                                 |
| `--description`     | string | 説明文変更                                  |
| `--status-id`       | number | ステータス変更（ID指定）                          |
| `--status`          | string | ステータス変更（名前指定、キャッシュから解決）               |
| `--assignee-id`     | number | 担当者変更（ID指定）                            |
| `--assignee`        | string | 担当者変更（名前指定、キャッシュから解決）                 |
| `--priority-id`     | number | 優先度変更（ID指定）                            |
| `--priority`        | string | 優先度変更（名前指定、キャッシュから解決）                 |
| `--type-id`         | number | 課題種別変更（ID指定）                           |
| `--type`            | string | 課題種別変更（名前指定、キャッシュから解決）                |
| `--resolution-id`   | number | 完了理由（ID指定）                             |
| `--resolution`      | string | 完了理由（名前指定、キャッシュから解決）                  |
| `--due-date`        | string | 期限（YYYY-MM-DD）                         |
| `--estimated-hours` | number | 予定時間                                   |
| `--actual-hours`    | number | 実績時間                                   |
| `--comment`         | string | 更新時コメント                                |

### issue delete

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue delete <ISSUE-KEY>
```

### issue search

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue search [options]
```

| オプション             | 型      | 説明                                       |
|-------------------|--------|------------------------------------------|
| `--keyword`       | string | キーワード検索（部分一致）                            |
| `--status-id`     | string | ステータスID（カンマ区切りで複数指定可: `1,2,3`）           |
| `--status`        | string | ステータス名（キャッシュから解決、単一指定）                   |
| `--assignee-id`   | string | 担当者ID（カンマ区切りで複数指定可）                      |
| `--assignee`      | string | 担当者名またはuserID（キャッシュから解決、単一指定）            |
| `--type-id`       | string | 課題種別ID（カンマ区切りで複数指定可）                     |
| `--type`          | string | 課題種別名（キャッシュから解決、単一指定）                    |
| `--category-id`   | string | カテゴリーID（カンマ区切りで複数指定可）                    |
| `--category`      | string | カテゴリー名（キャッシュから解決、単一指定）                   |
| `--milestone-id`      | string | マイルストーンID（カンマ区切りで複数指定可）                  |
| `--milestone`         | string | マイルストーン名（キャッシュから解決、単一指定）                 |
| `--version-id`        | string | 発生バージョンID（カンマ区切りで複数指定可）                  |
| `--version`           | string | 発生バージョン名（キャッシュから解決、単一指定）                 |
| `--priority-id`       | string | 優先度ID（カンマ区切りで複数指定可）                      |
| `--priority`          | string | 優先度名（キャッシュから解決、単一指定）                     |
| `--created-user-id`   | string | 登録者ID（カンマ区切りで複数指定可）                      |
| `--created-user`      | string | 登録者名（キャッシュから解決、単一指定）                     |
| `--resolution-id`     | string | 完了理由ID（カンマ区切りで複数指定可）                     |
| `--resolution`        | string | 完了理由名（キャッシュから解決、単一指定）                    |
| `--parent-child`      | number | 親子関係（0=全て 1=子課題以外 2=子課題のみ 3=どちらでもない 4=親課題のみ） |

### issue count

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue count [options]
```

`issue search` と同じフィルタオプションが使用可能。

### sync（トップレベルコマンド）

**注意: `issue sync` ではなく `sync` です。read モードでも実行可能。**

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" sync [options]
```

| オプション              | 型      | 説明                                       |
|-------------------|--------|------------------------------------------|
| `--all`           | flag   | 全課題を同期（デフォルトは未完了のみ）                     |
| `--issue`         | string | 特定の課題キーのみ同期（例: `PROJ-123`）               |
| `--force`         | flag   | 既存ファイルを上書き                               |
| `--dry-run`       | flag   | プレビュー（ファイル書き込みなし）                        |
| `--status-id`     | string | ステータスIDで絞り込み（カンマ区切り）                     |
| `--status`        | string | ステータス名で絞り込み（キャッシュから解決）                   |
| `--type-id`       | string | 課題種別IDで絞り込み                              |
| `--type`          | string | 課題種別名で絞り込み（キャッシュから解決）                    |
| `--category-id`   | string | カテゴリーIDで絞り込み                             |
| `--category`      | string | カテゴリー名で絞り込み（キャッシュから解決）                   |
| `--milestone-id`  | string | マイルストーンIDで絞り込み                           |
| `--milestone`     | string | マイルストーン名で絞り込み（キャッシュから解決）                 |
| `--assignee-id`       | string | 担当者IDで絞り込み                               |
| `--assignee`          | string | 担当者名で絞り込み（キャッシュから解決）                     |
| `--keyword`           | string | キーワードで絞り込み                               |
| `--version-id`        | string | 発生バージョンIDで絞り込み                           |
| `--version`           | string | 発生バージョン名で絞り込み（キャッシュから解決）                 |
| `--priority-id`       | string | 優先度IDで絞り込み                               |
| `--priority`          | string | 優先度名で絞り込み（キャッシュから解決）                     |
| `--created-user-id`   | string | 登録者IDで絞り込み                               |
| `--created-user`      | string | 登録者名で絞り込み（キャッシュから解決）                     |
| `--resolution-id`     | string | 完了理由IDで絞り込み                              |
| `--resolution`        | string | 完了理由名で絞り込み（キャッシュから解決）                    |
| `--parent-child`      | number | 親子関係（0=全て 1=子課題以外 2=子課題のみ 3=どちらでもない 4=親課題のみ） |

sync 実行後、`.cc-backlog/` に `project.json` および（`--all` 以外の場合）`statuses.json` が自動更新されます。

同期先: `docs/backlog/{課題キー}/issue.md`, `comments.md`, `attachments/`

## JSON 出力構造

### BacklogIssue（get / search / create / update の出力）

```json
{
  "id": 12345,
  "issueKey": "PROJ-123",
  "summary": "課題タイトル",
  "description": "説明文（null可）",
  "status": {
    "id": 1,
    "name": "未対応"
  },
  "issueType": {
    "id": 10,
    "name": "タスク"
  },
  "priority": {
    "id": 3,
    "name": "中"
  },
  "assignee": {
    "id": 100,
    "name": "山田太郎",
    "userId": "yamada"
  },
  "createdUser": {
    "id": 100,
    "name": "山田太郎",
    "userId": "yamada"
  },
  "created": "2025-01-15T10:00:00Z",
  "updated": "2025-02-01T14:30:00Z",
  "dueDate": "2025-03-01T00:00:00Z",
  "estimatedHours": 8,
  "actualHours": 3
}
```

### count の出力

```json
{
  "count": 42
}
```

## キャッシュシステム

メタデータは `.cc-backlog/` ディレクトリにキャッシュされます:

| ファイル | 内容 | 更新タイミング |
|---------|------|-------------|
| `statuses.json` | ステータス一覧 | `project-info statuses` または `sync` 実行時 |
| `issue-types.json` | 課題種別一覧 | `project-info issue-types` 実行時 |
| `priorities.json` | 優先度一覧 | `project-info priorities` 実行時 |
| `resolutions.json` | 完了理由一覧 | `project-info resolutions` 実行時 |
| `users.json` | プロジェクトメンバー | `project-info users` 実行時 |
| `categories.json` | カテゴリー一覧 | `project-info categories` 実行時 |
| `versions.json` | バージョン/マイルストーン | `project-info versions` 実行時 |
| `project.json` | プロジェクト情報 | `sync` または `issue create/search/count` 実行時 |

名前解決の優先順位: **完全一致** → **部分一致（単一ヒット）** → エラー（曖昧または未ヒット）

`users` タイプは `name`（表示名）と `userId`（ログインID）の両方で検索可能。

## ID 解決パターン（キャッシュなし時）

ユーザーが名前（例: 「完了」「山田さん」）で指定した場合、以下の手順でIDに変換:

1. `project-info <type>` で一覧取得（キャッシュに保存される）
2. name フィールドを部分一致で検索
3. 一致するIDを使用

| ユーザーの指定  | 解決コマンド                     | 名前フラグ         | IDフラグ           |
|----------|----------------------------|-----------------|--------------------|
| ステータス名   | `project-info statuses`    | `--status`      | `--status-id`      |
| 優先度名     | `project-info priorities`  | `--priority`    | `--priority-id`    |
| 担当者名     | `project-info users`       | `--assignee`    | `--assignee-id`    |
| 課題種別名    | `project-info issue-types` | `--type`        | `--type-id`        |
| カテゴリー名   | `project-info categories`  | `--category`    | `--category-id`    |
| マイルストーン名 | `project-info versions`    | `--milestone`   | `--milestone-id`   |
| 完了理由名    | `project-info resolutions` | `--resolution`  | `--resolution-id`  |

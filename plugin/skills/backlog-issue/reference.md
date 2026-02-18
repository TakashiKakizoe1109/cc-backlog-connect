# backlog-issue リファレンス

## サブコマンド一覧

| サブコマンド   | 説明     | 必須引数                                      |
|----------|--------|-------------------------------------------|
| `get`    | 課題詳細取得 | `<ISSUE-KEY>`                             |
| `create` | 課題新規作成 | `--summary`, `--type-id`, `--priority-id` |
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
| `--type-id`         | YES | number | 課題種別ID（`project-info issue-types` で取得） |
| `--priority-id`     | YES | number | 優先度ID（`project-info priorities` で取得）   |
| `--description`     | no  | string | 説明文                                    |
| `--assignee-id`     | no  | number | 担当者ID（`project-info users` で取得）        |
| `--due-date`        | no  | string | 期限（YYYY-MM-DD）                         |
| `--estimated-hours` | no  | number | 予定時間                                   |
| `--actual-hours`    | no  | number | 実績時間                                   |

### issue update

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue update <ISSUE-KEY> [options]
```

| オプション               | 型      | 説明                                     |
|---------------------|--------|----------------------------------------|
| `--summary`         | string | タイトル変更                                 |
| `--description`     | string | 説明文変更                                  |
| `--status-id`       | number | ステータス変更（`project-info statuses` で取得）   |
| `--assignee-id`     | number | 担当者変更（`project-info users` で取得）        |
| `--priority-id`     | number | 優先度変更（`project-info priorities` で取得）   |
| `--type-id`         | number | 課題種別変更（`project-info issue-types` で取得） |
| `--resolution-id`   | number | 完了理由（`project-info resolutions` で取得）   |
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

| オプション         | 型      | 説明                             |
|---------------|--------|--------------------------------|
| `--keyword`   | string | キーワード検索（部分一致）                  |
| `--status-id` | string | ステータスID（カンマ区切りで複数指定可: `1,2,3`） |

### issue count

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue count [options]
```

| オプション         | 型      | 説明                    |
|---------------|--------|-----------------------|
| `--status-id` | string | ステータスID（カンマ区切りで複数指定可） |
| `--keyword`   | string | キーワードフィルタ             |

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

## ID 解決パターン

ユーザーが名前（例: 「完了」「山田さん」）で指定した場合、以下の手順でIDに変換:

1. `project-info <type>` で一覧取得
2. name フィールドを部分一致で検索
3. 一致するIDを使用

| ユーザーの指定 | 解決コマンド                     | 使用先オプション          |
|---------|----------------------------|-------------------|
| ステータス名  | `project-info statuses`    | `--status-id`     |
| 優先度名    | `project-info priorities`  | `--priority-id`   |
| 担当者名    | `project-info users`       | `--assignee-id`   |
| 課題種別名   | `project-info issue-types` | `--type-id`       |
| 完了理由名   | `project-info resolutions` | `--resolution-id` |

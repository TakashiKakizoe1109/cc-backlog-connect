# backlog-comment リファレンス

## サブコマンド一覧

| サブコマンド   | 説明       | 必須引数                                       |
|----------|----------|--------------------------------------------|
| `list`   | コメント一覧取得 | `<ISSUE-KEY>`                              |
| `add`    | コメント追加   | `<ISSUE-KEY>`, `--content`                 |
| `get`    | 特定コメント取得 | `<ISSUE-KEY>`, `--comment-id`              |
| `update` | コメント更新   | `<ISSUE-KEY>`, `--comment-id`, `--content` |
| `delete` | コメント削除   | `<ISSUE-KEY>`, `--comment-id`              |

## CLI オプション詳細

### comment list

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" comment list <ISSUE-KEY>
```

全コメントを時系列順（古い順）で取得。100件を超える場合は自動ページネーション。

### comment add

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" comment add <ISSUE-KEY> --content <text>
```

| オプション       | 必須  | 型      | 説明     |
|-------------|-----|--------|--------|
| `--content` | YES | string | コメント本文 |

出力: `Comment added to PROJ-123 (id: 789)` + URL

### comment get

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" comment get <ISSUE-KEY> --comment-id <id>
```

| オプション          | 必須  | 型      | 説明     |
|----------------|-----|--------|--------|
| `--comment-id` | YES | number | コメントID |

### comment update

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" comment update <ISSUE-KEY> --comment-id <id> --content <text>
```

| オプション          | 必須  | 型      | 説明     |
|----------------|-----|--------|--------|
| `--comment-id` | YES | number | コメントID |
| `--content`    | YES | string | 更新後の本文 |

### comment delete

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" comment delete <ISSUE-KEY> --comment-id <id>
```

| オプション          | 必須  | 型      | 説明     |
|----------------|-----|--------|--------|
| `--comment-id` | YES | number | コメントID |

## JSON 出力構造

### BacklogComment（list / get / add / update の出力）

```json
{
  "id": 456,
  "content": "コメント内容（null可）",
  "createdUser": {
    "id": 100,
    "name": "山田太郎",
    "userId": "yamada"
  },
  "created": "2025-01-15T10:00:00Z",
  "updated": "2025-01-15T10:30:00Z"
}
```

### list の出力

上記 BacklogComment の配列。時系列順（古い順）。

## 注意事項

- `list` は全件取得（自動ページネーション、100件ずつ）
- コメント URL の形式: `https://<space>.backlog.com/view/<ISSUE-KEY>#comment-<id>`
- content が null のコメントは、ステータス変更等のシステムコメント

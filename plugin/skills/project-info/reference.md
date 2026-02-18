# project-info リファレンス

## タイプ別 JSON 出力構造

### statuses

```json
[
  { "id": 1, "name": "未対応" },
  { "id": 2, "name": "処理中" },
  { "id": 3, "name": "処理済み" },
  { "id": 4, "name": "完了" }
]
```

プロジェクト固有のカスタムステータスが含まれる場合あり。

### issue-types

```json
[
  { "id": 10, "name": "タスク" },
  { "id": 11, "name": "バグ" },
  { "id": 12, "name": "要望" }
]
```

### priorities

```json
[
  { "id": 2, "name": "高" },
  { "id": 3, "name": "中" },
  { "id": 4, "name": "低" }
]
```

優先度はプロジェクト共通（Backlog全体の設定）。

### resolutions

```json
[
  { "id": 0, "name": "対応済み" },
  { "id": 1, "name": "対応しない" },
  { "id": 2, "name": "無効" },
  { "id": 3, "name": "重複" },
  { "id": 4, "name": "再現しない" }
]
```

完了理由はプロジェクト共通。

### users

```json
[
  { "id": 100, "name": "山田太郎", "userId": "yamada" },
  { "id": 101, "name": "佐藤花子", "userId": "sato" }
]
```

プロジェクトに参加しているメンバーのみ。

### categories

```json
[
  { "id": 200, "name": "フロントエンド", "displayOrder": 0 },
  { "id": 201, "name": "バックエンド", "displayOrder": 1 }
]
```

### versions

```json
[
  {
    "id": 300,
    "projectId": 100,
    "name": "v1.0.0",
    "description": "初回リリース",
    "startDate": "2025-01-01T00:00:00Z",
    "releaseDueDate": "2025-03-31T00:00:00Z",
    "archived": false,
    "displayOrder": 0
  }
]
```

versions はバージョンとマイルストーンの両方を含む。

## ID 解決の早見表

| ユーザーの指定 | 取得タイプ | 検索フィールド | 使用先 |
|--------------|-----------|-------------|--------|
| ステータス名（「完了」等） | `statuses` | `name` | `--status-id` |
| 優先度名（「高」等） | `priorities` | `name` | `--priority-id` |
| 担当者名（「山田さん」等） | `users` | `name` | `--assignee-id` |
| 課題種別名（「バグ」等） | `issue-types` | `name` | `--type-id` |
| 完了理由名 | `resolutions` | `name` | `--resolution-id` |
| カテゴリ名 | `categories` | `name` | `--category-id` |
| バージョン名 | `versions` | `name` | `--version-id` |

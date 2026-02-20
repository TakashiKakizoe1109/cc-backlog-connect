# backlog-document リファレンス

## サブコマンド一覧

| サブコマンド       | 説明                   | 必須引数                                          |
|--------------|----------------------|-----------------------------------------------|
| `list`       | ドキュメント一覧             | (任意: `--project`, `--keyword`, `--count`, `--offset`) |
| `get`        | ドキュメント詳細取得           | `<documentId>`                                |
| `tree`       | ツリー構造表示              | (任意: `--project`)                             |
| `attachments`| 添付ファイルダウンロード      | `<documentId> <attachmentId> --output <path>` |
| `add`        | ドキュメント作成（write必須）    | `--title` + (`--content` or `--content-stdin`) |
| `delete`     | ドキュメント削除（write必須）    | `<documentId>`                                |

**重要:** `documentId` は **string 型**（Wiki の `wikiId: number` とは異なる）

## CLI オプション詳細

### document list

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document list [options]
```

| オプション        | 必須 | 型      | 説明                            |
|--------------|----|---------|---------------------------------|
| `--project`  | no | string  | プロジェクトキー（省略時は設定値）              |
| `--keyword`  | no | string  | タイトルの部分一致検索                    |
| `--count`    | no | number  | 取得件数                           |
| `--offset`   | no | number  | オフセット（ページネーション）                |

### document get

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document get <documentId>
```

引数: ドキュメント ID（文字列）

### document tree

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document tree [--project <key>]
```

| オプション        | 必須 | 型      | 説明               |
|--------------|----|---------|--------------------|
| `--project`  | no | string  | プロジェクトキー（省略時は設定値） |

出力: アクティブドキュメントとゴミ箱のツリー（インデントつきテキスト形式）

### document attachments

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document attachments <documentId> <attachmentId> --output <path>
```

引数: ドキュメント ID（文字列）, 添付ファイル ID（正の整数）

### document add

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document add --title <title> --content <text>
echo '<長い内容>' | node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document add --title <title> --content-stdin
```

| オプション             | 必須  | 型      | 説明                |
|-------------------|-----|---------|---------------------|
| `--project`       | no  | string  | プロジェクトキー（省略時は設定値）  |
| `--title`         | YES | string  | ドキュメントタイトル          |
| `--content`       | YES*| string  | ドキュメント内容（Markdown）  |
| `--content-stdin` | YES*| flag    | stdin から内容を読み取り      |
| `--emoji`         | no  | string  | ドキュメントに付けるemoji     |
| `--parent-id`     | no  | string  | 親ドキュメントID（文字列）      |

*`--content` または `--content-stdin` のいずれか一方が必須

### document delete

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document delete <documentId>
```

引数: ドキュメント ID（文字列）

**必ずユーザーに確認を取ってから実行すること。**

## JSON 出力構造

### BacklogDocument（list / get / add の出力）

```json
{
  "id": "abc123def456",
  "projectId": 100,
  "title": "API設計ドキュメント",
  "plain": "# API設計\n\n...",
  "statusId": 1,
  "emoji": "memo",
  "attachments": [
    {
      "id": 10,
      "name": "diagram.png",
      "size": 1024
    }
  ],
  "tags": [],
  "createdUser": {
    "id": 100,
    "name": "山田太郎",
    "userId": "yamada"
  },
  "created": "2025-01-15T10:00:00Z",
  "updatedUser": {
    "id": 100,
    "name": "山田太郎",
    "userId": "yamada"
  },
  "updated": "2025-02-01T14:30:00Z"
}
```

### document tree の出力形式

```
=== Active Documents ===
プロジェクト概要 (id: root123)
  API設計 (id: abc123)
  DB設計 (id: def456)
    テーブル定義 (id: ghi789)

=== Trash ===
（削除済みドキュメント）
```

### BacklogDocumentTree（内部構造）

```json
{
  "projectId": 100,
  "activeTree": {
    "id": "root123",
    "name": "root",
    "children": [
      {
        "id": "abc123",
        "name": "API設計",
        "emoji": "memo",
        "children": []
      }
    ]
  },
  "trashTree": {
    "id": "trash",
    "name": "trash",
    "children": []
  }
}
```

## Wiki との違い

| 項目           | Document              | Wiki                |
|--------------|----------------------|---------------------|
| ID型           | `string`（例: `"abc123"`) | `number`（例: `12345`） |
| 階層構造          | あり（ツリー）              | なし（フラット）            |
| スキル           | `backlog-document`   | `backlog-wiki`      |
| コマンド          | `document <sub>`     | `wiki <sub>`        |

## 長文コンテンツの取り扱い

`--content` オプションではシェル引数の制限に当たる場合がある。長い内容は `--content-stdin` を使用:

```bash
# ファイルから
cat content.md | node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document add --title "タイトル" --content-stdin

# ヒアドキュメントで
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" document add --title "タイトル" --content-stdin <<'EOF'
# 見出し
本文...
EOF
```

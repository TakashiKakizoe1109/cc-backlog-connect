# backlog-wiki リファレンス

## サブコマンド一覧

| サブコマンド   | 説明        | 必須引数                                          |
|----------|-----------|-----------------------------------------------|
| `list`   | Wikiページ一覧 | (任意: `--keyword`)                             |
| `get`    | ページ取得     | `<wikiId>`                                    |
| `create` | ページ作成     | `--name` + (`--content` or `--content-stdin`) |
| `update` | ページ更新     | `<wikiId>` + 更新フィールド                          |
| `delete` | ページ削除     | `<wikiId>`                                    |
| `count`  | ページ数取得    | なし                                            |

## CLI オプション詳細

### wiki list

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki list [--keyword <text>]
```

| オプション       | 必須 | 型      | 説明          |
|-------------|----|--------|-------------|
| `--keyword` | no | string | ページ名の部分一致検索 |

### wiki get

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki get <wikiId>
```

引数: Wiki ページ ID（数値）

### wiki create

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki create --name <name> --content <text>
echo '<長い内容>' | node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki create --name <name> --content-stdin
```

| オプション             | 必須   | 型      | 説明              |
|-------------------|------|--------|-----------------|
| `--name`          | YES  | string | ページ名            |
| `--content`       | YES* | string | ページ内容           |
| `--content-stdin` | YES* | flag   | stdin から内容を読み取り |
| `--mail-notify`   | no   | flag   | メール通知を送信        |

*`--content` または `--content-stdin` のいずれかが必須

### wiki update

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki update <wikiId> [options]
```

| オプション             | 必須 | 型      | 説明              |
|-------------------|----|--------|-----------------|
| `--name`          | no | string | ページ名変更          |
| `--content`       | no | string | 内容変更            |
| `--content-stdin` | no | flag   | stdin から内容を読み取り |
| `--mail-notify`   | no | flag   | メール通知を送信        |

### wiki delete

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki delete <wikiId> [--mail-notify]
```

| オプション           | 必須 | 型    | 説明       |
|-----------------|----|------|----------|
| `--mail-notify` | no | flag | メール通知を送信 |

### wiki count

```
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki count
```

引数・オプションなし。

## JSON 出力構造

### BacklogWikiPage（get / create / update の出力）

```json
{
  "id": 12345,
  "projectId": 100,
  "name": "API設計ドキュメント",
  "content": "# API設計\n\n...",
  "tags": [
    {
      "id": 1,
      "name": "設計"
    }
  ],
  "attachments": [
    {
      "id": 10,
      "name": "diagram.png",
      "size": 1024
    }
  ],
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

### list の出力

上記 BacklogWikiPage の配列。content フィールドは空文字列の場合あり（一覧では本文省略されることがある）。

### count の出力

```json
{
  "count": 15
}
```

## 長文コンテンツの取り扱い

`--content` オプションではシェル引数の制限に当たる場合がある。長い内容は `--content-stdin` を使用:

```bash
# ファイルから
cat content.md | node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki create --name "ページ名" --content-stdin

# ヒアドキュメントで
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki create --name "ページ名" --content-stdin <<'EOF'
# 見出し
本文...
EOF
```

## Wiki URL 形式

`https://<space>.backlog.com/wiki/<wikiId>`

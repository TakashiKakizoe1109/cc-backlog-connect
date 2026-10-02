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

## カスタムフィールド

`project-info custom-fields --refresh` でプロジェクト内の定義を確認します。JSON のキーはフィールドの数値 ID（文字列）、選択肢の値は `items[].id` です。同名フィールドや同名選択肢を推測して選ばず、ID を確認してください。

### 作成・更新の値

`issue create` / `issue update` に `--custom-fields '<JSON>'` を追加します。

| typeId | 型 | 値の例 |
|---|---|---|
| 1 | テキスト | `"問い合わせ元"` |
| 2 | 文章 | `"1行目\n2行目"` |
| 3 | 数値 | `0`、`2.5`（引用符を付けない） |
| 4 | 日付 | `"2026-10-02"` |
| 5 | 単一リスト | `11` |
| 6 | 複数リスト | `[11,12]` |
| 7 | チェックボックス | `[11,12]` |
| 8 | ラジオ | `11` |

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue update PROJ-123 \
  --custom-fields '{"101":"問い合わせ元","102":2.5,"103":"2026-10-02","104":[11,12]}'

# allowInput=true のリスト属性の「その他」（例: チェックボックス）
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue update PROJ-123 \
  --custom-fields '{"105":{"value":[11],"otherValue":"その他の環境"}}'

# 「その他」だけを送信
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue update PROJ-123 \
  --custom-fields '{"105":{"otherValue":"独自の環境"}}'
```

- 複数リスト/チェックボックスは単一 ID も指定可能。単一リスト/ラジオには配列を指定できません
- 「その他」オブジェクトには `value`（任意）と `otherValue`（文字列）だけを指定します。定義の `allowInput` が true の場合のみ使用可能です
- 値と「その他」は API の `customField_{id}` / `customField_{id}_otherValue` に変換します。複数値は Nulab 公式 SDK と同じ明示的な添字（`customField_{id}[0]` 等）で送信します
- 最新定義で型、日付の実在、数値/日付の上下限、選択肢 ID、課題種別への適用可否を検証します。更新で種別も変える場合は変更後の種別を使用します
- 更新対象は課題から取得した実際のプロジェクトです。設定中のプロジェクトと異なる課題キーにも対応し、別プロジェクトの定義や古い定義キャッシュで検証しません
- 未指定の値は送信しません。`{}` またはオプション省略時は従来どおり追加の定義取得も行いません。未指定の必須項目や初期値の扱い、権限・契約プランに関する最終判断は Backlog API が行います
- 任意のテキスト/文章には空文字 `""` を明示送信できます。必須テキストの空文字、`null`、空配列は拒否します。数値・日付・選択肢の値を消す操作は Backlog 画面で行ってください。空配列を黙って省略したり、未指定の項目を消したりしません
- JSON フラグの重複、誤った型、不明な ID はエラーになります。入力エラーは終了コード 1、Backlog の API エラーは既存どおり終了コード 2。API のエラー詳細を保持し、失敗した書き込みの成功扱いはしません

### 検索・件数取得・同期

`issue search` / `issue count` / `sync` に `--custom-field-filters '<JSON>'` を追加します。

| 型 | フィルタの例 | API パラメーター |
|---|---|---|
| テキスト/文章 | `{"101":"キーワード"}` | `customField_101` |
| 数値 | `{"102":{"min":0,"max":10}}` | `customField_102_min` / `_max` |
| 日付 | `{"103":{"min":"2026-10-01","max":"2026-10-31"}}` | `customField_103_min` / `_max` |
| すべての選択リスト | `{"104":[11,12]}` | `customField_104[0]` / `[1]` |

範囲は片側だけでも指定できます。`min > max`、不正な日付、空の検索文字列・配列、定義にない選択肢は拒否します。

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" issue count --custom-field-filters '{"102":{"min":0}}'
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" sync --all --custom-field-filters '{"104":[11,12]}'
```

`sync --issue` はフィルタと併用できません。同期の複数ページ取得では各ページに同じ条件を適用します。検索用の定義取得は読み取りなので read モードで利用できます。

### 取得・同期の表示

`issue get` / `search` の JSON に `customFields` がそのまま含まれます。定義側の型名は `typeId`、課題の値側は `fieldTypeId` です。`sync` の `issue.md` では `Custom Fields` セクションに名前・ID・値を出力します。選択肢は名前で表示し、数値の 0、改行、日付、「その他」、未設定値を区別します。

### 対応範囲と API 資料

既存のカスタムフィールドの値を扱う機能です。プロジェクトのフィールド定義や選択肢の作成・変更・削除は行いません。

- [定義一覧](https://developer.nulab.com/docs/backlog/api/2/get-custom-field-list/)
- [課題の追加](https://developer.nulab.com/docs/backlog/api/2/add-issue/) / [更新](https://developer.nulab.com/docs/backlog/api/2/update-issue/)
- [課題一覧の検索](https://developer.nulab.com/docs/backlog/api/2/get-issue-list/) / [件数取得](https://developer.nulab.com/docs/backlog/api/2/count-issue/)
- [公式 SDK のカスタムフィールド配列のエンコード](https://github.com/nulab/backlog-js/blob/master/src/request.ts)

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
| `custom-fields.json` | カスタムフィールド定義（参照用。書き込み・検索では最新定義を取得） | `project-info custom-fields` 実行時 |
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

---
name: backlog-wiki
description: |
  Backlog Wiki操作のプロアクティブSkill。Wikiページの一覧・取得・作成・更新・削除・件数取得に対応。
  Use when user mentions "Backlog Wiki", references a wiki page by name,
  or wants to read/create/update wiki documentation in Backlog.
  Use when user says "Backlog Wiki xxxを参考に", "Wikiを見せて", "Wikiに書いて",
  "Wikiを更新して", "Backlogのドキュメント", "Wiki一覧", "Wiki数".
  Also triggers on patterns like "Wikiの「ページ名」を確認", "設計ドキュメントを参照".
  Supports: list, get, create, update, delete, count subcommands.
  Supports --content-stdin for long content via pipe.
  Do NOT use for local markdown files or non-Backlog documentation.
---

Backlog Wiki を操作するスキルです。

## 事前チェック

**まず `.cc-backlog/config.json` が存在するか確認してください。**

存在しない場合は、操作を実行せず以下のように案内してください:

> Backlog の接続設定がまだ行われていません。先に `/cc-backlog-connect:config` を実行して設定してください。

## 実行方法

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki <subcommand> [options]
```

## 動作パターン

### パターン1: Wiki参照（最頻出）

ユーザーが「Backlog Wiki 設計ドキュメント を参考にして」と言った場合:

1. キーワード検索:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki list --keyword "設計ドキュメント"
   ```
2. 該当ページの wikiId を特定（複数候補がある場合はユーザーに選択させる）
3. コンテンツ取得:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki get <wikiId>
   ```
4. 取得した content をコンテキストとして保持し、後続の作業に活用

### パターン2: Wiki一覧表示

```bash
# 全一覧
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki list

# キーワードフィルター
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki list --keyword "API"
```

JSON出力をユーザーに分かりやすく表示:
- ページ名、ID、最終更新日の一覧

### パターン3: Wiki作成

ユーザーが「この内容をBacklog Wikiに書いて」と言った場合:

1. ページ名をユーザーに確認
2. 内容を整形
3. 実行:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki create --name "ページ名" --content "内容"
   ```
   内容が長い場合はstdin経由:
   ```bash
   echo '内容' | node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki create --name "ページ名" --content-stdin
   ```
4. 作成されたWikiのURLを表示

### パターン4: Wiki更新

ユーザーが「Wiki の「API設計」を更新して」と言った場合:

1. 検索してページ特定:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki list --keyword "API設計"
   ```
2. 現在の内容を取得:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki get <wikiId>
   ```
3. 更新内容をユーザーに確認
4. 実行:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki update <wikiId> --content "更新内容"
   ```
   内容が長い場合はstdin経由:
   ```bash
   echo '更新内容' | node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki update <wikiId> --content-stdin
   ```

### パターン5: コンテキスト参照（プロアクティブ）

ユーザーが「Backlog Wiki の命名規則に従って実装して」と言った場合:

1. "命名規則" でWikiを検索
2. 内容を取得してコンテキストとして保持
3. そのルールに従ってコード実装を進める

### パターン6: Wiki削除

**必ずユーザーに確認を取ってから実行してください。**

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki delete <wikiId>
```

### パターン7: Wiki数取得

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" wiki count
```

## 注意事項

- Wikiページ名は部分一致検索（`--keyword`）で柔軟に検索
- 複数候補がある場合はユーザーに選択させる
- 取得したWikiコンテンツはそのまま作業コンテキストとして活用可能
- 削除前は必ずユーザー確認を取る
- content が長い場合は要約してから全文を提示
- Wiki の内容には Backlog 独自の Markdown 記法が含まれる場合があるため、そのまま保持して解釈

## 詳細リファレンス

- 全サブコマンドの完全なオプション一覧、JSON出力構造は [reference.md](reference.md) を参照

---
name: project-info
description: |
  Backlogプロジェクトメタデータ参照のプロアクティブSkill。
  ステータス・種別・優先度・完了理由・メンバー・カテゴリ・バージョンの一覧取得に対応。
  Use when user asks about Backlog project settings, issue types, statuses, priorities,
  members, categories, or versions.
  Use when user says "Backlogの種別一覧", "担当者は誰がいる？", "ステータス一覧",
  "優先度の種類", "カテゴリ一覧", "バージョン一覧", "マイルストーン", "完了理由".
  Also used internally by backlog-issue skill to resolve human-readable names to IDs.
  Do NOT use for general project management questions unrelated to Backlog metadata.
---

Backlog プロジェクトのメタデータ（ステータス、種別、優先度、メンバー等）を参照するスキルです。

## 事前チェック

**まず `.cc-backlog/config.json` が存在するか確認してください。**

存在しない場合は、操作を実行せず以下のように案内してください:

> Backlog の接続設定がまだ行われていません。先に `/cc-backlog-connect:config` を実行して設定してください。

## 実行方法

```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" project-info <type>
```

## 利用可能なタイプ

| タイプ | 説明 | コマンド |
|--------|------|----------|
| `statuses` | 課題ステータス一覧 | `node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" project-info statuses` |
| `issue-types` | 課題種別一覧 | `node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" project-info issue-types` |
| `priorities` | 優先度一覧 | `node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" project-info priorities` |
| `resolutions` | 完了理由一覧 | `node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" project-info resolutions` |
| `users` | プロジェクトメンバー一覧 | `node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" project-info users` |
| `categories` | カテゴリ一覧 | `node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" project-info categories` |
| `versions` | バージョン/マイルストーン一覧 | `node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" project-info versions` |

## 出力形式

全タイプ共通で JSON 配列を出力します。各要素には最低限 `id` と `name` フィールドが含まれます。

ユーザーに表示する際は、テーブル形式等で見やすく整形してください。

## 他のSkillからの利用

このコマンドは、backlog-issue スキルや backlog-comment スキルからID解決のために内部的に利用されます。

例: ユーザーが「ステータスを完了にして」と言った場合
1. `project-info statuses` でステータス一覧を取得
2. "完了" に一致する id を特定
3. `issue update PROJ-123 --status-id <id>` で更新

## 詳細リファレンス

- 各タイプのJSON出力構造の詳細は [reference.md](reference.md) を参照

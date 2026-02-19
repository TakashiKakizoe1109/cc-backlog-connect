# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.3.0] - 2026-02-19

### Changed
- `sync` コマンドのインタラクティブモードを改善: 同期範囲選択（1-4）の後に自然言語でフィルターを追加指定できるように変更（例:「田中さん担当のバグ」→ `--assignee 田中 --type バグ` に自動変換）

### Added
- メタデータキャッシュシステム（`.cc-backlog/` に8種の JSON キャッシュ: statuses, issue-types, priorities, resolutions, users, categories, versions, project）
- 名前ベースフラグ（`--status "完了"`, `--type "タスク"`, `--priority "中"`, `--assignee "yamada"` 等）: issue/sync コマンドで API 往復なしに ID 解決可能
- `project-info --refresh` で明示的キャッシュ更新（デフォルトはキャッシュファースト）
- 検索フィルター全網羅: `--version`/`--version-id`（発生バージョン）, `--priority`/`--priority-id`（優先度）, `--created-user`/`--created-user-id`（登録者）, `--resolution`/`--resolution-id`（完了理由）, `--parent-child`（親子関係: 0=全て 1=子課題以外 2=子課題のみ 3=どちらでもない 4=親課題のみ）を `sync` / `issue search` / `issue count` に追加

### Performance
- `sync` コマンドで課題ごとの添付ファイルとコメント取得を直列から並列（`Promise.all`）に変更

### Fixed
- `sync --status-id` フィルターが無視されるバグを修正（SyncOptions に statusId を追加、index.ts でパラメータを渡すよう修正）
- コマンド成功後にプロセスがハングするバグを修正（Node.js fetch のコネクションプールによるもの; `process.exit(0)` を追加）

### Security
- `.gitignore` に `.cc-backlog/` を追加（APIキーを含む config.json の誤コミット防止）
- `saveConfig` および `writeCache` のファイル書き込み時に `mode: 0o600` を設定（所有者のみ読み書き可能）

## [0.2.1] - 2026-02-18

### Fixed
- sync コマンドから不要な `assertWriteMode` ガードを削除（read モードでも同期可能に）

### Added
- backlog-issue Skill に sync パターンを追加（「同期したい」「課題を落として」等で sync が実行可能に）

## [0.2.0] - 2026-02-18

### Added
- Read/write mode（デフォルト read、書き込み操作の安全ガード）
- issue search/count フィルタ（--type-id, --category-id, --milestone-id, --assignee-id）
- sync コマンドフィルタ（--type-id, --category-id, --milestone-id, --assignee-id, --keyword）
- 全コマンドの包括的テストスイート（135テスト）
- テスト配置を co-located（ソース隣接）に移行

## [0.1.0] - 2026-02-18

### Added
- 初回リリース（issue/comment/wiki/sync/project-info）

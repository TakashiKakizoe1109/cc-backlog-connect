# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.4.0] - 2026-02-20

### Added
- **Document API 対応**: `document` コマンドを新規追加（list, get, tree, attachments, add, delete サブコマンド）
- **backlog-document スキル**: Backlog 階層型ドキュメント操作のプロアクティブ Skill（`plugin/skills/backlog-document/`）
- **`project-info --rate-limit`**: 現在のレート制限状況（Read/Update/Search/Icon）を表示するフラグを追加
- **`getRateLimit()` API メソッド**: `GET /api/v2/rateLimit` を呼び出す新メソッド

### Improved
- **エラーハンドリング強化**: Backlog の 13 種エラーコードを名前（`InternalError`, `NoResourceError` 等）に変換して表示; `errors[].moreInfo` も付記
- **レート制限設計の刷新**:
  - プロアクティブスロットリング: Remaining ≤ 5 になったら Reset タイムスタンプまで事前に待機（429 を積極回避）
  - 429 発生時の待機を `X-RateLimit-Reset` ヘッダーの実際の値に基づいて計算（従来は固定 60 秒）
  - 最大リトライ回数を 3 回に制限（無限ループ防止）

### Types
- `BacklogRateLimit`, `BacklogRateLimitCategory` 型を追加
- `BacklogDocument`, `BacklogDocumentNode`, `BacklogDocumentTree` 型を追加（`documentId` は string 型）

### Fixed
- `X-RateLimit-Reset` ヘッダが数値に変換できない文字列（例: `"abc"`, 空文字）だった場合に `setTimeout(resolve, NaN)` が即時実行されるバグを修正: `Number.isFinite()` 検証を追加し、無効値は 60 秒フォールバックを使用
- read カテゴリ（GET）のレート制限残量低下が update カテゴリ（POST/PATCH/DELETE）の呼び出しをブロックするバグを修正: レート制限状態を `"read"` / `"update"` カテゴリ別に独立管理するよう変更
- `document add` コマンドで `--title` や `--content` / `--content-stdin` が未指定のままプロジェクト取得・API 呼び出しを実行してしまうバグを修正: `assertWriteMode` 直後に早期バリデーションを追加

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

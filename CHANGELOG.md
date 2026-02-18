# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

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

# cc-backlog-connect - Backlog × Claude Code 連携プラグイン

![License](https://img.shields.io/badge/license-MIT-green)

Nulab Backlog の課題・コメント・Wiki を Claude Code から直接操作できる Claude Code CLI プラグイン。  
Backlog API を介して課題の参照・作成・更新・同期を行い、AI コーディングアシスタントにプロジェクト管理のコンテキストを与えます。

## cc-backlog-connect とは

cc-backlog-connect は、[Nulab Backlog](https://backlog.com/) と [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) を接続する Claude Code CLI プラグインです。  
開発中に Backlog
の課題・コメント・Wiki を離れることなく参照・操作できるため、コンテキストスイッチを削減し、AI 支援の開発ワークフローを効率化します。

## 特徴

- **課題の CRUD 操作** — Backlog 課題の取得・作成・更新・削除・検索をコマンドラインから実行
- **高度なフィルタリング** — 種別・カテゴリー・マイルストーン・担当者・キーワードで課題を絞り込み検索
- **コメント管理** — 課題へのコメント追加・一覧・更新・削除を Claude Code 内で完結
- **Wiki 操作** — Backlog Wiki ページの閲覧・作成・編集をターミナルから直接実行
- **ローカル同期** — Backlog 課題を Markdown ファイルとしてローカルに同期（フィルタ付き同期対応）
- **Read/Write モード** — デフォルト read モードで書き込み操作を安全にガード。明示的に write モードを有効化して操作
- **プロアクティブ Skills** — 会話中に課題キー（例: `PROJ-123`）や Wiki ページ名を言及するだけで、自動的に Backlog API から情報を取得
- **プロジェクト単位の設定** — プロジェクトごとに異なる Backlog スペースへ接続可能

## なぜ必要か

開発タスクの仕様や議論は Backlog の課題・コメントに集約されています。  
しかし Claude Code はローカルファイルの読み書きは得意でも、外部の Backlog API に直接アクセスすることはできません。

cc-backlog-connect を導入すると:

1. **Backlog の課題情報をローカル Markdown に同期** — Claude Code が自然に仕様・議論を参照可能に
2. **CLI から Backlog を直接操作** — ブラウザを開かずに課題の作成・ステータス更新・コメント追加
3. **プロアクティブ Skills で自動取得** — 「PROJ-123 を確認して」と言うだけで課題情報を即座に表示

## インストール

### 1. Claude Code プラグインとして登録

```bash
/plugin marketplace add TakashiKakizoe1109/cc-backlog-connect
/plugin install cc-backlog-connect
```

登録後、Claude Code 内でスラッシュコマンドとプロアクティブ Skills が使用可能になります。

依存関係のインストールとビルドは SessionStart フックで自動実行されます（`smart-install.sh`）。  
加えて、`cc-backlog` 実行時にも同チェックを行うため、SessionStart が未実行でも初回利用時に自己復旧します。  
バージョン変更やソース更新時のみ再実行されるため、セッション起動への影響は最小限です。

### 2. Backlog API 接続設定

Claude Code 内で `/cc-backlog-connect:config` を実行し、Backlog スペースの接続情報を設定します:

```
set --space <スペース名> --api-key <APIキー> --project-key <プロジェクトキー> --mode <read|write>
```

| パラメータ         | 説明                              | 例                                                   |
|---------------|---------------------------------|-----------------------------------------------------|
| `space`       | Backlog スペース名                   | `test-company` → `https://test-company.backlog.com` |
| `api-key`     | Backlog API キー（個人設定 > API から発行） | —                                                   |
| `project-key` | 対象プロジェクトキー                      | `PROJ`                                              |
| `mode`        | 操作モード（デフォルト: `read`）            | `read`（読み取りのみ） / `write`（書き込み許可）                     |

> **安全ガード**: デフォルトは `read` モードです。課題の作成・更新・削除、コメントの追加、Wiki の編集、同期を行うには `write` モードを有効にしてください。

設定は `{プロジェクトルート}/.cc-backlog/config.json` に保存されます。API キーを含むため、`.gitignore` に追加してください。

## 使い方

### スラッシュコマンド（Claude Code 内で実行）

```
/cc-backlog-connect:config                  # Backlog API 接続設定
/cc-backlog-connect:sync                    # 未完了の課題をローカルに同期
/cc-backlog-connect:sync --all              # 完了済みを含む全課題を同期
/cc-backlog-connect:sync --issue PROJ-123   # 特定の課題のみ同期
/cc-backlog-connect:sync --type-id 10       # 種別で絞り込み同期
/cc-backlog-connect:sync --assignee-id 100  # 担当者で絞り込み同期
/cc-backlog-connect:sync --keyword "検索語"   # キーワードで絞り込み同期
```

### プロアクティブ Skills — 会話中の自動 Backlog 連携

プロアクティブ Skills を使えば、Claude Code との会話の中で自然に Backlog の情報を取得・操作できます。課題キーや操作意図を含む発言を検知し、適切な Backlog API を自動実行します。

| 発言例                            | 発動する Skill      | 実行される操作        |
|--------------------------------|-----------------|----------------|
| 「PROJ-123 の課題を見せて」             | backlog-issue   | 課題の詳細を取得       |
| 「ステータスを完了にして」                  | backlog-issue   | 課題ステータスを更新     |
| 「バグの課題を種別で検索して」                | backlog-issue   | フィルタ付き課題検索     |
| 「PROJ-123 にコメントして」             | backlog-comment | 課題にコメントを追加     |
| 「Backlog Wiki の設計ドキュメントを参考にして」 | backlog-wiki    | Wiki ページを取得    |
| 「Backlog の種別一覧を見せて」            | project-info    | プロジェクトメタデータを取得 |

## 同期データの出力フォーマット

`cc-backlog sync` で同期された課題は、プロジェクトルート配下に Markdown ファイルとして出力されます。Claude Code はこれらのファイルを自動的にコンテキストとして参照できます。

`sync` 実行時に、**プラグイン利用先プロジェクト**の `docs/backlog/.gitignore`（`*\n!.gitignore`）を自動生成するため、Backlog 同期ファイルの誤コミットを防ぎます。

### 課題ファイル — `docs/backlog/{PROJ-123}/issue.md`

```markdown
# [PROJ-123] 課題タイトル

- **URL**: https://test-company.backlog.com/view/PROJ-123
- **Status**: In Progress
- **Type**: Task
- **Priority**: Normal
- **Assignee**: Takashi Kakizoe
- **Created**: 2026-02-18
- **Updated**: 2026-02-18

## Description

課題の説明文
```

### コメントファイル — `docs/backlog/{PROJ-123}/comments.md`

```markdown
# Comments: [PROJ-123] 課題タイトル

## Takashi Kakizoe (2026-02-18 10:30)

コメント内容

---

## Another User (2026-02-18 14:00)

別のコメント
```

### 同期の挙動

| 状況       | 挙動                                                    |
|----------|-------------------------------------------------------|
| 初回同期     | 全対象課題を取得し `docs/backlog/` に書き出し                        |
| 2 回目以降   | 既存ファイルはスキップ（`--force` で上書き可能）                          |
| 単一課題指定   | `--issue PROJ-123` で特定課題のみ取得                           |
| フィルタ同期   | `--type-id`, `--category-id`, `--milestone-id`, `--assignee-id`, `--keyword` で絞り込み |
| マークアップ変換 | Backlog 独自マークアップは変換せずそのまま保存                            |

## 対応する Backlog API

cc-backlog-connect は [Nulab Backlog API](https://developer.nulab.com/docs/backlog/) の以下のエンドポイントを使用しています:

- 課題（Issues）: 取得 / 作成 / 更新 / 削除 / 検索 / 件数取得
- コメント（Comments）: 一覧 / 追加 / 取得 / 更新 / 削除
- Wiki: 一覧 / 取得 / 作成 / 更新 / 削除 / 件数取得
- プロジェクト情報: ステータス / 種別 / 優先度 / 完了理由 / ユーザー / カテゴリ / バージョン

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## Security

[SECURITY.md](SECURITY.md) を参照してください。

## ライセンス

[MIT](LICENSE)

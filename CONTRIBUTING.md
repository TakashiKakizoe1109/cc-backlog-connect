# Contributing to cc-backlog-connect

Thank you for your interest in contributing!

## Tech Stack

- TypeScript (ES2022 / CommonJS)
- Node.js 18+ (外部依存なし、fetch/fs/path すべて組み込み)
- dev 依存: `typescript`, `@types/node`, `vitest`

## Development Setup

```bash
git clone https://github.com/TakashiKakizoe1109/cc-backlog-connect.git
cd cc-backlog-connect/plugin
npm install
npm run build
```

## Project Structure

```
cc-backlog-connect/
├── .claude-plugin/
│   └── marketplace.json          # マーケットプレイス定義
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   ├── feature_request.yml
│   │   └── config.yml
│   └── workflows/
│       └── ci.yml                # CI (build + test)
├── .gitignore
├── LICENSE
├── README.md
├── SECURITY.md
├── CONTRIBUTING.md
├── docs/
│   └── backlog-api/
│       └── endpoints.md          # Backlog API エンドポイントカタログ
└── plugin/                       # Claude Code プラグイン（自己完結）
    ├── .claude-plugin/
    │   └── plugin.json           # プラグインマニフェスト
    ├── package.json
    ├── tsconfig.json
    ├── vitest.config.ts
    ├── src/                      # TypeScript ソース
    │   ├── index.ts              # CLI エントリーポイント・ルーティング
    │   ├── commands/
    │   │   ├── config.ts         # config コマンド
    │   │   ├── sync.ts           # sync コマンド（ローカル同期）
    │   │   ├── issue.ts          # issue コマンド（課題 CRUD）
    │   │   ├── comment.ts        # comment コマンド（コメント CRUD）
    │   │   ├── project-info.ts   # project-info コマンド（メタデータ取得）
    │   │   └── wiki.ts           # wiki コマンド（Wiki CRUD）
    │   ├── api/
    │   │   ├── client.ts         # Backlog API クライアント（GET/POST/PATCH/DELETE）
    │   │   └── types.ts          # API レスポンス・リクエスト型定義
    │   ├── config/
    │   │   ├── loader.ts         # 設定ファイルの読み書き
    │   │   └── types.ts          # Config 型定義
    │   └── markdown/
    │       ├── issue.ts          # 課題 → issue.md フォーマッタ
    │       └── comments.ts       # コメント → comments.md フォーマッタ
    ├── tests/                    # Vitest テスト
    │   ├── api-client-write.test.ts    # POST/PATCH/DELETE テスト
    │   ├── api-client-wiki.test.ts     # Wiki API テスト
    │   ├── api-client-metadata.test.ts # メタデータ API テスト
    │   ├── markdown-issue.test.ts
    │   ├── markdown-comments.test.ts
    │   ├── config-loader.test.ts
    │   └── parse-args.test.ts
    ├── dist/                     # ビルド出力（gitignore）
    ├── commands/                  # Claude Code スラッシュコマンド
    │   ├── config.md             # /cc-backlog-connect:config スラッシュコマンド
    │   └── sync.md               # /cc-backlog-connect:sync スラッシュコマンド
    ├── skills/                    # プロアクティブ Skills（モデル自動発動）
    │   ├── backlog-issue/
    │   │   └── SKILL.md          # 課題操作 Skill
    │   ├── backlog-comment/
    │   │   └── SKILL.md          # コメント操作 Skill
    │   ├── backlog-wiki/
    │   │   └── SKILL.md          # Wiki操作 Skill
    │   └── project-info/
    │       └── SKILL.md          # メタデータ参照 Skill
    ├── hooks/
    │   └── hooks.json            # SessionStart フック定義
    └── scripts/
        ├── cc-backlog.sh         # シェルラッパー
        └── smart-install.sh      # 自動 install & build
```

## Code Style

- **Language**: TypeScript with `strict: true`
- **Module**: CommonJS (`"module": "commonjs"`)
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat:`, `fix:`, `docs:`)

## Testing

Vitest でユニットテストを実行する。

```bash
cd plugin
npm test
```

テスト対象モジュール:

- `api/client.ts` — Backlog API クライアント（GET/POST/PATCH/DELETE、レート制限、エラーハンドリング）
- `markdown/issue.ts` — 課題 → Markdown 変換
- `markdown/comments.ts` — コメント → Markdown 変換
- `config/loader.ts` — `maskApiKey`, `findProjectRoot`
- `index.ts` — CLI 引数パーサー (`parseArgs`)

## Before Submitting a PR

1. Ensure the build succeeds: `npm run build`
2. Ensure all tests pass: `npm test`
3. Do **not** commit files containing API keys or credentials
4. Do **not** commit the `node_modules/` or `dist/` directories

## Security

If you discover a security vulnerability, please **do not** open a public issue. See [SECURITY.md](SECURITY.md) for reporting instructions.

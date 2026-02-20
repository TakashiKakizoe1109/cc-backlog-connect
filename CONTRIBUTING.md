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
│   └── banner.png                # README バナー画像
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
    │   │   ├── project-info.ts   # project-info コマンド（メタデータ取得・レート制限）
    │   │   ├── wiki.ts           # wiki コマンド（Wiki CRUD）
    │   │   ├── document.ts       # document コマンド（Document CRUD）
    │   │   └── *.test.ts         # 各コマンドのユニットテスト（コロケーション）
    │   ├── api/
    │   │   ├── client.ts         # Backlog API クライアント（GET/POST/PATCH/DELETE）
    │   │   ├── types.ts          # API レスポンス・リクエスト型定義
    │   │   └── client-*.test.ts  # API クライアントのユニットテスト
    │   ├── cache/
    │   │   └── metadata.ts       # メタデータキャッシュ（.cc-backlog/）
    │   ├── config/
    │   │   ├── loader.ts         # 設定ファイルの読み書き
    │   │   ├── guard.ts          # write モードガード
    │   │   └── types.ts          # Config 型定義
    │   └── markdown/
    │       ├── issue.ts          # 課題 → issue.md フォーマッタ
    │       └── comments.ts       # コメント → comments.md フォーマッタ
    ├── dist/                     # ビルド出力（gitignore）
    ├── commands/                  # Claude Code スラッシュコマンド
    │   ├── config.md             # /cc-backlog-connect:config スラッシュコマンド
    │   └── sync.md               # /cc-backlog-connect:sync スラッシュコマンド
    ├── skills/                    # プロアクティブ Skills（モデル自動発動）
    │   ├── backlog-issue/
    │   │   ├── SKILL.md          # 課題操作 Skill
    │   │   └── reference.md
    │   ├── backlog-comment/
    │   │   ├── SKILL.md          # コメント操作 Skill
    │   │   └── reference.md
    │   ├── backlog-wiki/
    │   │   ├── SKILL.md          # Wiki 操作 Skill
    │   │   └── reference.md
    │   ├── backlog-document/
    │   │   ├── SKILL.md          # Document 操作 Skill
    │   │   └── reference.md
    │   └── project-info/
    │       ├── SKILL.md          # メタデータ参照 Skill
    │       └── reference.md
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

**TDDで開発** Red → Green → Refactor の順序を守る。

```bash
cd plugin
npm test
```

テストファイルはソースファイルとコロケーション（同じディレクトリに配置）:

| テストファイル | 対象 |
|---|---|
| `src/api/client-write.test.ts` | POST/PATCH/DELETE、エラー処理、リトライ |
| `src/api/client-metadata.test.ts` | メタデータ取得 API |
| `src/api/client-wiki.test.ts` | Wiki API |
| `src/api/client-document.test.ts` | Document API・getRateLimit |
| `src/commands/issue.test.ts` | issue コマンド |
| `src/commands/comment.test.ts` | comment コマンド |
| `src/commands/wiki.test.ts` | wiki コマンド |
| `src/commands/document.test.ts` | document コマンド |
| `src/commands/project-info.test.ts` | project-info コマンド（`--rate-limit` 含む） |
| `src/commands/sync.test.ts` | sync コマンド |
| `src/cache/metadata.test.ts` | キャッシュ読み書き |
| `src/config/loader.test.ts` | 設定ファイル操作 |
| `src/index.test.ts` | CLI 引数パーサー |

fetch モックには必ず `headers: new Headers()` を含めること:

```typescript
// 正しいモック
function mockOkJson(data: unknown) {
  return { ok: true, headers: new Headers(), json: async () => data };
}
// headers なしは NG（client.ts が response.headers.get() を呼ぶため）
fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => data });
```

## Before Submitting a PR

1. テストを先に書く（Red → Green → Refactor）
2. Ensure the build succeeds: `npm run build`
3. Ensure all tests pass: `npm test`
4. Do **not** commit files containing API keys or credentials
5. Do **not** commit the `node_modules/` or `dist/` directories

## Security

If you discover a security vulnerability, please **do not** open a public issue. See [SECURITY.md](SECURITY.md) for reporting instructions.

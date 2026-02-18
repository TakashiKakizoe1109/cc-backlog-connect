Backlog の接続設定を行います。

## 手順

1. まず `.cc-backlog/config.json` が存在するか確認してください。

2. **設定ファイルが存在しない場合**（初回セットアップ）:
   ユーザーに以下の 3 つの値を順番に質問してください:
   - **Backlog スペース名**: `https://<スペース名>.backlog.com` の `<スペース名>` 部分（例: `test-company`）
   - **API キー**: Backlog の個人設定 > API から発行できるキー
   - **プロジェクトキー**: 対象プロジェクトのキー（例: `PROJ`）。Backlog プロジェクトの URL に含まれる英大文字の識別子

3. **設定ファイルが存在する場合**:
   現在の設定内容を表示してください（API キーは先頭4文字と末尾4文字以外をマスク）。
   ユーザーが変更したい場合は、変更したい値だけ質問してください。

4. 値が揃ったら、以下のコマンドで設定を保存してください:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/scripts/cc-backlog.sh" config set --space <スペース名> --api-key <APIキー> --project-key <プロジェクトキー>
```

上記が失敗する場合は直接実行してください:
```bash
node "${CLAUDE_PLUGIN_ROOT}/dist/index.js" config set --space <スペース名> --api-key <APIキー> --project-key <プロジェクトキー>
```

5. 設定保存後、`.cc-backlog/config.json` が `.gitignore` に含まれているか確認し、含まれていなければ追加を提案してください。

## $ARGUMENTS

ユーザーが引数を渡した場合（例: `set --space foo --api-key bar --project-key BAZ`）は、質問せずにそのまま実行してください。

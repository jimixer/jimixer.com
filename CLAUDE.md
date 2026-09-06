# jimixer.com

VRChat で撮影した写真を公開する個人サイト。静的サイト（`website`）を S3 + CloudFront で配信し、
写真はローカル専用の管理ツール（`gallery-manager`）から追加する。

用語は [CONTEXT.md](./CONTEXT.md) に定義がある。「アバター」「バリアント」「原本」「派生物」は
すべて意味が決まっているので、コードにもコメントにもこの語を使うこと。

## AWS を触るときは direnv を通す

このリポジトリの AWS 操作は `.envrc`（git 管理外）が設定する `AWS_PROFILE=jimixer-gallery` を
前提とする。シェルに direnv のフックが無い環境（エージェントのセッションを含む）では
読み込まれず、`default` プロファイルに落ちて 403 になるか、意図しない資格情報で
書き込むことになる。

```bash
direnv exec . npm run gallery:upload-derivatives
direnv exec . npm run dev:gallery
direnv exec . aws s3 ls s3://gallery.jimixer.com/gallery/
```

資格情報は IAM Identity Center の短命なもので、恒久的なアクセスキーは無い。
`Error loading SSO Token` が出たらセッション切れなので `aws sso login --sso-session jimixer`。

**既定のプロファイルは意図的に狭い。** 原本の読み出しも削除も、CloudFormation も持たない。
広い権限が要るコマンドは、呼び出し側の環境ではなく**コマンド自身が `--profile` で宣言する**。

```bash
direnv exec . npm run deploy:infra   # 中で --profile jimixer-admin を指定している
```

`AWS_PROFILE=jimixer-admin direnv exec . ...` のような前置きは効かない。`direnv exec` は
.envrc を読む前に direnv の状態を巻き戻すので、前置きした値も一緒に破棄される。

権限が足りずに 403 が出たとき、**まず疑うのは権限であってコードではない**。
どの API にどの権限が要るかは [docs/aws-credentials.md](./docs/aws-credentials.md) にある。
`.envrc` が無ければ `.envrc.example` をコピーして `direnv allow`。

## ワークスペース

| | 役割 |
|---|---|
| `packages/gallery-schema` | 型・URL 導出・スキーマ検証・派生物の生成。website と gallery-manager が共有する契約 |
| `website` | 公開サイト（Next.js `output: 'export'`） |
| `gallery-manager` | 写真の追加・削除。ローカル専用 |
| `infrastructure` | AWS CDK |
| `scripts/` | 移行と一括処理。`tsx` で実行する |

## 決まっていること

設計上の決定は [docs/gallery-architecture.md](./docs/gallery-architecture.md) と
[docs/adr/](./docs/adr/) にある。特に次の3つは変更前に ADR を読むこと。

- メタデータは**画像別 sidecar**（`website/content/gallery/{variant}/*.yml`）で、**git が真実**。
  index はビルド時に組み立てる生成物であり、コミットしない
- 写真の identity は**不透明な `photoId`**。URL・S3 キー・ファイル名はすべてそこから導出する
- **原本の保管が公開の事前条件**。原本は不変で、写真を降ろしても削除しない

「やらないと決めたこと」は docs/gallery-architecture.md §7 にある。実装前に目を通すこと。

## 確認

```bash
npm test                                   # gallery-schema と gallery-manager
npm run gallery:validate                   # コンテンツの検証（AWS 不要。CI でも走る）
npm run build --workspace=website          # 静的書き出しまで通す

direnv exec . npm run gallery:check        # sidecar ⇔ S3 の突き合わせ（AWS 読み取りが要る）
```

# jimixer.com

VRChat で撮影した写真を公開する個人サイト。静的サイト（`website`）を S3 + CloudFront で配信し、
写真はローカル専用の管理ツール（`gallery-manager`）から追加する。

用語は [CONTEXT.md](./CONTEXT.md) に定義がある。「アバター」「バリアント」「原本」「派生物」は
すべて意味が決まっているので、コードにもコメントにもこの語を使うこと。

## AWS を触るとき

**npm script は自分でプロファイルを宣言する。** AWS を触るスクリプトは
`AWS_PROFILE=${AWS_GALLERY_PROFILE:-jimixer-gallery}` を自分で前置きするので、
direnv のフックが無い環境（エージェントのセッションを含む）でもそのまま動く。

```bash
npm run dev:gallery
npm run gallery:upload-derivatives
npm run gallery:check
```

**宣言を持たないのは、生の `aws` CLI と `npx tsx` の直呼び。** こちらは `.envrc` が
読み込まれていないと `default` プロファイルに落ちて 403 になるか、意図しない資格情報で
書き込むことになる。direnv を通すこと。

```bash
direnv exec . aws s3 ls s3://gallery.jimixer.com/gallery/
```

資格情報は IAM Identity Center の短命なもので、恒久的なアクセスキーは無い。
`Error loading SSO Token` が出たらセッション切れなので `aws sso login --sso-session jimixer`。

**既定のプロファイルは意図的に狭い。** 原本の読み出しも削除も、CloudFormation も持たない。
広い権限が要るコマンドも、呼び出し側の環境ではなく**コマンド自身が宣言する**。

```bash
direnv exec . npm run deploy:infra   # 中で --profile jimixer-admin を指定している
```

`deploy:infra` に direnv が要るのはプロファイルのためではなく、CDK が `.envrc` の
`AWS_ACCOUNT_ID` と `CERTIFICATE_ARN` を読むためである。

プロファイルを差し替えたいときに `AWS_PROFILE=... npm run ...` と前置きしても効かない。
スクリプトが上書きするので、`AWS_GALLERY_PROFILE` か `AWS_ADMIN_PROFILE` を使う。

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

npm run gallery:check                      # sidecar ⇔ S3 の突き合わせ（AWS 読み取りが要る）
```

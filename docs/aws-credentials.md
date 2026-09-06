# AWS 認証情報

このリポジトリが AWS を触る経路は 2 つある。**必要な権限はそれぞれ違う**ので、
同じ資格情報を使い回さない。

| 経路 | 資格情報 | 用途 |
|---|---|---|
| ローカルの日常操作 | Identity Center の権限セット `JimixerComGalleryOps`（プロファイル `jimixer-gallery`） | gallery-manager、`scripts/` の一括処理 |
| ローカルの管理操作 | Identity Center の `AdministratorAccess`（プロファイル `jimixer-admin`） | CDK デプロイなど、明示的に必要なときだけ |
| GitHub Actions | OIDC で引き受ける IAM ロール（**鍵を置かない**） | `deploy.yml` / `daily-rebuild.yml`（サイトの同期と CloudFront の無効化） |

## なぜ分けるか

`deploy.yml` はサイトの静的ファイルを置くだけで、**ギャラリーの画像にも原本にも触らない**。
逆にローカルの操作は原本を扱う。CI に原本バケットへの権限を渡す理由が無いので渡さない。

## ローカル

**恒久的なアクセスキーは置かない。** IAM Identity Center にログインして、
権限セットに対応する短命な資格情報を得る。

```bash
aws sso login --sso-session jimixer
```

プロファイルは 2 つある。既定は狭いほうで、広いほうは明示的に指定したときだけ使う。

| プロファイル | 権限セット | 使うとき |
|---|---|---|
| `jimixer-gallery` | `JimixerComGalleryOps` | 既定。`.envrc` が設定する |
| `jimixer-admin` | `AdministratorAccess` | `npm run deploy:infra` が `--profile` で自分で指定する |

分ける値打ちは、漏洩したときの被害を減らすことだけではない。**危険な操作に明示的な
一手を要求する**ことにある。既定が管理者だと、`direnv exec .` を通した全コマンド —
gallery-manager のローカルサーバーも、エージェントが走らせるスクリプトも — が
管理者として動く。

広い権限が要るコマンドは、呼び出し側の環境ではなく**コマンド自身が `--profile` で
宣言する**（`infrastructure/package.json` の `deploy`）。`AWS_PROFILE=jimixer-admin
direnv exec . ...` という前置きは効かない — `direnv exec` は .envrc を読む前に direnv の
状態を巻き戻すため、前置きした値も一緒に破棄され、既定のプロファイルに落ちる。

### `JimixerComGalleryOps` の権限

コードが実際に呼んでいる API から逆算したもの。

| 操作 | API | 対象 |
|---|---|---|
| 派生物の公開 | `s3:PutObject` | `gallery.jimixer.com/gallery/*` |
| 写真を降ろす | `s3:DeleteObject` | `gallery.jimixer.com/gallery/*` |
| 原本の保管 | `s3:PutObject` | `jimixer-com-originals/originals/*` |
| 原本の存在確認 | `s3:ListBucket` | `jimixer-com-originals` |
| 整合性チェック | `s3:ListBucket` | 両方のバケット |

**原本の `s3:GetObject` と `s3:DeleteObject` は意図的に入れていない。** 原本は不変で、
サイトから写真を降ろしても消さない（[ADR-0003](./adr/0003-originals-are-immutable-and-gate-publication.md)）。
取り出しが要るのは数年に一度の一括再処理のときだけなので、そのとき別の資格情報で行う。

`s3:ListBucket` を落とすと、原本の保管はできるのに確認ができないという状態になる。
`upload-derivatives.ts` は「原本が 1 枚でも欠けていれば何も公開しない」という事前条件を
この権限で確かめているため、そこだけ 403 になって全体が止まる。実際にこの状態を踏んでいる。

`HeadObject` を使わないのも同じ理由による。**`HeadObject` は `s3:GetObject` を要求する**ので、
原本の保管判定は `ListObjectsV2` の前方一致で行う（`scripts/upload-originals.ts` の
`alreadyStored`、`scripts/check-consistency.ts`）。

### 発行手順

権限セットは作成済み。作り直す場合はこの手順になる。

```bash
INST=$(aws sso-admin list-instances --query "Instances[0].InstanceArn" --output text)

# 1. 権限セットを作る。説明文に使えるのは ASCII のみ
aws sso-admin create-permission-set --instance-arn $INST \
  --name JimixerComGalleryOps \
  --description "Daily gallery operations for jimixer.com. No read or delete on originals." \
  --session-duration PT4H

# 2. 上の表のポリシーを JSON にして貼る
aws sso-admin put-inline-policy-to-permission-set --instance-arn $INST \
  --permission-set-arn <ARN> --inline-policy file://gallery-ops-policy.json

# 3. ユーザーに割り当てる
aws sso-admin create-account-assignment --instance-arn $INST \
  --target-id <ACCOUNT_ID> --target-type AWS_ACCOUNT \
  --permission-set-arn <ARN> \
  --principal-type USER --principal-id <USER_ID>
```

ローカル側は `~/.aws/config` に `[sso-session jimixer]` と 2 つのプロファイルを置き、
`.envrc.example` をコピーして `direnv allow` する。`[sso-session]` 形式には
**AWS CLI 2.9 以降**が要る。

### 確認

```bash
direnv exec . aws sts get-caller-identity   # AWSReservedSSO_JimixerComGalleryOps か
direnv exec . npm run gallery:check          # 3 項目すべて ✓ になるか

# 原本の読み出しは拒否されるのが正しい
direnv exec . aws s3api get-object --bucket jimixer-com-originals \
  --key originals/<photoId>.png /dev/null
```

`gallery:check` が「原本の欠け」で落ちる場合、原本が無いのではなく
**`s3:ListBucket` が無い**可能性が高い。まず権限を疑う。

`Error loading SSO Token` はセッション切れ。`aws sso login --sso-session jimixer` を
やり直す。gallery-manager を起動したままセッションが切れると、UI には 403 が出る。

## GitHub Actions

**恒久的なアクセスキーは置かない。** ワークフローは OIDC で IAM ロール
`jimixer-com-github-actions` を引き受け、そのジョブ 1 回分の資格情報だけを得る。

CI が走らせるのは `npm ci` と Next.js のビルドで、サードパーティのコードが同じ
プロセスに入る。資格情報がそこに置かれている限り、侵害の経路はリポジトリではなく
依存ツリー全体になる。鍵が存在しなければ、鍵のローテーションという運用も消える。

### Secrets

| Secret | 用途 |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | 引き受けるロールの ARN。`npm run deploy:infra` の出力 `GitHubActionsDeployRoleDeployRoleArn` |
| `AWS_REGION` | `ap-northeast-1` |

ARN を直書きせず Secret に置いているのは、アカウント ID をリポジトリに残さないため。

### 誰が引き受けられるか

信頼条件は `repo:jimixer/jimixer.com:ref:refs/heads/main` に固定している。
**`sub` を絞らないと、同じプロバイダを使う任意のリポジトリから引き受けられる**。
main 以外のブランチから `workflow_dispatch` しても AssumeRole は失敗する。意図した挙動。

### 権限

ロールの定義は [infrastructure/lib/github-actions-deploy-role.ts](../infrastructure/lib/github-actions-deploy-role.ts)
にある。コードが真実なのでここに JSON は写さない。範囲だけ記す。

- `cloudformation:DescribeStacks` — このスタックのみ。バケット名と Distribution ID を出力から引く
- website バケットの `s3:ListBucket` / `s3:PutObject` / `s3:DeleteObject` — `aws s3 sync --delete`
  が呼ぶ 3 つ。同期の向き上いらない `s3:GetObject` は与えていない
- メインディストリビューションの `cloudfront:CreateInvalidation`

ギャラリーのバケットと原本バケットは**この経路からは触らせない**。

### OIDC プロバイダ（アカウントに一度だけ）

プロバイダはアカウント共有の資源であり、このスタックの持ち物ではない（同じアカウントに
他のプロジェクトが同居している）。CDK からは参照するだけなので、無ければ先に作る。

```bash
direnv exec . aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### 詰まったとき

| 症状 | 原因 |
|---|---|
| `Not authorized to perform sts:AssumeRoleWithWebIdentity` | main 以外で走っている。または `permissions: id-token: write` が無い |
| `roleSessionName failed to satisfy constraint` | セッション名に使えるのは `[\w+=,.@-]` のみ。`github.workflow` はワークフロー名（空白を含む）に展開されるので使えない |

## 漏洩したとき

**このリポジトリの経路には、恒久的なアクセスキーが 1 本も無い。** ローカルは
Identity Center の短命な資格情報、GitHub Actions は OIDC で、どちらも盗んでも
期限が来れば使えなくなる。差し替えるべき鍵が無いので、鍵のローテーションという
運用も無い。

疑わしいときに止めるのはセッションのほうになる。

```bash
# Identity Center のセッションを失効させる（該当ユーザーの全セッション）
aws sso-admin list-instances
aws identitystore list-users --identity-store-id <ID>
# 権限セットの割り当てを外せば、次回のログインから引き受けられなくなる
aws sso-admin delete-account-assignment --instance-arn <ARN> ...
```

公開バケットに置いているのは元々公開している写真なので、漏洩で失うのは
**原本と、サイトを書き換えられる能力**である。原本バケットにバージョニングを
有効にしてあるのはこのため（上書きから戻せる）。

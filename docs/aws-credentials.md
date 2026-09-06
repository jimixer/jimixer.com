# AWS 認証情報

このリポジトリが AWS を触る経路は 2 つある。**必要な権限はそれぞれ違う**ので、
同じ資格情報を使い回さない。

| 経路 | 資格情報 | 用途 |
|---|---|---|
| ローカル | `.envrc` の `AWS_PROFILE=jimixer` | gallery-manager、`scripts/` の一括処理、CDK デプロイ |
| GitHub Actions | OIDC で引き受ける IAM ロール（**鍵を置かない**） | `deploy.yml` / `daily-rebuild.yml`（サイトの同期と CloudFront の無効化） |

## なぜ分けるか

`deploy.yml` はサイトの静的ファイルを置くだけで、**ギャラリーの画像にも原本にも触らない**。
逆にローカルの操作は原本を扱う。CI に原本バケットへの権限を渡す理由が無いので渡さない。

## ローカル（プロファイル `jimixer`）

> **現状はまだこの姿になっていない。** プロファイル `jimixer` の IAM ユーザーは
> `Administrator` グループに属していて `AdministratorAccess` を持つ。下のポリシーは
> 到達したい姿であって、いまの権限ではない。つまり `direnv exec .` を通した全コマンドが
> 管理者として走る。分離は未着手（GitHub Actions 側は完了済み）。

### 必要な権限

コードが実際に呼んでいる API から逆算したもの。

| 操作 | API | 対象 |
|---|---|---|
| 派生物の公開 | `s3:PutObject` | `gallery.jimixer.com/gallery/*` |
| 写真を降ろす | `s3:DeleteObject` | `gallery.jimixer.com/gallery/*` |
| 原本の保管 | `s3:PutObject` | `jimixer-com-originals/originals/*` |
| 原本の存在確認 | `s3:ListBucket` | `jimixer-com-originals` |
| 整合性チェック | `s3:ListBucket` | 両方のバケット |

**`s3:ListBucket` を落とすと、原本の保管はできるのに確認ができない**という状態になる。
`upload-derivatives.ts` は「原本が 1 枚でも欠けていれば何も公開しない」という事前条件
（[ADR-0003](./adr/0003-originals-are-immutable-and-gate-publication.md)）をこの権限で
確かめているため、そこだけ 403 になって全体が止まる。実際にこの状態を踏んでいる。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "GalleryObjects",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::gallery.jimixer.com/gallery/*"
    },
    {
      "Sid": "OriginalObjects",
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::jimixer-com-originals/originals/*"
    },
    {
      "Sid": "ListForConsistencyChecks",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::gallery.jimixer.com",
        "arn:aws:s3:::jimixer-com-originals"
      ]
    }
  ]
}
```

原本の `s3:GetObject` と `s3:DeleteObject` は**意図的に入れていない**。原本は不変で、
サイトから写真を降ろしても消さない。取り出しが必要になるのは数年に一度の一括再処理の
ときだけなので、そのとき別の資格情報で行う。

### CDK デプロイ

`npm run deploy:infra` は上記に加えて CloudFormation と、CDK が bootstrap した
`cdk-*` ロールへの `sts:AssumeRole` が要る。スタックが触る範囲（S3・CloudFront・
Route53・ACM）はロール側の権限で実行される。

### 発行手順

```bash
# 1. IAM ユーザーを作る（コンソール or CLI）。プログラムによるアクセスのみ
aws iam create-user --user-name jimixer-com-local

# 2. 上のポリシーを JSON ファイルに保存して割り当てる
aws iam put-user-policy \
  --user-name jimixer-com-local \
  --policy-name jimixer-com-gallery \
  --policy-document file://gallery-policy.json

# 3. アクセスキーを発行する。表示されるのは 1 度だけ
aws iam create-access-key --user-name jimixer-com-local

# 4. プロファイルとして登録する
aws configure --profile jimixer

# 5. .envrc を用意して direnv に読ませる
cp .envrc.example .envrc   # AWS_ACCOUNT_ID と CERTIFICATE_ARN を埋める
direnv allow
```

### 確認

```bash
direnv exec . aws sts get-caller-identity   # 期待するユーザーか
direnv exec . npm run gallery:check          # 3 項目すべて ✓ になるか
```

`gallery:check` が「原本の欠け」で落ちる場合、原本が無いのではなく
**`s3:ListBucket` が無い**可能性が高い。まず権限を疑う。

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

対象はローカルのアクセスキーだけ。GitHub Actions には鍵が無い。

```bash
aws iam list-access-keys --user-name <user>
aws iam update-access-key --user-name <user> --access-key-id <id> --status Inactive
aws iam create-access-key --user-name <user>     # 新しい鍵を発行して差し替える
aws iam delete-access-key --user-name <user> --access-key-id <id>
```

公開バケットに置いているのは元々公開している写真なので、漏洩で失うのは
**原本と、サイトを書き換えられる能力**である。原本バケットにバージョニングを
有効にしてあるのはこのため（上書きから戻せる）。

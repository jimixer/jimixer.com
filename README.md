# jimixer.com

個人サイト — 見栄（実績・外見）と思想（内面）を解剖目録のように展示するパーソナルハブ。

> **⚙️ Development Note**
> このプロジェクトのコードは、GitHub Copilot（Claude 3.5 Sonnet）による AI エージェント支援を大いに活用して作成されています。設計、実装、デバッグ、ドキュメント作成の各フェーズにおいて、人間（jimixer）と AI の協働プロセスを経て構築されました。

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Infrastructure**: AWS (S3, CloudFront, Route 53, ACM) + CloudFront Functions
- **IaC**: AWS CDK v2 (TypeScript)
- **CI/CD**: GitHub Actions
- **Content**: note RSS (force-static) + Local Assets

## Directory Structure

```
jimixer.com/
├── .github/workflows/       # GitHub Actions
│   ├── deploy.yml          # メインデプロイ
│   └── daily-rebuild.yml   # 日次ビルド（RSS更新）
├── infrastructure/          # AWS CDK
│   ├── bin/
│   │   └── jimixer-com.ts  # CDK App entry point
│   ├── lib/
│   │   └── website-stack.ts # Main infrastructure stack
│   ├── cloudfront-functions/ # CloudFront Functions (source)
│   │   ├── README.md       # Functions documentation
│   │   └── url-rewrite.js  # URL normalization function
│   ├── cdk.json
│   └── package.json
├── website/                 # Next.js Application
│   ├── src/
│   │   ├── app/            # App Router (file-based routing)
│   │   │   ├── page.tsx    # Homepage (entrance)
│   │   │   ├── layout.tsx  # Root layout with navigation
│   │   │   ├── (main)/     # Layout group (notes, stack)
│   │   │   │   ├── notes/  # note RSS feed integration
│   │   │   │   └── stack/  # Tech stack page
│   │   │   └── gallery/    # VRChat avatar gallery
│   │   ├── components/     # Reusable React components
│   │   │   └── layout/
│   │   │       └── Header.tsx
│   │   ├── lib/            # Utility functions
│   │   │   ├── rss-parser.ts      # note RSS fetcher
│   │   │   └── gallery.ts         # sidecar からビルド時に index を組み立てる
│   │   └── types/          # TypeScript type definitions
│   │       └── note.ts
│   ├── content/            # Local content（メタデータの真実）
│   │   ├── avatars/        # アバターの作者クレジットと入手元
│   │   └── gallery/{variant}/
│   │       ├── _variant.yml           # 所属アバター・表示名・カバー
│   │       └── {撮影日時}-{photoId}.yml  # 写真 1 枚 = 1 ファイル
│   ├── public/
│   ├── next.config.mjs     # Static export + trailing slash
│   └── package.json
├── .vscode/
│   └── settings.json       # Workspace-specific IDE settings
├── docs/                    # ドキュメント
│   ├── design-doc.md
│   └── image-management.md
├── package.json            # npm workspaces root
└── README.md
```

## Prerequisites

- Node.js 20.x (volta で管理)
- AWS CLI v2
- 個人用 AWS アカウント（ホビー用途）
- direnv (推奨: AWS profile 自動切り替え)

## Setup

### 1. Node.js 環境のセットアップ

```bash
# volta のインストール (未インストールの場合)
curl https://get.volta.sh | bash

# Node.js と npm のバージョンを自動適用
cd jimixer.com
volta install node@20.20.0 npm@10.8.2

# 依存関係のインストール
npm install
```

### 2. AWS 環境のセットアップ

#### 2.1 IAM Identity Center の権限セット

**恒久的なアクセスキーは作らない。** Identity Center に 2 つの権限セットを用意し、
ログインして短命な資格情報を得る。

| 権限セット | 用途 |
|---|---|
| `JimixerComGalleryOps` | 日常操作。ギャラリーへの書き込みと原本の保管のみ。原本の読み出しと削除は持たない |
| `AdministratorAccess` | CDK デプロイなど、明示的に必要なときだけ |

作成手順は [docs/aws-credentials.md](./docs/aws-credentials.md) にある。

#### 2.2 AWS CLI Profile 設定

`[sso-session]` 形式には **AWS CLI 2.9 以降**が要る。`aws --version` で確認する。

`~/.aws/config` に追記:

```ini
[sso-session jimixer]
sso_start_url = https://<identity-store-id>.awsapps.com/start
sso_region = ap-northeast-1
sso_registration_scopes = sso:account:access

[profile jimixer-gallery]
sso_session = jimixer
sso_account_id = YOUR_AWS_ACCOUNT_ID
sso_role_name = JimixerComGalleryOps
region = ap-northeast-1
output = json

[profile jimixer-admin]
sso_session = jimixer
sso_account_id = YOUR_AWS_ACCOUNT_ID
sso_role_name = AdministratorAccess
region = ap-northeast-1
output = json
```

```bash
aws sso login --sso-session jimixer

# 環境変数設定ファイルをコピーして編集
cp .envrc.example .envrc
vim .envrc

direnv allow
```

**`.envrc` に設定する環境変数:**
```bash
export AWS_PROFILE=${AWS_PROFILE:-jimixer-gallery}
export AWS_ACCOUNT_ID=YOUR_AWS_ACCOUNT_ID       # 自分のAWSアカウントID
export AWS_REGION=ap-northeast-1
export CERTIFICATE_ARN=arn:aws:acm:us-east-1:YOUR_ACCOUNT_ID:certificate/YOUR_CERT_ID
```

#### 2.3 Route 53 でドメイン取得

AWS マネジメントコンソールから `jimixer.com` を登録。
Hosted Zone は自動作成されます（Zone ID をメモ）。

#### 2.4 ACM 証明書の発行

**重要:** CloudFront 用証明書は `us-east-1` リージョンで発行。

```bash
# us-east-1 で証明書をリクエスト
aws acm request-certificate \
  --domain-name jimixer.com \
  --validation-method DNS \
  --region us-east-1

# 証明書 ARN をメモ
# 例: arn:aws:acm:us-east-1:123456789012:certificate/abcd1234-...

# DNS 検証レコードを Route 53 に追加（自動 or 手動）
# 証明書ステータスが ISSUED になるまで待機
aws acm describe-certificate \
  --certificate-arn <YOUR_ARN> \
  --region us-east-1 \
  --query 'Certificate.Status'
```

#### 2.5 CDK のブートストラップ

```bash
cd infrastructure
npx cdk bootstrap
```

#### 2.6 環境変数の確認

以下の環境変数が正しく設定されているか確認：

```bash
echo $AWS_PROFILE          # jimixer-gallery
echo $AWS_ACCOUNT_ID       # あなたのAWSアカウントID
echo $AWS_REGION           # ap-northeast-1
echo $CERTIFICATE_ARN      # 証明書のARN
```

**Note:** 証明書ARNは ACM で証明書を発行後、AWS マネジメントコンソールから取得できます。

### 3. インフラのデプロイ

```bash
cd infrastructure
export DOMAIN_NAME=jimixer.com

# 差分確認
npx cdk diff

# デプロイ実行（約5-10分）
npx cdk deploy --require-approval never
```

**作成されるリソース:**
- S3 Bucket: `jimixer.com-website`
- CloudFront Distribution (with CloudFront Function for URL rewriting)
- CloudFront Function: URL 正規化（trailing slash 処理）
- Route 53 A Record: `jimixer.com` → CloudFront
- Origin Access Identity (OAI)

### 4. Website のビルド & デプロイ

```bash
cd ../website
rm -rf .next out
npm run build

# S3 にアップロード
aws s3 sync out/ s3://jimixer.com-website/ --delete

# CloudFront キャッシュクリア
aws cloudfront create-invalidation \
  --distribution-id $(aws cloudformation describe-stacks \
    --stack-name JimixerComStack \
    --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
    --output text) \
  --paths "/*"
```

### 5. GitHub Actions の資格情報

GitHub Actions は OIDC で IAM ロールを引き受ける。**アクセスキーは置かない**。
必要な Secrets は 2 つ:

- `AWS_DEPLOY_ROLE_ARN`: `npm run deploy:infra` の出力 `GitHubActionsDeployRoleDeployRoleArn` の値
- `AWS_REGION`: `ap-northeast-1`

ロールは CDK が作るが、OIDC プロバイダはアカウントに一度だけ手で作る必要がある。
手順と信頼条件は [docs/aws-credentials.md](./docs/aws-credentials.md) にある。

**Note:** GitHub Actions は CDK Stack の Outputs から Distribution ID を自動取得するため、`CLOUDFRONT_DISTRIBUTION_ID` の設定は不要です。

## Development

### ローカル開発サーバー

```bash
npm run dev
# または
cd website && npm run dev
```

ブラウザで `http://localhost:3000` を開く。

### ギャラリー画像の追加

gallery-manager から行う。手で JSON を書く運用は廃止した。

```bash
npm run dev:gallery   # http://localhost:3001
```

ドラッグ&ドロップすると、原本の保管 → 派生物の生成と公開 → sidecar の書き込み、の順で
処理される。**アップロードしただけでは公開されない**（メタデータの真実は git なので、
sidecar を commit / push してデプロイが走る必要がある）。

手順と裏側の詳細は [docs/image-management.md](docs/image-management.md) を参照。

### Notes (note RSS) の更新

`/notes` ページは**静的生成**（`force-static`）されています：

```typescript
// website/src/app/(main)/notes/page.tsx
export const dynamic = 'force-static';
export const revalidate = false;
```

**更新方法:**
- ビルド時に note RSS を取得して HTML 化
- RSS 内容を反映するには**再ビルド & デプロイ**が必要
- GitHub Actions により毎日 JST 9:00 に自動リビルド

## CI/CD

### 自動デプロイ

- **main ブランチへの push**: 自動ビルド & デプロイ ([deploy.yml](.github/workflows/deploy.yml))
- **毎日 JST 9:00**: note RSS を取得して自動リビルド & デプロイ ([daily-rebuild.yml](.github/workflows/daily-rebuild.yml))

### 手動デプロイ

現在はローカルから手動実行:
```bash
cd website && npm run build
aws s3 sync out/ s3://jimixer.com-website/ --delete

# CloudFront Invalidation (配信 ID は Stack から自動取得)
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name JimixerComStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
  --output text)
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   GitHub    │─────▶│    GitHub    │─────▶│     S3      │
│   (Code)    │      │   Actions    │      │   Bucket    │
└─────────────┘      │   (TODO)     │      └──────┬──────┘
                     └──────────────┘             │
                                                  │
       ┌──────────────────────────────────────────┘
       │
       ▼
┌──────────────────┐      ┌───────────────┐
│   CloudFront     │      │  CloudFront   │
│   Distribution   │◀─────│   Function    │
│                  │      │ (URL Rewrite) │
└────────┬─────────┘      └───────────────┘
         │
         │         ┌──────────┐      ┌──────────┐
         ├────────▶│ Route 53 │◀────▶│   ACM    │
         │         │  (DNS)   │      │  (HTTPS) │
         │         └──────────┘      └──────────┘
         │
         ▼
    ┌────────┐
    │  User  │
    └────────┘
```

**主要コンポーネント:**

1. **S3**: 静的ファイルホスティング（Origin）
2. **CloudFront**: グローバル CDN + HTTPS 終端
3. **CloudFront Function**: URL 正規化（trailing slash 処理）
4. **Route 53**: DNS 管理（`jimixer.com` → CloudFront）
5. **ACM**: SSL/TLS 証明書（us-east-1）
6. **OAI**: S3 への安全なアクセス制御

## AWS Costs Estimate

### 月間コスト試算（10,000 PV 想定）

| サービス | 詳細 | 月額 |
|---------|------|------|
| **S3** | ストレージ1GB + リクエスト | $0.025 |
| **CloudFront** | データ転送5GB + リクエスト | $0.76 |
| **CloudFront Function** | 160,000リクエスト | $0.016 |
| **Route 53** | Hosted Zone (固定) | $0.50 |
| **ACM** | 証明書 | 無料 |
| **合計** | | **~$1.30/月** |

### コスト内訳

**CloudFront Function:**
- 料金: $0.10 per 1,000,000 invocations
- 10,000 PV × 16 requests/PV = 160,000 requests
- コスト: $0.016/月（約2円）

**データ転送（最大コスト要因）:**
- 平均ページサイズ: 500KB
- 月間転送量: 10,000 × 0.5MB = 5GB
- コスト: $0.57/月（約86円）

**参考: 100,000 PV の場合**
- 合計: 約 $7.50/月（約1,125円）

## Notes

- **静的エクスポート**: Next.js の `output: 'export'` を使用
- **画像最適化**: WebP 自動変換なし（静的エクスポートのため）
- **RSS 更新**: ビルド時取得（`force-static`）、日次リビルド予定
- **CloudFront Function**: Lambda@Edge より約90%安価
- **Trailing Slash**: `trailingSlash: true` で `/notes/` 形式統一

## Development Approach

このプロジェクトは**人間とAIの協働開発**の実例です：

- **設計**: design-doc.md をベースに AI が提案
- **実装**: 人間の要求に対し AI が段階的にコード生成
- **デバッグ**: エラー調査と修正を AI が支援
- **ドキュメント**: コード解説と README 作成を AI が担当
- **意思決定**: 技術選定や設計判断は人間が最終決定

**使用ツール:**
- GitHub Copilot (Claude 3.5 Sonnet)
- VSCode + GitHub Copilot Chat

## Known Issues / TODO

- [ ] shadcn/ui 導入検討
- [ ] `/notes` ページへのテスト追加
- [ ] CloudFront Functions のユニットテスト
- [ ] Gallery 管理ツールの実装

## License

MIT License - See [LICENSE](LICENSE) file for details.

Code is open source, but content (images, text) may have separate licensing.

---

**Built with ❤️ and 🤖 by jimixer + AI**

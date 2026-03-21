# **design-doc.md**

> **Note:** このプロジェクトは GitHub Copilot（Claude 3.5 Sonnet）による AI エージェント支援を活用して開発されました。

## **1\. Project Overview**

* **Project Name:** jimixer.com
* **Concept:** 「見栄（実績・外見）」と「思想（内面）」を解剖目録のように展示するパーソナルハブ。
  技術スタック、思考の記録、VRChat作品ギャラリーを統合。
* **Persona:** VRChat住人、エンジニア。
* **Design:** ライブラリの公式ドキュメント（Next.js / Tailwind CSS）のようなミニマルで硬派なUI。
* **Development Approach:** 人間の設計意図を AI が実装し、段階的リファクタリングで完成。

## **2\. Tech Stack**

* **Frontend:** Next.js 14.2.35 (App Router, Static Export)
* **Styling:** Tailwind CSS 3.4.1 (カスタムフォント: JetBrains Mono, IBM Plex Sans JP)
* **Infrastructure:** AWS (S3, CloudFront + Functions, Route 53, ACM)
* **IaC:** AWS CDK 2.120.0 (TypeScript)
* **Runtime:** Node.js 20.20.0 (Volta), npm workspaces
* **CI/CD:** GitHub Actions (実装済み)
* **Content Source:**
  * Notes: note.com RSS (`https://note.com/jimixer/rss`) - Build時に静的生成
  * Gallery: ローカル JSON ファイル (`src/lib/gallery-loader.ts`)
  * Stack: 静的コンテンツ

## **3\. Architecture & Data Flow**

### **Build Time**
* ローカルまたは GitHub Actions で `npm run build` を実行
* note.com RSS を `fetch` で取得し、`/notes/` ページを静的生成（`force-static`）
* Next.js Static Export により完全な静的サイト（HTML/CSS/JS）を生成
* 画像は未最適化（`unoptimized: true`）で S3 へそのまま配置

### **Deployment**
* `cdk deploy` で AWS インフラをプロビジョニング
* `npm run deploy` でビルド済み `website/out/` を S3 バケット (`jimixer.com-website`) へ同期
* CloudFront Distribution でエッジ配信
* **CloudFront Function** (`url-rewrite`) が URL 正規化を実行：
  * `/notes` → `/notes/` へ 301 リダイレクト
  * `/notes/` → `/notes/index.html` へ内部書き換え
  * Cost: ~$0.10/1M requests（Lambda@Edge の 90% 削減）
* **Security Headers Policy** でセキュリティヘッダーを自動付与：
  * `X-Frame-Options: DENY`
  * `X-Content-Type-Options: nosniff`
  * `Strict-Transport-Security: max-age=31536000`
  * `Referrer-Policy: strict-origin-when-cross-origin`
  * `X-XSS-Protection: 1; mode=block`
  * `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### **Re-validation & Updates**
* **GitHub Actions による自動デプロイ:**
  * **main ブランチプッシュ時:** 即座に自動ビルド & デプロイ ([.github/workflows/deploy.yml](.github/workflows/deploy.yml))
  * **毎日 JST 9:00:** note RSS を再取得してビルド & デプロイ ([.github/workflows/daily-rebuild.yml](.github/workflows/daily-rebuild.yml))
* **手動デプロイ:** ローカルから `npm run deploy:site` で実行可能

## **4\. Key Components (Implementation Details)**

### **A. Notes Section (RSS Parser)**

**実装:** `website/src/app/(main)/notes/page.tsx` + `website/src/lib/rss-parser.ts`

* `fast-xml-parser` を使用し note.com RSS から抽出：
  * `title`, `link`, `pubDate`
  * `description` (冒頭サマリー)
  * `media:thumbnail` または `<img>` タグからサムネイル URL
* **重要:** `export const dynamic = 'force-static'` で完全静的生成を強制
  * `revalidate: false` により ISR を無効化
  * ビルド時の RSS 取得結果を焼き込み
* UI: ドキュメント風のリストカード（更新日時降順）

### **B. Gallery (VRChat Works)**

**実装:** `website/src/app/gallery/page.tsx` + `website/src/lib/gallery-loader.ts`

* ローカル JSON ファイルで管理（`content/gallery/gallery.json`）
* 各項目：画像、アバター名、スクリーンショット一覧
* UI: ギャラリー形式、詳細ページで複数画像を表示
* **将来計画:** `gallery-manager` workspace による管理ツール実装予定
  * 画像アップロード（D&D）+ WebP変換
  * アバター単位での管理
  * gallery.jimixer.com からの配信とJSON API提供

### **C. Reusable Components**

**実装:** `website/src/components/ui/SectionCard.tsx`

* ホームページの各セクションリンクカード用コンポーネント
* TypeScript Props Interface で `title`, `description`, `href` を受け取る
* `next/link` でラップし、Tailwind CSS でスタイリング
* **リファクタリング例:** 重複コードを DRY 原則でコンポーネント化

## **5\. Infrastructure Definition (CDK Implementation Status)**

**実装:** `infrastructure/lib/website-stack.ts` (CDK TypeScript Stack)

* [x] **S3 Bucket:** `jimixer.com-website`
  * `blockPublicAccess: BlockPublicAccess.BLOCK_ALL` 有効
  * CloudFront OAC (Origin Access Control) でのみアクセス許可
  * バケットポリシーで CloudFront Distribution からの読み取りを許可

* [x] **CloudFront Distribution:** デプロイ済み
  * URL: `https://<DISTRIBUTION_ID>.cloudfront.net`
  * `ViewerProtocolPolicy.REDIRECT_TO_HTTPS` 設定済み
  * Default Root Object: `index.html`
  * **CloudFront Function** 統合:
    * ファイル: `infrastructure/cloudfront-functions/url-rewrite.js`
    * 機能: URL 正規化（trailing slash 処理）
    * イベントタイプ: `VIEWER_REQUEST`
    * Cost: ~$0.016/月 @ 10K PV

* [x] **Route 53 Hosted Zone:** デプロイ済み
  * ドメイン: `jimixer.com`
  * A レコードで CloudFront Distribution へ
  * DNS伝播完了、正常稼働中

* [x] **ACM Certificate:** `us-east-1` で発行
  * ARN: 環境変数 `CERTIFICATE_ARN` で設定
  * Status: `ISSUED`
  * CloudFront で HTTPS 配信に使用

* [x] **IAM User:** 設定済み
  * AdministratorAccess 権限
  * `~/.aws/credentials` にプロファイル設定
  * direnv で自動プロファイル切り替え (`.envrc` で `AWS_PROFILE` 設定)

### **Cost Estimate (月額)**

| サービス | 前提条件 | 月額コスト |
|---------|---------|-----------|
| S3 | 100MB ストレージ + 10K リクエスト | ~$0.01 |
| CloudFront | 10K PV (約 1GB 転送) | ~$0.10 |
| CloudFront Functions | 10K リクエスト | ~$0.016 |
| Route 53 | Hosted Zone 1つ | $0.50 |
| ACM | 証明書 1枚 | 無料 |
| **合計 (10K PV/月)** | | **~$0.63** |
| **合計 (100K PV/月)** | 10GB 転送 + 100K 関数実行 | **~$1.76** |

## **6\. Tone and Manners**

* 不要なアニメーションは排除（パフォーマンス優先）
* フォント: `JetBrains Mono`（等幅）, `IBM Plex Sans JP`（サンセリフ）
* 各要素に詳細な注釈を入れられる構造
* ドキュメント風の堅実な UI デザイン（Next.js / Tailwind CSS 公式に倣う）

## **7\. Development Workflow**

### **AI-Assisted Development**

このプロジェクトは **GitHub Copilot (Claude 3.5 Sonnet)** による AI エージェント支援で開発されました：

1. **初期設計:** design-doc.md をベースに人間が要件定義
2. **実装:** AI が段階的にコード生成（Next.js setup → CDK → コンポーネント化）
3. **デバッグ:** TypeScript エラー、AWS 認証問題、404 エラー等を AI が調査・修正
4. **リファクタリング:** `/vanity` → `/gallery` リネーム、`SectionCard` コンポーネント化
5. **最適化:** CloudFront Function を inline から専用ディレクトリへ移行（案2採用）
6. **ドキュメント:** README と design-doc を実装状況に基づき更新

### **Local Development Commands**

```bash
# 開発サーバー起動
cd website && npm run dev

# ビルド（静的エクスポート）
npm run build

# CDK デプロイ
cd infrastructure && npm run deploy

# S3 同期 + CloudFront Invalidation
npm run deploy  # website/package.json から実行
```

### **Git Workflow** (予定)

* `main` ブランチプッシュで自動デプロイ (GitHub Actions)
* 日次 cron で RSS 更新反映のための自動ビルド

## **8\. Known Issues / TODO**

- [ ] **Gallery 管理ツール実装** (Phase 2)
  - `gallery-manager` workspace の追加
  - 画像アップロード + WebP変換機能
  - アバター単位での管理UI
  - gallery.jimixer.com からの配信

- [ ] **shadcn/ui 導入検討**
  - 現在は Tailwind CSS のみ
  - より洗練された UI コンポーネントが必要になった場合

- [ ] **テスト追加**
  - `/notes` ページの RSS パース処理
  - CloudFront Functions のユニットテスト
  - CDK Stack のスナップショットテスト

- [ ] **パフォーマンス最適化**
  - 画像最適化（現在 `unoptimized: true`）
  - フォント最適化（subset 化）

## **9\. References**

* [Next.js Documentation](https://nextjs.org/docs) - App Router / Static Export
* [AWS CDK TypeScript](https://docs.aws.amazon.com/cdk/v2/guide/home.html)
* [CloudFront Functions](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-functions.html)
* [Tailwind CSS](https://tailwindcss.com/docs)
* [note.com RSS Feed](https://note.com/jimixer/rss)

---

**Last Updated:** 2026-03-18
**Built with:** Next.js + AWS CDK + AI Assistance 🤖
**License:** MIT

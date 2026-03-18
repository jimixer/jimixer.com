# Image Assets Management

## Architecture Overview

ギャラリー画像は **S3 + CloudFront CDN** で管理・配信されています。

```
S3 Bucket: gallery.jimixer.com
  └── gallery/
      ├── milltina/
      │   ├── milltina-01.webp
      │   ├── milltina-02.webp
      │   └── ...
      └── kipfel/
          ├── kipfel-01.webp
          └── ...

CloudFront Distribution: https://gallery.jimixer.com
Route 53: gallery.jimixer.com → CloudFront

Metadata: website/content/gallery/gallery.json
  - 相対パス (/gallery/...) で保存
  - buildImageUrl() で絶対パスに変換
```

### Key Components

1. **Storage**: S3 bucket (`gallery.jimixer.com`)
2. **CDN**: CloudFront distribution with custom domain
3. **Management**: gallery-manager (Next.js app on localhost:3001)
4. **Website**: Static site consuming gallery.json
5. **Image Format**: WebP (quality 85, max 2048x2048)

## Image Guidelines

### ギャラリー画像
- **フォーマット**: WebP (自動変換)
- **品質**: 85
- **最大サイズ**: 2048x2048px (自動リサイズ)
- **対応元形式**: PNG, JPG, WebP
- **自動処理**: gallery-manager が Sharp で変換・最適化

### Hero 画像 (website)
- **場所**: `website/public/hero/main-avatar.webp`
- **推奨サイズ**: 1920x1080px
- **管理方法**: Git 直接管理 (変更頻度が低いため)

## 画像アップロードフロー (推奨)

### 1. gallery-manager を使用

**最も簡単な方法**: Web UIで画像をアップロード

```bash
# 1. gallery-manager を起動
cd gallery-manager
npm run dev
# http://localhost:3001

# 2. ブラウザでアクセス
# - アバター一覧から編集ページへ
# - 画像をドラッグ&ドロップ
# - 自動的に以下を実行:
#   - WebP 変換 (quality 85, max 2048x2048)
#   - S3 へアップロード
#   - gallery.json 更新
```

**処理の流れ:**
```
PNG/JPG ファイル
  ↓ ドラッグ&ドロップ
gallery-manager UI
  ↓ Sharp で変換
WebP (最適化済み)
  ↓ AWS SDK
S3: s3://gallery.jimixer.com/gallery/<avatar-id>/<filename>.webp
  ↓ 自動更新
gallery.json (相対パス: /gallery/<avatar-id>/<filename>.webp)
  ↓ CloudFront 配信
https://gallery.jimixer.com/gallery/<avatar-id>/<filename>.webp
```

### 2. 既存画像の一括マイグレーション

`website/public/gallery/` からS3へ移行する場合:

```bash
# マイグレーションスクリプト実行
node scripts/migrate-gallery-images.js

# 実行内容:
# - website/public/gallery/ を再帰的にスキャン
# - 各画像を WebP 変換 (非WebPの場合)
# - S3 にアップロード (gallery/ prefix)
# - アップロード結果を表示

# 完了後に gallery.json の URL を確認・修正
```

### gallery.json の構造

**重要**: 画像パスは**相対パス**で保存されます。

```json
[
  {
    "id": "milltina",
    "image": "/gallery/milltina/milltina-08.webp",
    "avatarName": "Milltina",
    "images": [
      { "url": "/gallery/milltina/milltina-01.webp" },
      { "url": "/gallery/milltina/milltina-02.webp" }
    ]
  }
]
```

## 技術詳細

### buildImageUrl() 関数

画像の相対パスを絶対URLに変換します。

**場所:**
- `gallery-manager/src/lib/image-url.ts`
- `website/src/lib/image-url.ts`

**実装:**
```typescript
export function buildImageUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const baseUrl = process.env.NEXT_PUBLIC_GALLERY_URL ||
                  "https://gallery.jimixer.com";
  return `${baseUrl}${path}`;
}
```

**使用例:**
```typescript
// gallery.json
{ "url": "/gallery/milltina/milltina-01.webp" }

// 変換後
buildImageUrl("/gallery/milltina/milltina-01.webp")
// → "https://gallery.jimixer.com/gallery/milltina/milltina-01.webp"
```

**注意**: 両ファイルは同一ロジック。修正時は両方更新すること。

### S3 Bucket 構成

```bash
# Bucket 名
gallery.jimixer.com

# アクセス設定
- Public Read Access: 有効
- CORS: localhost:3001 許可

# キャッシュ制御
Cache-Control: public, max-age=31536000
```

### CloudFront Distribution

```bash
# カスタムドメイン
gallery.jimixer.com

# SSL証明書
*.jimixer.com (ACM, us-east-1)

# 動作確認
curl -I https://gallery.jimixer.com/gallery/milltina/milltina-01.webp
# → HTTP/2 200
```

---

## トラブルシューティング

### 画像が表示されない

**確認項目:**
1. S3に画像がアップロードされているか
   ```bash
   aws s3 ls s3://gallery.jimixer.com/gallery/ --profile jimixer
   ```

2. CloudFront経由でアクセス可能か
   ```bash
   curl -I https://gallery.jimixer.com/gallery/<path>
   ```

3. gallery.jsonのパスが正しいか
   ```bash
   cat website/content/gallery/gallery.json | grep "url"
   # → 全て "/gallery/" で始まる相対パス
   ```

4. buildImageUrl()が呼ばれているか
   ```typescript
   // ✅ 正しい
   <Image src={buildImageUrl(item.image)} />

   // ❌ 間違い
   <Image src={item.image} />
   ```

### AWS認証エラー

```bash
# AWS Profile確認
echo $AWS_PROFILE  # → jimixer

# 認証情報確認
aws sts get-caller-identity --profile jimixer

# direnv再読み込み
direnv allow .
```

### gallery-manager でアップロードできない

```bash
# 環境変数確認
cd gallery-manager
cat .env.local
# AWS_PROFILE=jimixer
# AWS_REGION=ap-northeast-1
# S3_BUCKET=gallery.jimixer.com

# dev server再起動
npm run dev
```

---

## コスト見積もり

### S3 Storage (ap-northeast-1)
- $0.025/GB/月
- 100枚 (平均150KB): $0.0038/月
- 1000枚 (平均150KB): $0.038/月

### CloudFront Transfer
- 無料枠: 1TB/月
- 個人サイトでは無料枠内で十分

### 実績 (2026年3月現在)
- 画像数: 14枚
- 合計サイズ: ~2MB
- 月額コスト: < $0.01

---

## 今後の拡張

### gallery-manager の Web デプロイ

**検討事項:**
- Vercel / AWS Amplify でのホスティング
- 認証機能の追加 (Next Auth)
- サブドメイン: `manager.jimixer.com`
- CORS設定の更新

### 画像の最適化強化

- AVIF フォーマット対応
- レスポンシブ画像 (srcset)
- Lazy loading 最適化
- 画像プレースホルダー (blur)

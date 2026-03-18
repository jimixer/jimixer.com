# Gallery Manager

Gallery content management tool for jimixer.com

## 概要

jimixer.com のギャラリーコンテンツ（アバター画像）を管理するためのローカルツールです。
将来的には AWS CDK 管理下でのデプロイも検討しています。

## 技術スタック

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **React Dropzone** (画像D&Dアップロード)
- **Sharp** (WebP変換)
- **AWS SDK** (S3アップロード)

## 開発環境

```bash
# 開発サーバー起動（ポート3001）
npm run dev:gallery

# ビルド
npm run build:gallery
```

## 機能

- [ ] アバター一覧表示
- [ ] アバター作成・編集・削除
- [ ] 画像D&Dアップロード
- [ ] WebP自動変換
- [ ] S3への画像アップロード
- [ ] gallery.json自動生成

## データ構造

軽い抽象化により、将来的なCMS拡張（note, post等）に対応可能：

```typescript
type ContentType = "gallery";

interface GalleryContent extends BaseContent {
  type: "gallery";
  id: string;
  avatarName: string;
  image: string;
  images: ImageData[];
}
```

## AWS連携

- **S3バケット**: `gallery.jimixer.com` (予定)
- **認証**: AWS CLI credentials (`jimixer` profile)
- **CDK実装**: Phase 2の後半で対応予定

## ライセンス

MIT License

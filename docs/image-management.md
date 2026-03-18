# Image Assets Management

## Directory Structure

```
website/public/
├── hero/
│   └── main-avatar.jpg          # エントランス背景画像 (推奨: 2560x1440px)
└── gallery/
    ├── avatar-01-thumb.jpg      # ギャラリーサムネイル (推奨: 600x800px)
    ├── avatar-01-full.jpg       # 詳細ページ用 (推奨: 1920x1080px)
    ├── avatar-02-thumb.jpg
    └── avatar-02-full.jpg
```

## Image Guidelines

### エントランス背景画像
- **推奨サイズ**: 2560x1440px (16:9)
- **最大ファイルサイズ**: 500KB
- **フォーマット**: WebP (フォールバック: JPG)
- **最適化**: 暗めに調整（overlay効果のため）

### ギャラリーサムネイル
- **推奨サイズ**: 600x800px (3:4 縦長)
- **最大ファイルサイズ**: 150KB
- **フォーマット**: WebP (フォールバック: JPG)

### 詳細ページ画像
- **推奨サイズ**: 1920x1080px または 1440x1920px
- **最大ファイルサイズ**: 300KB
- **フォーマット**: WebP (フォールバック: JPG)

## WSL ワークフロー (Windows スクリーンショット → WebP)

### フロー概要

```
VRChat (Windows)
  └── PNG スクリーンショット保存
        ↓  使いたいものだけエクスプローラーでコピー
  staging/
    ├── screenshot-01.png
    ├── screenshot-02.png
    └── ...
        ↓  scripts/import-gallery.sh <avatar-id>
  website/public/gallery/<avatar-id>/
    ├── <id>-thumb.webp   ← サムネイル (3:4 センタークロップ)
    ├── <id>-01.webp      ← 詳細画像
    ├── <id>-02.webp
    └── ...
```

### インポートスクリプト

```bash
# 1. staging/ に PNG をコピーしてから実行
./scripts/import-gallery.sh milltina

# 別のディレクトリを指定することも可
./scripts/import-gallery.sh milltina ~/tmp/shots
```

実行すると以下が行われる:
1. `staging/` 配下の PNG を名前順で検出
2. 最大幅 1920px にリサイズして WebP (quality 85) に変換
3. 1枚目から 3:4 縦クロップのサムネイルを生成
4. 出力先: `website/public/gallery/<avatar-id>/`
5. `gallery.json` に貼り付けるエントリを標準出力に表示

> `staging/` は `.gitignore` 済み。元 PNG はリポジトリに含まれない。

### gallery.json の更新

スクリプト実行後に出力されるエントリをコピーして `website/content/gallery/gallery.json` に追加:

```json
[
  {
    "id": "milltina",
    "image": "/gallery/milltina/milltina-thumb.webp",
    "avatarName": "Milltina",
    "images": [
      { "url": "/gallery/milltina/milltina-01.webp" },
      { "url": "/gallery/milltina/milltina-02.webp" }
    ]
  }
]
```

### 手動変換 (1ファイル)

```bash
# PNG → WebP (フルサイズ)
convert input.png -resize 1920x1920> -quality 85 output.webp

# PNG → WebP (サムネイル: 3:4 縦クロップ)
convert input.png -gravity center -resize x1920 -gravity center -extent 1440x1920 -quality 85 thumb.webp
```

---

## Image Optimization Tools

### Local Tools
```bash
# ImageMagick v6 (WSL/Ubuntu の標準)
convert input.png -quality 85 output.webp
convert input.png -resize 1920x1920> -quality 85 output.webp

# ImageMagick v7 (magick コマンドが使える場合)
magick convert input.png -quality 85 output.webp
```

### Online Tools
- [TinyPNG](https://tinypng.com/) - PNG/JPG圧縮
- [Squoosh](https://squoosh.app/) - WebP変換 + 最適化
- [ImageOptim](https://imageoptim.com/) - 無劣化圧縮

---

## Version Control Strategies for Images

### 🔧 Option 1: Git LFS (Large File Storage) - 推奨

**メリット:**
- Gitの通常ワークフローで管理可能
- 履歴管理が容易
- Private リポジトリで完結

**デメリット:**
- GitHub Free: 1GB ストレージ + 1GB/月 帯域幅
- 追加は有料 ($5/月 で 50GB データパック)

**セットアップ:**
```bash
# Git LFSインストール
git lfs install

# 追跡する画像形式を指定
git lfs track "*.jpg" "*.jpeg" "*.png" "*.webp"
git add .gitattributes

# 画像をコミット（自動的にLFSで管理）
git add website/public/gallery/*.jpg
git commit -m "Add gallery images"
git push
```

**.gitattributes の例:**
```
*.jpg filter=lfs diff=lfs merge=lfs -text
*.jpeg filter=lfs diff=lfs merge=lfs -text
*.png filter=lfs diff=lfs merge=lfs -text
*.webp filter=lfs diff=lfs merge=lfs -text
```

**コスト見積もり:**
- 画像 100枚 (平均200KB) = 20MB → 無料枠内
- 画像 500枚 (平均200KB) = 100MB → 無料枠内
- 画像 5000枚 = 1GB → データパック推奨

---

### ☁️ Option 2: S3 + CloudFront (現在のインフラを活用)

**メリット:**
- 大量の画像に対応
- CDN配信で高速
- Gitリポジトリが軽量
- 既存のS3バケット活用

**デメリット:**
- デプロイフローが複雑化
- 別途アップロードスクリプト必要

**実装方法:**
```bash
# 画像専用のS3パスへアップロード
aws s3 sync website/public/gallery/ s3://jimixer.com-website/gallery/ \
  --cache-control "public, max-age=31536000, immutable"

# CloudFrontで配信
https://jimixer.com/gallery/avatar-01.jpg
```

**コスト見積もり:**
- S3 ストレージ: $0.023/GB/月 (最初の 50TB)
- 1GB画像: $0.023/月
- 10GB画像: $0.23/月

**推奨ディレクトリ構造:**
```
website/
├── public/
│   └── .gitkeep          # publicディレクトリのみ管理
└── assets/               # Git管理外（.gitignore）
    └── images/
        ├── hero/
        └── gallery/
```

**デプロイスクリプト追加:**
```json
// website/package.json
{
  "scripts": {
    "deploy:images": "aws s3 sync assets/images/ s3://jimixer.com-website/ --cache-control 'public, max-age=31536000'",
    "deploy": "npm run build && aws s3 sync out/ s3://jimixer.com-website/ && npm run deploy:images"
  }
}
```

---

### 📦 Option 3: 外部画像ホスティング

**サービス例:**
- [Cloudinary](https://cloudinary.com/) - 無料: 25GB + 25GB帯域幅/月
- [ImageKit](https://imagekit.io/) - 無料: 20GB + 20GB帯域幅/月
- [Imgur](https://imgur.com/) - 無料（APIキー必要）

**メリット:**
- 自動画像最適化
- API経由で管理
- Gitリポジトリが軽量

**デメリット:**
- 外部サービス依存
- 無料枠の制限

---

## 推奨アプローチ

### 🎯 少量画像（< 100枚、< 100MB）
**→ Git LFS**
- 最もシンプル
- Gitの通常フロー
- GitHub無料枠内で運用可能

### 🎯 中量画像（100-1000枚、100MB-1GB）
**→ Git LFS + 最適化徹底**
- WebP形式に統一
- 品質80-85で圧縮
- サムネイルは150KB以下

### 🎯 大量画像（> 1000枚、> 1GB）
**→ S3 + CloudFront**
- 既存インフラ活用
- デプロイスクリプトで自動化
- コスト $0.23/月 (@10GB)

---

## 次のステップ

1. **画像を準備**
   ```bash
   # サンプル画像を配置
   cp your-avatar.jpg website/public/hero/main-avatar.jpg
   cp avatar-thumb.jpg website/public/gallery/sample.jpg
   ```

2. **Git LFSセットアップ（推奨）**
   ```bash
   git lfs install
   git lfs track "website/public/**/*.jpg"
   git lfs track "website/public/**/*.webp"
   git add .gitattributes
   ```

3. **ビルドして確認**
   ```bash
   cd website
   npm run dev
   # http://localhost:3000 でデザイン確認
   ```

4. **デプロイ**
   ```bash
   npm run build
   # S3へアップロード + CloudFront invalidation
   ```

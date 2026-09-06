# gallery-manager

写真の追加・削除を行うローカル専用の管理ツール。`website/content/` の sidecar を書き換え、
S3 に原本と派生物を置く。Web へはデプロイしない（[gallery-architecture.md](../docs/gallery-architecture.md) §7）。

**操作手順は [docs/image-management.md](../docs/image-management.md) にある。** ここには
このワークスペースを触るときに要ることだけを書く。

## 起動

```bash
npm run dev:gallery    # http://localhost:3001
```

プロファイル（`jimixer-gallery`）は `dev` / `start` が自分で前置きするので、direnv を
通していなくても動く。差し替えたいときは `AWS_GALLERY_PROFILE` を渡す
（[aws-credentials.md](../docs/aws-credentials.md)）。

| 変数 | 既定 | 用途 |
|---|---|---|
| `GALLERY_CONTENT_DIR` | `../website/content` | sidecar の置き場所。相対パスを起動ディレクトリ任せにしないための逃げ道 |
| `S3_BUCKET` | `gallery.jimixer.com` | 派生物の公開先 |
| `ORIGINALS_BUCKET` | `jimixer-com-originals` | 原本の保管先（非公開） |
| `NEXT_PUBLIC_GALLERY_URL` | — | UI で画像を表示する URL の起点 |
| `AWS_REGION` | `ap-northeast-1` | |
| `AWS_GALLERY_PROFILE` | `jimixer-gallery` | 使う AWS プロファイル。`dev` / `start` が宣言する |

資格情報そのもの（SSO のセッション）は `aws sso login --sso-session jimixer` から来る。
`.env.local` には書かない（[.env.local.example](./.env.local.example)）。

## 構造

```
src/lib/         ドメイン。photos.ts が追加・削除の順序を握る
src/app/api/     REST。検証して lib に委ね、失敗の理由をそのまま返す
src/app/         画面。読み取りは Server Component、変更は Client から fetch
src/components/  フォームと写真アップローダ
```

型・URL 導出・スキーマ検証・派生物の生成は
[`@jimixer/gallery-schema`](../packages/gallery-schema) にある。ここには置かない。

## 変更するときに壊してはいけないもの

- **写真を追加する順序**（[`lib/photos.ts`](./src/lib/photos.ts)）。撮影日時の確定 → 原本の
  保管 → 派生物の公開 → sidecar の書き込み。sidecar が最後なので、途中で落ちた写真は
  「未登録」に倒れる（[ADR-0003](../docs/adr/0003-originals-are-immutable-and-gate-publication.md)）
- **原本を削除する手段を足さない。** 「サイトから降ろす」と「原本を捨てる」は別の操作で、
  後者はこのツールから実行できない
- **カバーはそのバリアントの写真である。** 写真 0 枚のバリアントは作れず、カバーと最後の
  1 枚は降ろせない
- **バリアントの ID は変えられない。** ディレクトリ名がそのまま公開 URL になる
- **アップロード成功は公開ではない。** 真実は git にあるので、トップに未コミットの変更を
  出し続ける（[`PublishBanner`](./src/components/PublishBanner.tsx)）

## 確認

```bash
npm test --workspace=gallery-manager
npm run gallery:validate              # コンテンツの検証（AWS 不要）
npm run gallery:check                 # sidecar ⇔ S3 の突き合わせ
```

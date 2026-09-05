# 画像の運用

写真の追加・削除と、その裏で何が起きているかをまとめる。
用語（アバター / バリアント / 原本 / 派生物）は [CONTEXT.md](../CONTEXT.md) に定義がある。
なぜこの構成なのかは [gallery-architecture.md](./gallery-architecture.md) と [adr/](./adr/) を参照。

## 構成

```
S3: gallery.jimixer.com（公開・CloudFront 経由で配信）
  └── gallery/
      ├── {photoId}.webp         原寸（長辺 2048 上限。原本より大きくはしない）
      ├── {photoId}-1080.webp    一覧カード用
      ├── {photoId}-640.webp     グリッド用
      └── {photoId}-og.webp      OG 用 1200x630

S3: jimixer-com-originals（非公開・versioning 有効・Standard-IA）
  └── originals/{photoId}.{拡張子}    原本。不変。写真を降ろしても消さない

git: website/content/
  ├── avatars/{avatarId}.yml              作者クレジットと入手元
  └── gallery/{variantId}/
      ├── _variant.yml                    所属アバター・表示名・カバー
      └── {撮影日時}-{photoId}.yml        写真 1 枚 = 1 ファイル
```

**メタデータの真実は git にある。** index は website のビルド時にディレクトリを走査して
組み立てられる生成物で、コミットしない（[ADR-0001](./adr/0001-photo-metadata-as-per-photo-sidecars-in-git.md)）。

**URL は `photoId` から導出される。** バリアント名も撮影日もキーに含めないので、
バリアントを改名しても写真を付け替えても S3 のオブジェクトは動かない
（[ADR-0002](./adr/0002-photo-identity-is-an-opaque-id.md)）。

## 写真を追加する

```bash
direnv exec . npm run dev:gallery    # http://localhost:3001
```

`direnv exec .` を省くと `default` プロファイルに落ちて 403 になる。
権限の内訳は [aws-credentials.md](./aws-credentials.md) を参照。

1. バリアントのページを開き、写真をドラッグ&ドロップする
2. **撮影日時**を確認する。VRChat のファイル名（`VRChat_2026-08-28_03-03-56.813_...`）から
   自動で埋まる。読み取れないファイル（加工でリネームしたものなど）は手で入力する。
   ファイルの更新日時は移動やコピーで変わるので使わない
3. 「写真を追加」を押す

処理の順序が契約になっている。

```
撮影日時の確定
  ↓ 決まらなければここで止まる
原本を非公開バケットへ PUT
  ↓ 失敗したら以降を実行しない（ADR-0003）
派生物 4 種を生成して公開バケットへ PUT
  ↓
sidecar を書く  ← ここで初めて「登録済み」になる
```

sidecar を最後に書くので、途中で落ちた写真は未登録に倒れる。S3 に孤児が残ることはあるが、
原本があるので作り直せるし `npm run gallery:check` で検出できる。

### 公開されるまで

**アップロードしただけではサイトに出ない。** メタデータの真実は git なので、
sidecar を commit して push し、`deploy.yml` が走ってはじめて公開される。
gallery-manager のトップに未コミットの変更が表示されるので、そこで確認する。

```bash
git add website/content && git commit -m "content(gallery): ..." && git push
```

## そのほかの操作

| 操作 | 場所 | 効果 |
|---|---|---|
| カバーを変える | バリアントページの「カバーにする」 | `_variant.yml` の `coverPhotoId` を書き換える。カバーはそのバリアントの写真でなければならない |
| 写真を降ろす | 「降ろす」 | sidecar と派生物 4 種を消す。**原本は残る**。カバーと最後の 1 枚は降ろせない |
| バリアントを消す | 「バリアントを削除」 | 写真ごと消す。原本は残る |
| バリアントを作る | トップの「新規作成」 | **写真つきでしか作れない。** 最初の 1 枚がカバーになる |
| アバターを登録する | トップの「追加」 | 表示名・作者・入手元 URL |

「サイトから降ろす」と「原本を捨てる」は別の操作である。後者は gallery-manager から
実行できない。原本を本当に消すなら S3 を直接操作する。

## 検証

```bash
npm run gallery:validate              # AWS 不要。CI でも走る
direnv exec . npm run gallery:check   # S3 との突き合わせ
```

`gallery:validate` は参照の実在、カバーの不変条件、ID の重複、ファイル名と内容の一致を見る。
`gallery:check` は次の 3 つを見る。

- 派生物の欠け（sidecar にあるのに公開されていない）
- 公開バケットの孤児（公開されているのに sidecar が無い）
- **原本の欠け**（原本の無い写真は存在してはいけない = ADR-0003 の事前条件を事後に確かめる）

## 一括処理

移行と一括処理のスクリプト。日常の運用では使わない。

| コマンド | 用途 |
|---|---|
| `npm run gallery:derivatives` | 原本から派生物を再生成する（`.derivatives/` へ出力） |
| `direnv exec . npm run gallery:upload-originals` | 原本を非公開バケットへ退避する |
| `direnv exec . npm run gallery:upload-derivatives` | 生成済みの派生物を公開する。原本が 1 枚でも欠けていれば何もしない |

いずれも `scripts/migration-manifest.json`（`photoId` と原本の対応）を入力にする。
gallery-manager 経由で追加された写真は manifest に無く、ローカルに生成物も持たないため、
スクリプトはそれをスキップする。

## トラブルシューティング

### S3 で 403 が出る

`AWS_PROFILE` が未設定で `default` プロファイルに落ちている可能性が高い。

```bash
direnv exec . aws sts get-caller-identity   # 期待するユーザーか
```

### `gallery:check` が「原本の欠け」で落ちる

原本が無いのではなく **`s3:ListBucket` の権限が無い**可能性が高い。まず権限を疑う。

### アップロードしたのにサイトに出ない

sidecar が未コミットである可能性が高い。gallery-manager のトップに未公開の変更が出る。

```bash
git status --porcelain -- website/content
```

### 画像が表示されない

```bash
curl -I https://gallery.jimixer.com/gallery/{photoId}-640.webp
npm run gallery:validate
```

## コスト

2026-09 時点の実績。写真 43 枚。

| | 件数 | サイズ | 月額（ap-northeast-1） |
|---|---|---|---|
| 派生物（公開・S3 Standard） | 172 | 11.9 MB | 約 $0.0003 |
| 原本（非公開・S3 Standard-IA） | 43 | 120.8 MB | 約 $0.0015 |
| CloudFront 転送 | | | 無料枠 1TB/月 に収まる |

原本は 1 枚あたり約 2.9 MB。年 800 枚のペースでも原本は年 2.3 GB 増、月額で $0.03 程度。
Glacier Deep Archive を使わない理由は [ADR-0003](./adr/0003-originals-are-immutable-and-gate-publication.md) にある。

## やらないと決めたこと

gallery-manager の Web デプロイ、衣装のモデル化、多軸インデックスなどは
[gallery-architecture.md §7](./gallery-architecture.md) に理由とともに記録してある。
再提案する前にそちらを読むこと。

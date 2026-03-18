# CloudFront Functions

このディレクトリはCloudFront Functionのコードを管理します。

## 概要

CloudFront Functionは、CloudFrontのエッジロケーションで実行される軽量なJavaScript関数です。

- **実行場所**: 全エッジロケーション（220+箇所）
- **実行タイミング**: Viewer Request / Viewer Response
- **制限**: 実行時間 < 1ms、メモリ 2MB
- **料金**: $0.10 per 1,000,000 invocations

## 関数一覧

### url-rewrite.js

**目的**: URL正規化とindex.html追加

**処理内容**:
1. スラッシュなしURL → スラッシュありURLへ301リダイレクト
   - `/notes` → `/notes/`
2. ディレクトリURLに `index.html` を追加
   - `/notes/` → `/notes/index.html`

**トリガー**: Viewer Request（リクエスト受信時）

**コスト試算**:
- 月間10,000 PV: 約2円/月
- 月間100,000 PV: 約24円/月

## 新規関数の追加方法

1. このディレクトリに `.js` ファイルを作成
2. `lib/website-stack.ts` で読み込み
   ```typescript
   const newFunction = new cloudfront.Function(this, "NewFunction", {
     code: cloudfront.FunctionCode.fromFile({
       filePath: path.join(__dirname, '../cloudfront-functions/new-function.js'),
     }),
     comment: "Function description",
   });
   ```
3. `functionAssociations` に追加

## テストの実行

```bash
# TODO: Jestで単体テスト実行
npm test
```

## 参考リンク

- [CloudFront Functions Documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-functions.html)
- [Function Event Structure](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html)

import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * S3 への書き込み。認証情報は AWS SDK の既定のチェーンに任せる
 * （環境変数 → AWS_PROFILE → ~/.aws/credentials）。
 */
const client = new S3Client({ region: process.env.AWS_REGION || "ap-northeast-1" });

const PUBLIC_BUCKET = process.env.S3_BUCKET || "gallery.jimixer.com";
const ORIGINALS_BUCKET = process.env.ORIGINALS_BUCKET || "jimixer-com-originals";

/**
 * 権限エラーに、どのプロファイルで走ったのかを添える。
 *
 * dev / start はプロファイルを自分で宣言するので、「未設定で default に落ちた」
 * 形の失敗はもう起きない。残るのは権限が足りない場合と、別のプロファイルを
 * 渡された場合で、素の 403 だけでは UI からどちらとも見分けられない。
 */
async function send<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode;

    if (status === 403) {
      const profile = process.env.AWS_PROFILE ?? "未設定（default に落ちています）";
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `S3 へのアクセスが拒否されました（プロファイル: ${profile}）。` +
          `どの操作にどの権限が要るかは docs/aws-credentials.md にあります。（${detail}）`
      );
    }
    throw error;
  }
}

/** 公開バケットへ派生物を置く。photoId が不変なので内容も変わらない。 */
export async function putDerivative(key: string, body: Buffer): Promise<void> {
  await send(() =>
    client.send(
      new PutObjectCommand({
        Bucket: PUBLIC_BUCKET,
        Key: key,
        Body: body,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      })
    )
  );
}

/** 非公開バケットへ原本を置く。取り出しは数年に一度を想定して IA に寄せる。 */
export async function putOriginal(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await send(() =>
    client.send(
      new PutObjectCommand({
        Bucket: ORIGINALS_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        StorageClass: "STANDARD_IA",
      })
    )
  );
}

/** 派生物を消す。原本を消す手段はここに置かない（docs/adr/0003）。 */
export async function deleteDerivatives(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  await send(() =>
    client.send(
      new DeleteObjectsCommand({
        Bucket: PUBLIC_BUCKET,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      })
    )
  );
}

import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * S3 への書き込み。認証情報は AWS SDK の既定のチェーンに任せる
 * （環境変数 → AWS_PROFILE → ~/.aws/credentials）。
 */
const client = new S3Client({ region: process.env.AWS_REGION || "ap-northeast-1" });

const PUBLIC_BUCKET = process.env.S3_BUCKET || "gallery.jimixer.com";
const ORIGINALS_BUCKET = process.env.ORIGINALS_BUCKET || "jimixer-com-originals";

/**
 * 権限エラーに原因の候補を添える。
 *
 * .envrc が読み込まれていないと default プロファイルに落ち、素の 403 だけが
 * 返る。UI に出るのがそれだけだと原因にたどり着けない。
 */
async function send<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode;

    if (status === 403 && !process.env.AWS_PROFILE && !process.env.AWS_ACCESS_KEY_ID) {
      throw new Error(
        "S3 へのアクセスが拒否されました。AWS_PROFILE が未設定です — " +
          "`direnv exec . npm run dev:gallery` で起動し直してください。"
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

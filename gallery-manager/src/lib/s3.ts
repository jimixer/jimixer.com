import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * S3 への書き込み。認証情報は AWS SDK の既定のチェーンに任せる
 * （環境変数 → AWS_PROFILE → ~/.aws/credentials）。
 */
const client = new S3Client({ region: process.env.AWS_REGION || "ap-northeast-1" });

const PUBLIC_BUCKET = process.env.S3_BUCKET || "gallery.jimixer.com";
const ORIGINALS_BUCKET = process.env.ORIGINALS_BUCKET || "jimixer-com-originals";

/** 公開バケットへ派生物を置く。photoId が不変なので内容も変わらない。 */
export async function putDerivative(key: string, body: Buffer): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: PUBLIC_BUCKET,
      Key: key,
      Body: body,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
}

/** 非公開バケットへ原本を置く。取り出しは数年に一度を想定して IA に寄せる。 */
export async function putOriginal(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: ORIGINALS_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      StorageClass: "STANDARD_IA",
    })
  );
}

/** 派生物を消す。原本を消す手段はここに置かない（docs/adr/0003）。 */
export async function deleteDerivatives(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  await client.send(
    new DeleteObjectsCommand({
      Bucket: PUBLIC_BUCKET,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    })
  );
}

/** 原本が保管済みかを確かめる。拡張子は原本に従うため前方一致で見る。 */
export async function hasOriginal(prefix: string): Promise<boolean> {
  const found = await client.send(
    new ListObjectsV2Command({
      Bucket: ORIGINALS_BUCKET,
      Prefix: prefix,
      MaxKeys: 1,
    })
  );
  return (found.KeyCount ?? 0) > 0;
}

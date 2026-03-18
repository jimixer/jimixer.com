import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { UploadResult } from "@/types/upload";

/**
 * S3 Client configuration
 * AWS SDK will automatically use credentials from:
 * 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * 2. AWS Profile (AWS_PROFILE environment variable)
 * 3. Default profile (~/.aws/credentials)
 */
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-northeast-1",
  // credentialsを明示的に指定しない = デフォルト認証チェーンを使用
});

/**
 * Upload image to S3
 */
export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string = "image/webp"
): Promise<UploadResult> {
  const bucket = process.env.S3_BUCKET || "gallery.jimixer.com";

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000",
  });

  await s3Client.send(command);

  return {
    url: `https://${bucket}/${key}`,
    key,
    bucket,
  };
}

/**
 * Generate S3 key for avatar image
 */
export function generateS3Key(avatarId: string, filename: string): string {
  return `gallery/${avatarId}/${filename}`;
}

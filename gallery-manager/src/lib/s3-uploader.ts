import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { UploadResult } from "@/types/upload";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-northeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
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

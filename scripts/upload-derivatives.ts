#!/usr/bin/env tsx
/**
 * 生成済みの派生物を公開バケットへ上げる。
 *
 * 原本が保管済みであることを事前条件とする。原本の無い写真を公開しない
 * という契約（docs/adr/0003）を、この 1 箇所で機械的に守る。
 *
 * 移行前のオブジェクトは消さない。website の切り替えが済んでから別途削除する。
 *
 * Usage:
 *   npx tsx scripts/upload-derivatives.ts [--dry-run]
 *
 * Env:
 *   S3_BUCKET         公開バケット。既定: gallery.jimixer.com
 *   ORIGINALS_BUCKET  既定: jimixer-com-originals
 *   AWS_REGION        既定: ap-northeast-1
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { loadGallery } from "../packages/gallery-schema/src/content.js";
import { STANDARD_DERIVATIVES } from "../packages/gallery-schema/src/images.js";
import { originalKey, photoKey, type DerivativeName } from "../packages/gallery-schema/src/urls.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "website/content");
const OUT_DIR = path.join(ROOT, ".derivatives");
const BUCKET = process.env.S3_BUCKET || "gallery.jimixer.com";
const ORIGINALS_BUCKET = process.env.ORIGINALS_BUCKET || "jimixer-com-originals";

const s3 = new S3Client({ region: process.env.AWS_REGION || "ap-northeast-1" });

async function stored(bucket: string, key: string): Promise<boolean> {
  return s3
    .send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    .then(() => true)
    .catch(() => false);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const index = await loadGallery(CONTENT_DIR);
  const coverIds = new Set(index.variants.map((v) => v.coverPhotoId));

  const photos = index.variants.flatMap((v) => v.photos);

  // 事前条件: 原本が 1 枚でも欠けていれば、何も公開しない
  const missing: string[] = [];
  for (const photo of photos) {
    if (!(await stored(ORIGINALS_BUCKET, originalKey(photo.id)))) missing.push(photo.id);
  }
  if (missing.length > 0) {
    throw new Error(
      `原本が保管されていない写真があります（先に upload-originals.ts を実行してください）:\n  ${missing.join(
        "\n  "
      )}`
    );
  }

  let uploaded = 0;
  let bytes = 0;

  for (const photo of photos) {
    const names: DerivativeName[] = coverIds.has(photo.id)
      ? [...STANDARD_DERIVATIVES, "og"]
      : [...STANDARD_DERIVATIVES];

    for (const name of names) {
      const key = photoKey(photo.id, name);
      const body = await fs.readFile(path.join(OUT_DIR, key));

      console.log(`put    ${key}`);
      if (!dryRun) {
        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: body,
            ContentType: "image/webp",
            // photoId は不変なので内容も変わらない
            CacheControl: "public, max-age=31536000, immutable",
          })
        );
      }
      uploaded++;
      bytes += body.byteLength;
    }
  }

  console.log(
    `\n公開 ${uploaded} 件 (${(bytes / 1024 / 1024).toFixed(1)} MB)${dryRun ? "（dry-run）" : ""}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

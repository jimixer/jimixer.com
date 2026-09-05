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
import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { loadGallery } from "../packages/gallery-schema/src/content";
import { ALL_DERIVATIVES } from "../packages/gallery-schema/src/images";
import { photoIdFromOriginalKey, photoKey } from "../packages/gallery-schema/src/urls";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "website/content");
const OUT_DIR = path.join(ROOT, ".derivatives");
const BUCKET = process.env.S3_BUCKET || "gallery.jimixer.com";
const ORIGINALS_BUCKET = process.env.ORIGINALS_BUCKET || "jimixer-com-originals";

const s3 = new S3Client({ region: process.env.AWS_REGION || "ap-northeast-1" });

/** 保管済みの原本を 1 度の LIST でまとめて把握する。 */
async function storedOriginals(): Promise<Set<string>> {
  const ids = new Set<string>();
  let token: string | undefined;

  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: ORIGINALS_BUCKET,
        Prefix: "originals/",
        ContinuationToken: token,
      })
    );
    for (const object of page.Contents ?? []) {
      const id = object.Key ? photoIdFromOriginalKey(object.Key) : null;
      if (id) ids.add(id);
    }
    token = page.NextContinuationToken;
  } while (token);

  return ids;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const index = await loadGallery(CONTENT_DIR);
  const photos = index.variants.flatMap((v) => v.photos);

  // 事前条件: 原本が 1 枚でも欠けていれば、何も公開しない
  const originals = await storedOriginals();
  const missing = photos.filter((p) => !originals.has(p.id)).map((p) => p.id);
  if (missing.length > 0) {
    throw new Error(
      `原本が保管されていない写真があります（先に upload-originals.ts を実行してください）:\n  ${missing.join(
        "\n  "
      )}`
    );
  }

  let uploaded = 0;
  let skipped = 0;
  let bytes = 0;

  for (const photo of photos) {
    for (const name of ALL_DERIVATIVES) {
      const key = photoKey(photo.id, name);
      const body = await fs.readFile(path.join(OUT_DIR, key)).catch(() => null);

      // gallery-manager 経由で追加された写真はローカルに生成物を持たない。
      // 既に公開済みなので、ここで作り直す必要はない
      if (!body) {
        console.log(`skip   ${key}  (ローカルに生成物なし)`);
        skipped++;
        continue;
      }

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
    `\n公開 ${uploaded} 件 (${(bytes / 1024 / 1024).toFixed(1)} MB) / スキップ ${skipped} 件${
      dryRun ? "（dry-run）" : ""
    }`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

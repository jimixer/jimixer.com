#!/usr/bin/env tsx
/**
 * 原本を非公開バケットへ退避する。
 *
 * 原本は不変であり、既にあるオブジェクトは上書きしない
 * （docs/adr/0003 を参照）。派生物と違って作り直せないため、
 * このスクリプトは追加しかしない。
 *
 * Usage:
 *   npx tsx scripts/upload-originals.ts [--dry-run]
 *
 * Env:
 *   ORIGINALS_BUCKET       既定: jimixer-com-originals
 *   GALLERY_ORIGINALS_DIR  原本の置き場
 *   AWS_REGION             既定: ap-northeast-1
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { requireAwsEnv } from "./aws-env";

import { originalKey } from "../packages/gallery-schema/src/urls";
import type { ManifestEntry } from "./migrate-gallery";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = path.join(ROOT, "scripts/migration-manifest.json");
const BUCKET = process.env.ORIGINALS_BUCKET || "jimixer-com-originals";
const ORIGINALS_DIR =
  process.env.GALLERY_ORIGINALS_DIR || "/mnt/d/Users/jimixer/Pictures/VRChat";


const s3 = new S3Client({ region: process.env.AWS_REGION || "ap-northeast-1" });

async function alreadyStored(key: string): Promise<boolean> {
  return s3
    .send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    .then(() => true)
    .catch(() => false);
}

async function main(): Promise<void> {
  requireAwsEnv();

  const dryRun = process.argv.includes("--dry-run");
  const manifest: ManifestEntry[] = JSON.parse(await fs.readFile(MANIFEST, "utf-8"));

  let uploaded = 0;
  let kept = 0;
  let bytes = 0;

  for (const entry of manifest) {
    const key = originalKey(entry.photoId);
    const file = path.join(ORIGINALS_DIR, entry.original);
    const { size } = await fs.stat(file);

    if (await alreadyStored(key)) {
      console.log(`skip   ${key}  (既に保管済み)`);
      kept++;
      continue;
    }

    console.log(`put    ${key}  <- ${entry.original}`);
    if (!dryRun) {
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: await fs.readFile(file),
          ContentType: "image/png",
          // 取り出しは数年に一度の一括再処理を想定。Glacier の 12 時間待ちは
          // その用途に合わないため IA に置く（docs/adr/0003）
          StorageClass: "STANDARD_IA",
        })
      );
    }
    uploaded++;
    bytes += size;
  }

  console.log(
    `\n退避 ${uploaded} 件 (${(bytes / 1024 / 1024).toFixed(1)} MB) / 保管済み ${kept} 件${
      dryRun ? "（dry-run）" : ""
    }`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

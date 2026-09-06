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
import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { requireAwsEnv } from "./aws-env";

import { originalKey, originalPrefix } from "../packages/gallery-schema/src/urls";
import type { ManifestEntry } from "./migrate-gallery";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = path.join(ROOT, "scripts/migration-manifest.json");
const BUCKET = process.env.ORIGINALS_BUCKET || "jimixer-com-originals";
const ORIGINALS_DIR =
  process.env.GALLERY_ORIGINALS_DIR || "/mnt/d/Users/jimixer/Pictures/VRChat";


const s3 = new S3Client({ region: process.env.AWS_REGION || "ap-northeast-1" });

/**
 * 保管済みかを確かめる。
 *
 * HeadObject は `s3:GetObject` を要求するが、原本の読み出し権限は日常の資格情報に
 * 持たせない（docs/aws-credentials.md）。権限が無いと 403 が返り、それを「未保管」と
 * 読むと**全件を上書きしてしまう** — 原本は不変という契約（docs/adr/0003）が
 * バージョニング頼みで破れる。`ListObjectsV2` なら `s3:ListBucket` だけで済む。
 *
 * 例外は握り潰さない。判定できないまま進むより止まったほうがいい。
 * 拡張子は原本に従うため前方一致で見る。
 */
async function alreadyStored(photoId: string): Promise<boolean> {
  const found = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: originalPrefix(photoId),
      MaxKeys: 1,
    })
  );
  return (found.KeyCount ?? 0) > 0;
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

    if (await alreadyStored(entry.photoId)) {
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

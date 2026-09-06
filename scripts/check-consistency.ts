#!/usr/bin/env tsx
/**
 * sidecar と S3 の突き合わせ。読み取り権限が要るためローカル専用。
 *
 * 2 種類を見る。
 *   - 双方向: sidecar の集合 ⇔ 公開バケットの派生物の集合が一致するか
 *   - 片方向: 原本の集合 ⊇ sidecar の集合（原本の無い写真は存在してはいけない）
 *
 * 後者が docs/adr/0003 の事前条件を事後にも確かめる部分にあたる。
 *
 * Usage:
 *   npm run gallery:check                              # プロファイルは script が宣言する
 *   direnv exec . npx tsx scripts/check-consistency.ts  # 直呼びは direnv を通す
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

import { requireAwsEnv } from "./aws-env";
import { loadGallery } from "../packages/gallery-schema/src/content";
import { ALL_DERIVATIVES } from "../packages/gallery-schema/src/images";
import { photoIdFromOriginalKey, photoKey } from "../packages/gallery-schema/src/urls";
import type { ManifestEntry } from "./migrate-gallery";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "website/content");
const MANIFEST = path.join(ROOT, "scripts/migration-manifest.json");
const PUBLIC_BUCKET = process.env.S3_BUCKET || "gallery.jimixer.com";
const ORIGINALS_BUCKET = process.env.ORIGINALS_BUCKET || "jimixer-com-originals";

const s3 = new S3Client({ region: process.env.AWS_REGION || "ap-northeast-1" });

async function listKeys(bucket: string, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;

  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token })
    );
    for (const object of page.Contents ?? []) if (object.Key) keys.push(object.Key);
    token = page.NextContinuationToken;
  } while (token);

  return keys;
}

function report(label: string, items: string[]): boolean {
  if (items.length === 0) {
    console.log(`✓ ${label}`);
    return true;
  }
  console.log(`✗ ${label}: ${items.length} 件`);
  for (const item of items.slice(0, 20)) console.log(`    ${item}`);
  if (items.length > 20) console.log(`    … 他 ${items.length - 20} 件`);
  return false;
}

async function main(): Promise<void> {
  requireAwsEnv();

  const { variants } = await loadGallery(CONTENT_DIR);
  const photos = variants.flatMap((v) => v.photos);

  const expected = new Set(
    photos.flatMap((photo) => ALL_DERIVATIVES.map((name) => photoKey(photo.id, name)))
  );
  const published = new Set(await listKeys(PUBLIC_BUCKET, "gallery/"));

  // 移行前のオブジェクトは孤児だが、削除は本番反映後に別途行う
  const legacy = new Set(
    (JSON.parse(await fs.readFile(MANIFEST, "utf-8")) as ManifestEntry[]).map((e) => e.legacyKey)
  );

  const storedOriginals = new Set(
    (await listKeys(ORIGINALS_BUCKET, "originals/"))
      .map(photoIdFromOriginalKey)
      .filter((id): id is string => id !== null)
  );

  const ok = [
    report(
      "派生物の欠け",
      [...expected].filter((key) => !published.has(key))
    ),
    report(
      "公開バケットの孤児",
      [...published].filter((key) => !expected.has(key) && !legacy.has(key))
    ),
    report(
      "原本の欠け（原本の無い写真は存在してはいけない）",
      photos.filter((photo) => !storedOriginals.has(photo.id)).map((p) => p.id)
    ),
  ].every(Boolean);

  const remainingLegacy = [...published].filter((key) => legacy.has(key));
  if (remainingLegacy.length > 0) {
    console.log(`\n移行前のオブジェクトが ${remainingLegacy.length} 件残っています（本番反映後に削除）`);
  }

  console.log(
    `\n写真 ${photos.length} / 派生物 ${expected.size} / 公開 ${published.size} / 原本 ${storedOriginals.size}`
  );
  if (!ok) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

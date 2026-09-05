#!/usr/bin/env tsx
/**
 * 原本から派生物を生成する。AWS には触れない。
 *
 * 公開中の WebP は入力にしない。原本が揃っている以上、そこから作り直すほうが
 * 世代損失が乗らない。OG はカバーにだけ必要なので、それ以外には作らない。
 *
 * Usage:
 *   npx tsx scripts/generate-derivatives.ts [--force]
 *
 * Env:
 *   GALLERY_ORIGINALS_DIR  原本の置き場（既定: /mnt/d/Users/jimixer/Pictures/VRChat）
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadGallery } from "../packages/gallery-schema/src/content.js";
import {
  renderDerivative,
  STANDARD_DERIVATIVES,
} from "../packages/gallery-schema/src/images.js";
import { photoKey, type DerivativeName } from "../packages/gallery-schema/src/urls.js";
import type { ManifestEntry } from "./migrate-gallery.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "website/content");
const MANIFEST = path.join(ROOT, "scripts/migration-manifest.json");
const OUT_DIR = path.join(ROOT, ".derivatives");
const ORIGINALS_DIR =
  process.env.GALLERY_ORIGINALS_DIR || "/mnt/d/Users/jimixer/Pictures/VRChat";

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(2)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");

  const index = await loadGallery(CONTENT_DIR);
  const manifest: ManifestEntry[] = JSON.parse(await fs.readFile(MANIFEST, "utf-8"));
  const originalOf = new Map(manifest.map((e) => [e.photoId, e.original]));
  const coverIds = new Set(index.variants.map((v) => v.coverPhotoId));

  const totals = new Map<DerivativeName, number>();
  let written = 0;
  let skipped = 0;

  for (const variant of index.variants) {
    for (const photo of variant.photos) {
      const original = originalOf.get(photo.id);
      if (!original) throw new Error(`manifest に原本がありません: ${photo.id}`);
      const originalPath = path.join(ORIGINALS_DIR, original);

      const names: DerivativeName[] = coverIds.has(photo.id)
        ? [...STANDARD_DERIVATIVES, "og"]
        : [...STANDARD_DERIVATIVES];

      for (const name of names) {
        const out = path.join(OUT_DIR, photoKey(photo.id, name));
        const already = await fs.stat(out).catch(() => null);

        if (already && !force) {
          totals.set(name, (totals.get(name) ?? 0) + already.size);
          skipped++;
          continue;
        }

        const buffer = await renderDerivative(originalPath, name);
        await fs.mkdir(path.dirname(out), { recursive: true });
        await fs.writeFile(out, buffer);

        totals.set(name, (totals.get(name) ?? 0) + buffer.byteLength);
        written++;
      }
    }
  }

  console.log(`生成 ${written} / 既存 ${skipped}\n`);
  for (const [name, bytes] of totals) {
    console.log(`  ${name.padEnd(5)} ${formatBytes(bytes)}`);
  }

  // 詳細ページの重さは grid 用サムネイルの合計で決まる。
  for (const variant of index.variants) {
    let bytes = 0;
    for (const photo of variant.photos) {
      const stat = await fs.stat(path.join(OUT_DIR, photoKey(photo.id, "thumb")));
      bytes += stat.size;
    }
    console.log(
      `\n/gallery/${variant.id}/  ${variant.photos.length} 枚  ${formatBytes(bytes)}`
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

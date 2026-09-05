#!/usr/bin/env tsx
/**
 * コンテンツの検証。AWS には触れないので CI でそのまま回せる。
 *
 * sidecar が散らばる構造では、参照が実在するかを機械が保証しないと
 * 壊れても気づけない（docs/adr/0001）。website のビルドでも同じ検証が走るが、
 * 落ちた理由を読みやすく出すためにこちらを先に回す。
 *
 * Usage:
 *   npx tsx scripts/validate-content.ts
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadGallery } from "../packages/gallery-schema/src/content";
import { monthSections } from "../packages/gallery-schema/src/view";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "website/content");

async function main(): Promise<void> {
  const { avatars, variants } = await loadGallery(CONTENT_DIR);
  const photos = variants.reduce((n, v) => n + v.photos.length, 0);

  for (const variant of variants) {
    const months = monthSections(variant.photos)
      .map((s) => `${s.month}×${s.photos.length}`)
      .join(", ");
    console.log(`  ${variant.id.padEnd(16)} ${String(variant.photos.length).padStart(3)} 枚  ${months}`);
  }

  console.log(`\nアバター ${avatars.length} / バリアント ${variants.length} / 写真 ${photos}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

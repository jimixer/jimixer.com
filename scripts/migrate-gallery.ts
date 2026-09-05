#!/usr/bin/env tsx
/**
 * gallery.json から sidecar 群への一度きりの移行。
 *
 * 旧構造（単一 JSON・URL が identity）から新構造（画像別 sidecar・不透明な
 * photoId）へ変換する。互換レイヤは持たないため、この移行は 1 回だけ実行する
 * （docs/adr/0001, docs/adr/0002 を参照）。
 *
 * 派生物は原本から作り直すため、公開中の WebP は入力に使わない。
 * 出力される manifest が photoId と原本の対応を持ち、次の工程がそれを読む。
 *
 * Usage:
 *   npx tsx scripts/migrate-gallery.ts [--dry-run] [--force]
 *
 * Env:
 *   GALLERY_ORIGINALS_DIR  原本の置き場（既定: /mnt/d/Users/jimixer/Pictures/VRChat）
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringify as stringifyYaml } from "yaml";

import { newPhotoId, sidecarBasename } from "../packages/gallery-schema/src/content.js";
import { measureOriginal } from "../packages/gallery-schema/src/images.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "website/content");
const LEGACY_JSON = path.join(CONTENT_DIR, "gallery/gallery.json");
const MANIFEST = path.join(ROOT, "scripts/migration-manifest.json");
const ORIGINALS_DIR =
  process.env.GALLERY_ORIGINALS_DIR || "/mnt/d/Users/jimixer/Pictures/VRChat";

/**
 * ファイル名から撮影日時を復元できない 13 枚。
 * 公開中の WebP と原本を知覚ハッシュで照合して特定した
 * （docs/gallery-architecture.md §8）。
 */
const UNDATED_ORIGINALS: Record<string, string> = {
  "kipfel-01.webp": "2026-02/VRChat_2026-02-06_03-38-25.566_1920x1080_EDIT.png",
  "kipfel-02.webp": "2026-02/VRChat_2026-02-07_03-54-10.617_1080x1920.png",
  "kipfel-03.webp": "2026-02/VRChat_2026-02-19_04-15-24.598_1080x1920.png",
  "kipfel-04.webp": "2026-03/VRChat_2026-03-04_02-20-45.425_1080x1920.png",
  "kipfel-05.webp": "2026-03/VRChat_2026-03-15_04-14-49.602_1080x1920.png",
  "milltina-01.webp": "2026-03/VRChat_2026-03-05_02-31-33.179_1080x1920.png",
  "milltina-02.webp": "2026-03/VRChat_2026-03-05_02-34-44.999_1080x1920.png",
  "milltina-03.webp": "2026-03/VRChat_2026-03-06_01-59-54.781_1080x1920.png",
  "milltina-04.webp": "2026-03/VRChat_2026-03-07_06-10-03.875_1080x1920.png",
  "milltina-05.webp": "2026-03/VRChat_2026-03-11_02-58-51.207_1920x1080.png",
  "milltina-06.webp": "2026-03/VRChat_2026-03-15_04-09-39.187_1080x1920.png",
  "milltina-07.webp": "2026-03/VRChat_2026-03-15_04-11-37.623_1920x1080.png",
  "milltina-08.webp": "2026-03/VRChat_2026-03-15_04-14-08.830_1080x1920.png",
};

interface LegacyItem {
  id: string;
  image: string;
  avatarName: string;
  images: { url: string }[];
}

export interface ManifestEntry {
  photoId: string;
  variantId: string;
  /** 原本の GALLERY_ORIGINALS_DIR からの相対パス。 */
  original: string;
  /** 移行前の公開キー。移行後に削除する対象。 */
  legacyKey: string;
}

/** 公開中のファイル名から原本の相対パスを決める。 */
function resolveOriginal(fileName: string): string {
  const undated = UNDATED_ORIGINALS[fileName];
  if (undated) return undated;

  // 例: manuka-vrchat-2026-03-19-05-43-45-418-1080x1920-1773896143280.webp
  const m = fileName.match(
    /vrchat-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{3})-(\d+x\d+)/
  );
  if (!m) throw new Error(`原本を特定できません: ${fileName}`);

  const [, year, month, day, hour, min, sec, ms, res] = m;
  return `${year}-${month}/VRChat_${year}-${month}-${day}_${hour}-${min}-${sec}.${ms}_${res}.png`;
}

/** 原本のファイル名から撮影日時を読む。ローカル時刻なのでタイムゾーンは付けない。 */
function capturedAtOf(original: string): string {
  const m = path
    .basename(original)
    .match(/VRChat_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})/);
  if (!m) throw new Error(`撮影日時を読めません: ${original}`);
  return `${m[1]}T${m[2]}:${m[3]}:${m[4]}`;
}

async function exists(file: string): Promise<boolean> {
  return fs.access(file).then(
    () => true,
    () => false
  );
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const force = process.argv.includes("--force");

  const legacy: LegacyItem[] = JSON.parse(await fs.readFile(LEGACY_JSON, "utf-8"));
  const manifest: ManifestEntry[] = [];
  const usedIds = new Set<string>();

  for (const item of legacy) {
    const variantDir = path.join(CONTENT_DIR, "gallery", item.id);
    if (!force && (await exists(path.join(variantDir, "_variant.yml")))) {
      throw new Error(
        `${item.id} は移行済みに見えます。やり直す場合は --force を付けてください`
      );
    }

    // カバーが images[] の外にある場合も 1 枚の写真として取り込む。
    const urls = [...new Set([...item.images.map((i) => i.url), item.image])];
    let coverPhotoId = "";

    for (const url of urls) {
      const fileName = path.basename(url);
      const original = resolveOriginal(fileName);
      const originalPath = path.join(ORIGINALS_DIR, original);
      if (!(await exists(originalPath))) throw new Error(`原本がありません: ${originalPath}`);

      let photoId = newPhotoId();
      while (usedIds.has(photoId)) photoId = newPhotoId();
      usedIds.add(photoId);

      const capturedAt = capturedAtOf(original);
      const measured = await measureOriginal(originalPath);
      const sidecar = path.join(variantDir, sidecarBasename(capturedAt, photoId));

      if (url === item.image) coverPhotoId = photoId;

      console.log(
        `${item.id}/${fileName}\n  -> ${photoId}  ${capturedAt}  ${measured.width}x${measured.height}  ${measured.dominantColor}`
      );

      if (!dryRun) {
        await fs.mkdir(variantDir, { recursive: true });
        await fs.writeFile(
          sidecar,
          stringifyYaml({ id: photoId, capturedAt, ...measured }),
          "utf-8"
        );
      }

      manifest.push({
        photoId,
        variantId: item.id,
        original,
        legacyKey: url.replace(/^\//, ""),
      });
    }

    if (!dryRun) {
      await fs.writeFile(
        path.join(variantDir, "_variant.yml"),
        stringifyYaml({
          avatar: item.id, // 既存 3 件はアバターとバリアントが 1:1
          displayName: item.avatarName,
          coverPhotoId,
        }),
        "utf-8"
      );
    }
  }

  if (!dryRun) {
    await fs.writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  }

  console.log(
    `\n写真 ${manifest.length} 枚 / バリアント ${legacy.length} 件${dryRun ? "（dry-run）" : ""}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * 移行前の公開オブジェクトを削除する。
 *
 * 対象は manifest の `legacyKey`（旧構造で公開していた 42 件）に限る。
 * 新方式の派生物が揃っていることを事前条件にし、揃っていなければ 1 件も消さない。
 *
 * 不可逆な操作なので既定は dry-run。実際に消すには --execute を渡す。
 *
 * Usage:
 *   npm run gallery:prune-legacy              # 対象を表示するだけ
 *   npm run gallery:prune-legacy -- --execute  # 削除する
 *
 * 直に tsx で走らせるときは direnv を通すこと（プロファイルの宣言が効かないため）。
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

import { requireAwsEnv } from "./aws-env";
import { loadGallery } from "../packages/gallery-schema/src/content";
import { ALL_DERIVATIVES } from "../packages/gallery-schema/src/images";
import { photoKey } from "../packages/gallery-schema/src/urls";
import type { ManifestEntry } from "./migrate-gallery";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "website/content");
const MANIFEST = path.join(ROOT, "scripts/migration-manifest.json");
const BUCKET = process.env.S3_BUCKET || "gallery.jimixer.com";

const s3 = new S3Client({ region: process.env.AWS_REGION || "ap-northeast-1" });

async function listKeys(prefix: string): Promise<Set<string>> {
  const keys = new Set<string>();
  let token: string | undefined;

  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token })
    );
    for (const object of page.Contents ?? []) if (object.Key) keys.add(object.Key);
    token = page.NextContinuationToken;
  } while (token);

  return keys;
}

async function main(): Promise<void> {
  requireAwsEnv();
  const execute = process.argv.includes("--execute");

  const { variants } = await loadGallery(CONTENT_DIR);
  const photos = variants.flatMap((v) => v.photos);
  const manifest: ManifestEntry[] = JSON.parse(await fs.readFile(MANIFEST, "utf-8"));
  const published = await listKeys("gallery/");

  // 事前条件: 新方式の派生物が 1 つでも欠けていれば、旧オブジェクトは消さない
  const missing = photos
    .flatMap((photo) => ALL_DERIVATIVES.map((name) => photoKey(photo.id, name)))
    .filter((key) => !published.has(key));

  if (missing.length > 0) {
    throw new Error(
      `新方式の派生物が ${missing.length} 件欠けています。先に公開してください:\n  ${missing
        .slice(0, 10)
        .join("\n  ")}`
    );
  }

  // 現行の sidecar が参照しているキーは、たとえ manifest にあっても消さない
  const inUse = new Set(
    photos.flatMap((photo) => ALL_DERIVATIVES.map((name) => photoKey(photo.id, name)))
  );
  const targets = manifest
    .map((entry) => entry.legacyKey)
    .filter((key) => published.has(key) && !inUse.has(key));

  for (const key of targets) console.log(`delete ${key}`);

  if (targets.length === 0) {
    console.log("削除対象はありません。");
    return;
  }

  if (!execute) {
    console.log(`\n${targets.length} 件が対象（dry-run）。実行するには --execute を渡してください。`);
    return;
  }

  // DeleteObjects は 1 回あたり 1000 件まで
  for (let i = 0; i < targets.length; i += 1000) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: targets.slice(i, i + 1000).map((Key) => ({ Key })) },
      })
    );
  }
  console.log(`\n${targets.length} 件を削除しました。`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

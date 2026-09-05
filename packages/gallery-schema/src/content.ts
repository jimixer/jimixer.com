import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import {
  avatarFileSchema,
  formatIssues,
  photoFileSchema,
  variantFileSchema,
  PHOTO_ID_PATTERN,
  SLUG_PATTERN,
} from "./schema.js";
import type { Avatar, GalleryIndex, Photo, Variant } from "./types.js";

/**
 * `website/content/` 以下の sidecar 群を読み書きする。Node 専用。
 *
 * メタデータの真実はここにあるファイル群であり、index は毎回組み立てられる
 * 派生物である（docs/adr/0001 を参照）。
 */

export const AVATARS_DIR = "avatars";
export const GALLERY_DIR = "gallery";
export const VARIANT_FILE = "_variant.yml";

const PHOTO_ID_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const PHOTO_ID_LENGTH = 10;

/** 検証に落ちた内容をすべて列挙して報告する。1 件ずつ直させない。 */
export class GalleryContentError extends Error {
  constructor(readonly issues: string[]) {
    super(`ギャラリーの内容が不正です:\n${issues.map((i) => `  - ${i}`).join("\n")}`);
    this.name = "GalleryContentError";
  }
}

/** 不透明な写真 ID。剰余による偏りを避けるため範囲外のバイトは捨てる。 */
export function newPhotoId(): string {
  const limit = Math.floor(256 / PHOTO_ID_ALPHABET.length) * PHOTO_ID_ALPHABET.length;
  let id = "";
  while (id.length < PHOTO_ID_LENGTH) {
    for (const byte of randomBytes(PHOTO_ID_LENGTH)) {
      if (byte >= limit) continue;
      id += PHOTO_ID_ALPHABET[byte % PHOTO_ID_ALPHABET.length];
      if (id.length === PHOTO_ID_LENGTH) break;
    }
  }
  return id;
}

/**
 * sidecar のファイル名。人間がディレクトリを開いたときに時系列に並ぶよう
 * 撮影日時を前置するが、identity はあくまでファイル本体の `id` である。
 */
export function sidecarBasename(capturedAt: string, photoId: string): string {
  const date = capturedAt.slice(0, 10);
  const time = capturedAt.slice(11).replace(/:/g, "");
  return `${date}-${time}-${photoId}.yml`;
}

export function variantDir(contentDir: string, variantId: string): string {
  return path.join(contentDir, GALLERY_DIR, variantId);
}

export function photoPath(contentDir: string, photo: Photo): string {
  return path.join(
    variantDir(contentDir, photo.variantId),
    sidecarBasename(photo.capturedAt, photo.id)
  );
}

async function readYaml(file: string): Promise<unknown> {
  return parseYaml(await fs.readFile(file, "utf-8"));
}

async function listYaml(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".yml") && e.name !== VARIANT_FILE)
    .map((e) => e.name)
    .sort();
}

async function loadAvatars(contentDir: string, issues: string[]): Promise<Avatar[]> {
  const dir = path.join(contentDir, AVATARS_DIR);
  const avatars: Avatar[] = [];

  for (const name of await listYaml(dir)) {
    const id = name.replace(/\.yml$/, "");
    const where = `${AVATARS_DIR}/${name}`;

    if (!SLUG_PATTERN.test(id)) {
      issues.push(`${where}: ファイル名が ID として使えません`);
      continue;
    }
    const parsed = avatarFileSchema.safeParse(await readYaml(path.join(dir, name)));
    if (!parsed.success) {
      issues.push(...formatIssues(where, parsed.error));
      continue;
    }
    avatars.push({ id, ...parsed.data });
  }
  return avatars;
}

async function loadPhotos(
  dir: string,
  variantId: string,
  issues: string[]
): Promise<Photo[]> {
  const photos: Photo[] = [];

  for (const name of await listYaml(dir)) {
    const where = `${GALLERY_DIR}/${variantId}/${name}`;
    const parsed = photoFileSchema.safeParse(await readYaml(path.join(dir, name)));
    if (!parsed.success) {
      issues.push(...formatIssues(where, parsed.error));
      continue;
    }

    const expected = sidecarBasename(parsed.data.capturedAt, parsed.data.id);
    if (name !== expected) {
      issues.push(`${where}: ファイル名が内容と一致しません（${expected} が正しい）`);
      continue;
    }
    photos.push({ variantId, ...parsed.data });
  }
  return photos;
}

async function loadVariants(contentDir: string, issues: string[]): Promise<Variant[]> {
  const root = path.join(contentDir, GALLERY_DIR);
  const variants: Variant[] = [];

  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries.filter((e) => e.isDirectory()).sort()) {
    const id = entry.name;
    const dir = path.join(root, id);
    const where = `${GALLERY_DIR}/${id}/${VARIANT_FILE}`;

    if (!SLUG_PATTERN.test(id)) {
      issues.push(`${GALLERY_DIR}/${id}: ディレクトリ名が ID として使えません`);
      continue;
    }
    const parsed = variantFileSchema.safeParse(await readYaml(path.join(dir, VARIANT_FILE)));
    if (!parsed.success) {
      issues.push(...formatIssues(where, parsed.error));
      continue;
    }

    const photos = (await loadPhotos(dir, id, issues)).sort((a, b) =>
      b.capturedAt.localeCompare(a.capturedAt)
    );
    variants.push({
      id,
      avatarId: parsed.data.avatar,
      displayName: parsed.data.displayName,
      coverPhotoId: parsed.data.coverPhotoId,
      photos,
    });
  }
  return variants;
}

/** 参照が実在するか、identity が重複していないかを見る。 */
function checkReferences(avatars: Avatar[], variants: Variant[], issues: string[]): void {
  const avatarIds = new Set(avatars.map((a) => a.id));
  const seenPhotoIds = new Map<string, string>();

  for (const variant of variants) {
    const where = `${GALLERY_DIR}/${variant.id}`;

    if (!avatarIds.has(variant.avatarId)) {
      issues.push(`${where}: アバター ${variant.avatarId} が存在しません`);
    }
    if (variant.photos.length === 0) {
      issues.push(`${where}: 写真が 1 枚もありません`);
    } else if (!variant.photos.some((p) => p.id === variant.coverPhotoId)) {
      issues.push(`${where}: カバー ${variant.coverPhotoId} がこのバリアントの写真にありません`);
    }

    for (const photo of variant.photos) {
      const owner = seenPhotoIds.get(photo.id);
      if (owner) issues.push(`${where}: 写真 ID ${photo.id} が ${owner} と重複しています`);
      else seenPhotoIds.set(photo.id, where);
    }
  }
}

/**
 * `contentDir` 以下を走査して index を組み立てる。
 *
 * @throws {GalleryContentError} 検証に落ちた場合。ビルドはここで止める
 */
export async function loadGallery(contentDir: string): Promise<GalleryIndex> {
  const issues: string[] = [];
  const avatars = await loadAvatars(contentDir, issues);
  const variants = await loadVariants(contentDir, issues);
  checkReferences(avatars, variants, issues);

  if (issues.length > 0) throw new GalleryContentError(issues);
  return { avatars, variants };
}

/** sidecar を 1 枚書く。ファイル名は内容から決まるため呼び出し側は指定できない。 */
export async function writePhoto(contentDir: string, photo: Photo): Promise<string> {
  const { id, capturedAt, width, height, caption, dominantColor } = photo;
  const file = photoPath(contentDir, photo);

  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    stringifyYaml({ id, capturedAt, width, height, caption, dominantColor }),
    "utf-8"
  );
  return file;
}

/** 写真 1 枚をサイトから降ろす。原本は消さない（docs/adr/0003 を参照）。 */
export async function deletePhoto(contentDir: string, photo: Photo): Promise<void> {
  await fs.rm(photoPath(contentDir, photo));
}

export { PHOTO_ID_PATTERN };

import type { Avatar, GalleryIndex, Photo, Variant } from "./types.js";

/**
 * 表示の並びとグルーピング。データの構造とは独立しており、
 * ビューを増やしてもファイル配置には影響しない。
 */

/** アバター単位のまとまり。バリアントが 1 つのときヘッダは描画しない。 */
export interface AvatarGroup {
  avatar: Avatar;
  variants: Variant[];
}

/** 月ごとの区切り。 */
export interface MonthSection {
  /** `YYYY-MM`。 */
  month: string;
  photos: Photo[];
}

function latestCapturedAt(variant: Variant): string {
  return variant.photos.reduce((max, p) => (p.capturedAt > max ? p.capturedAt : max), "");
}

/**
 * トップページの並び。アバター群・群内バリアントとも、
 * 最新の撮影日が新しい順にする。手動順は持たない。
 */
export function avatarGroups(index: GalleryIndex): AvatarGroup[] {
  const byAvatar = new Map<string, Variant[]>();
  for (const variant of index.variants) {
    const list = byAvatar.get(variant.avatarId);
    if (list) list.push(variant);
    else byAvatar.set(variant.avatarId, [variant]);
  }

  return index.avatars
    .filter((avatar) => byAvatar.has(avatar.id))
    .map((avatar) => ({
      avatar,
      variants: [...byAvatar.get(avatar.id)!].sort((a, b) =>
        latestCapturedAt(b).localeCompare(latestCapturedAt(a))
      ),
    }))
    .sort((a, b) =>
      latestCapturedAt(b.variants[0]).localeCompare(latestCapturedAt(a.variants[0]))
    );
}

/**
 * バリアントページの区切り。撮影日の降順で、月ごとにまとめる。
 * `capturedAt` はタイムゾーンを持たないローカル時刻なので、先頭 7 文字がそのまま月になる。
 */
export function monthSections(photos: readonly Photo[]): MonthSection[] {
  const sections: MonthSection[] = [];
  for (const photo of [...photos].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))) {
    const month = photo.capturedAt.slice(0, 7);
    const last = sections[sections.length - 1];
    if (last && last.month === month) last.photos.push(photo);
    else sections.push({ month, photos: [photo] });
  }
  return sections;
}

export function findVariant(index: GalleryIndex, variantId: string): Variant | undefined {
  return index.variants.find((v) => v.id === variantId);
}

export function findAvatar(index: GalleryIndex, avatarId: string): Avatar | undefined {
  return index.avatars.find((a) => a.id === avatarId);
}

export function coverPhoto(variant: Variant): Photo {
  const photo = variant.photos.find((p) => p.id === variant.coverPhotoId);
  // 読み込み時に検証済みなので、ここに到達するのはデータではなくコードの誤り。
  if (!photo) throw new Error(`variant ${variant.id}: cover photo not found`);
  return photo;
}

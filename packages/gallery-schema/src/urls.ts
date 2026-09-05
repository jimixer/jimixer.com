import type { Photo } from "./types.js";

/**
 * 写真の identity は `photoId` であり、URL とストレージキーはそこから導出される。
 * バリアント名も撮影日もキーに含めない（docs/adr/0002 を参照）。
 */

/** 派生物の長辺（px）。`full` は原本を上限とするため拡大はしない。 */
export const DERIVATIVE_LONG_EDGE = {
  thumb: 640,
  card: 1080,
  full: 2048,
} as const;

/** OG 画像は SNS 側の比率に合わせた固定サイズ。 */
export const OG_SIZE = { width: 1200, height: 630 } as const;

export type DerivativeName = keyof typeof DERIVATIVE_LONG_EDGE | "og";

const DEFAULT_BASE_URL = "https://gallery.jimixer.com";

/** 派生物を配信するオリジン。末尾のスラッシュは落とす。 */
export function galleryBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_GALLERY_URL || DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

/** 公開バケット上のキー。 */
export function photoKey(photoId: string, name: DerivativeName = "full"): string {
  if (name === "full") return `gallery/${photoId}.webp`;
  if (name === "og") return `gallery/${photoId}-og.webp`;
  return `gallery/${photoId}-${DERIVATIVE_LONG_EDGE[name]}.webp`;
}

/** 非公開バケット上の原本キー。公開されることはない。 */
export function originalKey(photoId: string): string {
  return `originals/${photoId}.png`;
}

export function photoUrl(
  photoId: string,
  name: DerivativeName = "full",
  baseUrl: string = galleryBaseUrl()
): string {
  return `${baseUrl.replace(/\/+$/, "")}/${photoKey(photoId, name)}`;
}

/**
 * 派生物の実寸。原本より大きくはしない（1920px の原本に `full` を指定しても 1920px）。
 * `width` / `height` 属性と srcset の記述子に使う。
 */
export function derivativeSize(
  photo: Pick<Photo, "width" | "height">,
  name: DerivativeName
): { width: number; height: number } {
  if (name === "og") return { ...OG_SIZE };

  const longEdge = Math.max(photo.width, photo.height);
  const scale = Math.min(1, DERIVATIVE_LONG_EDGE[name] / longEdge);
  return {
    width: Math.round(photo.width * scale),
    height: Math.round(photo.height * scale),
  };
}

/** `<img srcset>` の値。幅記述子は派生物の実寸から算出する。 */
export function photoSrcSet(
  photo: Pick<Photo, "id" | "width" | "height">,
  names: readonly DerivativeName[],
  baseUrl?: string
): string {
  return names
    .map((name) => {
      const { width } = derivativeSize(photo, name);
      return `${photoUrl(photo.id, name, baseUrl ?? galleryBaseUrl())} ${width}w`;
    })
    .join(", ");
}

import path from "node:path";

import type { GalleryIndex } from "@jimixer/gallery-schema";
import { loadGallery } from "@jimixer/gallery-schema/content";

/**
 * コンテンツの置き場所。
 *
 * 既定は website ワークスペースの相対位置だが、`GALLERY_CONTENT_DIR` で
 * 上書きできる。相対パスを起動ディレクトリ任せにすると、実行場所が変わった
 * だけで壊れるため（docs/gallery-architecture.md §1）。
 */
export function contentDir(): string {
  return (
    process.env.GALLERY_CONTENT_DIR ?? path.resolve(process.cwd(), "../website/content")
  );
}

/**
 * 毎回ディスクから読む。website と違い、このアプリは内容を書き換えるため
 * キャッシュしてはいけない。
 */
export function readGallery(): Promise<GalleryIndex> {
  return loadGallery(contentDir());
}

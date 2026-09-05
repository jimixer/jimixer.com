import path from "node:path";

import type { GalleryIndex } from "@jimixer/gallery-schema";
import { loadGallery } from "@jimixer/gallery-schema/content";

/**
 * sidecar 群からビルド時に index を組み立てる。
 *
 * index は生成物であり、コミットしない（docs/adr/0001 を参照）。
 * generateStaticParams と各ページから何度も呼ばれるため、1 度だけ読む。
 */
let pending: Promise<GalleryIndex> | undefined;

export function galleryIndex(): Promise<GalleryIndex> {
  pending ??= loadGallery(path.join(process.cwd(), "content"));
  return pending;
}

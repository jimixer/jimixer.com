import type { MetadataRoute } from "next";

import { galleryIndex } from "@/lib/gallery";

const BASE_URL = "https://jimixer.com";

/**
 * daily-rebuild で毎日走るため、`lastModified` に現在時刻を入れると
 * 全 URL の更新日が毎日変わり、クローラへ嘘のシグナルを送り続けることになる。
 * バリアントページは最新の撮影日を使う。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const index = await galleryIndex();
  const buildDate = new Date().toISOString();

  const variants = index.variants.map((variant) => ({
    url: `${BASE_URL}/gallery/${variant.id}/`,
    // capturedAt はタイムゾーンを持たないため、日付だけを出す
    lastModified: variant.photos[0].capturedAt.slice(0, 10),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const latestCapture = index.variants
    .map((v) => v.photos[0].capturedAt.slice(0, 10))
    .sort()
    .at(-1);

  return [
    {
      url: BASE_URL,
      lastModified: buildDate,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/notes/`,
      lastModified: buildDate,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/gallery/`,
      lastModified: latestCapture ?? buildDate,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...variants,
  ];
}

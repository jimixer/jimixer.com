import type { GalleryContent } from "@/types/content";
import fs from "fs";
import path from "path";

/**
 * website/content/gallery/gallery.json を読み込む
 */
export async function loadGalleryData(): Promise<GalleryContent[]> {
  const galleryPath = path.join(
    process.cwd(),
    "../website/content/gallery/gallery.json"
  );

  try {
    const data = await fs.promises.readFile(galleryPath, "utf-8");
    const items = JSON.parse(data);

    // 既存データを GalleryContent 型に変換
    return items.map((item: any) => ({
      type: "gallery" as const,
      id: item.id,
      avatarName: item.avatarName,
      image: item.image,
      images: item.images,
    }));
  } catch (error) {
    console.error("Failed to load gallery data:", error);
    return [];
  }
}

/**
 * gallery.json を更新
 */
export async function saveGalleryData(
  data: GalleryContent[]
): Promise<boolean> {
  const galleryPath = path.join(
    process.cwd(),
    "../website/content/gallery/gallery.json"
  );

  try {
    // GalleryContent から既存フォーマットに変換
    const items = data.map((item) => ({
      id: item.id,
      image: item.image,
      avatarName: item.avatarName,
      images: item.images,
    }));

    await fs.promises.writeFile(
      galleryPath,
      JSON.stringify(items, null, 2),
      "utf-8"
    );
    return true;
  } catch (error) {
    console.error("Failed to save gallery data:", error);
    return false;
  }
}

/**
 * 特定のアバターを取得
 */
export async function getGalleryItemById(
  id: string
): Promise<GalleryContent | null> {
  const items = await loadGalleryData();
  return items.find((item) => item.id === id) || null;
}

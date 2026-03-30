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
 * images 配列を日付昇順でソートする
 *
 * 優先順位:
 * 1. 番号付きファイル ({avatarId}-\d+.webp) → 先頭に固定
 * 2. VRChat スクリーンショット ({avatarId}-vrchat-YYYY-MM-DD-HH-mm-ss-...) → 日時昇順
 * 3. その他 → ファイル名末尾の Unix タイムスタンプ (ms) で昇順
 */
function sortImages(
  images: GalleryContent["images"],
  avatarId: string
): GalleryContent["images"] {
  const numberedPattern = new RegExp(`/${avatarId}-\\d+\\.webp$`);
  const vrchatPattern = /vrchat-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/;
  const timestampPattern = /-(\d{10,})\.webp$/;

  function sortKey(url: string): string {
    if (numberedPattern.test(url)) {
      // 番号付き: 先頭固定。番号でサブソート
      const num = url.match(/-(\d+)\.webp$/)?.[1] ?? "0";
      return `0-${num.padStart(6, "0")}`;
    }
    const vrchat = url.match(vrchatPattern);
    if (vrchat) {
      // "YYYY-MM-DD-HH-mm-ss" をそのまま文字列比較キーに
      const [, yyyy, mm, dd, hh, min, ss] = vrchat;
      return `1-${yyyy}${mm}${dd}${hh}${min}${ss}`;
    }
    const ts = url.match(timestampPattern)?.[1] ?? "0";
    return `2-${ts.padStart(16, "0")}`;
  }

  return [...images].sort((a, b) => sortKey(a.url).localeCompare(sortKey(b.url)));
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
    // GalleryContent から既存フォーマットに変換（images は日付昇順にソート）
    const items = data.map((item) => ({
      id: item.id,
      image: item.image,
      avatarName: item.avatarName,
      images: sortImages(item.images, item.id),
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

/**
 * Content types supported by the CMS
 * 将来的に 'note', 'post' などを追加可能
 */
export type ContentType = "gallery";

/**
 * Base content interface for all content types
 * 共通フィールドの抽象化
 */
export interface BaseContent {
  type: ContentType;
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Image data structure
 */
export interface ImageData {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

/**
 * Gallery content (avatar + images)
 */
export interface GalleryContent extends BaseContent {
  type: "gallery";
  avatarName: string;
  image: string; // メイン画像URL
  images: ImageData[];
}

/**
 * Gallery collection (gallery.json の構造)
 */
export interface GalleryCollection {
  avatars: GalleryContent[];
}

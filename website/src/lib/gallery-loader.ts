import type { GalleryItem } from "@/types/gallery";
import galleryData from "../../content/gallery/gallery.json";

export function getGalleryItems(): GalleryItem[] {
  return galleryData as GalleryItem[];
}

export interface GalleryImage {
  url: string;
}

export interface GalleryItem {
  id: string;
  image: string;
  images: GalleryImage[];
  avatarName: string;
}

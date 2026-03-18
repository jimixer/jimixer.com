import Link from "next/link";
import type { GalleryContent } from "@/types/content";
import { buildImageUrl } from "@/lib/image-url";

interface AvatarCardProps {
  avatar: GalleryContent;
}

export function AvatarCard({ avatar }: AvatarCardProps) {
  const imageUrl = buildImageUrl(avatar.image);

  return (
    <Link
      href={`/avatars/${avatar.id}`}
      className="group block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
    >
      <div className="aspect-square relative bg-gray-100 dark:bg-gray-700">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={avatar.avatarName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {avatar.avatarName}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {avatar.images.length} images
        </p>
      </div>
    </Link>
  );
}

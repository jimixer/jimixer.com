import Link from "next/link";
import type { GalleryContent } from "@/types/content";

interface AvatarCardProps {
  avatar: GalleryContent;
}

export function AvatarCard({ avatar }: AvatarCardProps) {
  return (
    <Link
      href={`/avatars/${avatar.id}`}
      className="group block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
    >
      <div className="aspect-square relative bg-gray-100 dark:bg-gray-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatar.image}
          alt={avatar.avatarName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
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

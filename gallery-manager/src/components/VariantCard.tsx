import type { Avatar, Variant } from "@jimixer/gallery-schema";
import { coverPhoto, galleryBaseUrl, photoUrl } from "@jimixer/gallery-schema";
import Link from "next/link";

interface VariantCardProps {
  variant: Variant;
  avatar: Avatar | undefined;
}

export function VariantCard({ variant, avatar }: VariantCardProps) {
  const cover = coverPhoto(variant);

  return (
    <Link
      href={`/variants/${variant.id}`}
      className="group block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
    >
      <div className="aspect-square relative bg-gray-100 dark:bg-gray-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl(cover.id, "thumb", galleryBaseUrl())}
          alt={variant.displayName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          style={{ backgroundColor: cover.dominantColor }}
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {variant.displayName}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {avatar?.displayName ?? variant.avatarId} · {variant.photos.length} 枚
        </p>
      </div>
    </Link>
  );
}

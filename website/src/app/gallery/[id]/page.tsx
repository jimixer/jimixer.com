import {
  findAvatar,
  findVariant,
  galleryBaseUrl,
  monthSections,
  photoUrl,
  OG_SIZE,
} from "@jimixer/gallery-schema";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import GalleryGrid from "@/components/gallery/GalleryGrid";
import { galleryIndex } from "@/lib/gallery";

interface PageProps {
  params: { id: string };
}

export async function generateStaticParams() {
  const index = await galleryIndex();
  return index.variants.map((variant) => ({ id: variant.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const index = await galleryIndex();
  const variant = findVariant(index, params.id);
  if (!variant) return {};

  const avatar = findAvatar(index, variant.avatarId);
  const title = variant.displayName;
  // タイトルがバリアント名を持つので、説明では繰り返さない
  const description = avatar
    ? `写真 ${variant.photos.length} 枚 · Base: ${avatar.displayName} by ${avatar.author}`
    : `写真 ${variant.photos.length} 枚`;
  const image = photoUrl(variant.coverPhotoId, "og", galleryBaseUrl());

  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      url: `https://jimixer.com/gallery/${variant.id}/`,
      images: [{ url: image, width: OG_SIZE.width, height: OG_SIZE.height, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function VariantPage({ params }: PageProps) {
  const index = await galleryIndex();
  const variant = findVariant(index, params.id);

  if (!variant) {
    notFound();
  }

  const avatar = findAvatar(index, variant.avatarId);
  const sections = monthSections(variant.photos);

  return (
    <div className="relative min-h-screen">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-20 md:py-12">
        <GalleryGrid
          sections={sections}
          variantName={variant.displayName}
          baseUrl={galleryBaseUrl()}
        />

        {avatar && (
          <p className="mt-12 text-xs font-mono text-white/40">
            Base:{" "}
            <a
              href={avatar.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-white/70 transition-colors"
            >
              {avatar.displayName}
            </a>{" "}
            by {avatar.author}
          </p>
        )}
      </div>
    </div>
  );
}

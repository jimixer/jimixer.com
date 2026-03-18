import { getGalleryItems } from "@/lib/gallery-loader";
import { notFound } from "next/navigation";
import GalleryGrid from "@/components/gallery/GalleryGrid";

interface PageProps {
  params: { id: string };
}

export function generateStaticParams() {
  const items = getGalleryItems();
  return items.map((item) => ({
    id: item.id,
  }));
}

export default function AvatarDetailPage({ params }: PageProps) {
  const items = getGalleryItems();
  const avatar = items.find((item) => item.id === params.id);

  if (!avatar) {
    notFound();
  }

  return (
    <div className="relative min-h-screen">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-20 md:py-12">
        <GalleryGrid images={avatar.images} avatarName={avatar.avatarName} />
      </div>
    </div>
  );
}

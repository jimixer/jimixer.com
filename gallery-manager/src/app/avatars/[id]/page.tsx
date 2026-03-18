import { notFound } from "next/navigation";
import { getGalleryItemById } from "@/lib/gallery-loader";
import { AvatarDetailClient } from "./AvatarDetailClient";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function AvatarDetailPage({ params }: PageProps) {
  const avatar = await getGalleryItemById(params.id);

  if (!avatar) {
    notFound();
  }

  return <AvatarDetailClient avatar={avatar} />;
}

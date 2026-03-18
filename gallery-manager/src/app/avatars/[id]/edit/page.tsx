import Link from "next/link";
import { notFound } from "next/navigation";
import { getGalleryItemById } from "@/lib/gallery-loader";
import { AvatarEditClient } from "./AvatarEditClient";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function AvatarEditPage({ params }: PageProps) {
  const avatar = await getGalleryItemById(params.id);

  if (!avatar) {
    notFound();
  }

  return <AvatarEditClient avatar={avatar} />;
}

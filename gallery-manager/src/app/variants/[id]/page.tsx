import { notFound } from "next/navigation";

import { VariantClient } from "./VariantClient";

import { readGallery } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function VariantPage({ params }: { params: { id: string } }) {
  const { avatars, variants } = await readGallery();
  const variant = variants.find((v) => v.id === params.id);

  if (!variant) notFound();

  return (
    <VariantClient
      variant={variant}
      avatar={avatars.find((a) => a.id === variant.avatarId)}
    />
  );
}

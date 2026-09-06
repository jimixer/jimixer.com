import { notFound } from "next/navigation";

import { VariantClient } from "./VariantClient";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { readGallery } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function VariantPage({ params }: { params: { id: string } }) {
  const { avatars, variants } = await readGallery();
  const variant = variants.find((v) => v.id === params.id);

  if (!variant) notFound();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: variant.displayName }]} />
      <VariantClient
        variant={variant}
        avatar={avatars.find((a) => a.id === variant.avatarId)}
      />
    </div>
  );
}

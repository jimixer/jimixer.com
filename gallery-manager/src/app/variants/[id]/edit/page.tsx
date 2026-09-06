import { notFound } from "next/navigation";

import { VariantForm } from "@/components/VariantForm";
import { readGallery } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function EditVariantPage({ params }: { params: { id: string } }) {
  const { avatars, variants } = await readGallery();
  const variant = variants.find((v) => v.id === params.id);

  if (!variant) notFound();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        {variant.displayName} を編集
      </h2>
      <VariantForm variant={variant} avatars={avatars} />
    </div>
  );
}

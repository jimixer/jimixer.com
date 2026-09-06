import { notFound } from "next/navigation";

import { AvatarForm } from "@/components/AvatarForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { readGallery } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function EditAvatarPage({ params }: { params: { id: string } }) {
  const { avatars } = await readGallery();
  const avatar = avatars.find((a) => a.id === params.id);

  if (!avatar) notFound();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: `${avatar.displayName} を編集` }]} />
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        {avatar.displayName} を編集
      </h2>
      <AvatarForm avatar={avatar} />
    </div>
  );
}

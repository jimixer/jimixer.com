import { NewVariantClient } from "./NewVariantClient";

import { readGallery } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function NewVariantPage() {
  const { avatars } = await readGallery();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        バリアントを作成
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        最初の 1 枚がカバーになります。あとから変更できます。
      </p>
      <NewVariantClient avatars={avatars} />
    </div>
  );
}

import Link from "next/link";

import { AvatarRow } from "@/components/AvatarRow";
import { PublishBanner } from "@/components/PublishBanner";
import { VariantCard } from "@/components/VariantCard";
import { readGallery } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { avatars, variants } = await readGallery();
  const avatarOf = new Map(avatars.map((a) => [a.id, a]));

  return (
    <div className="space-y-8">
      <PublishBanner />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">バリアント</h2>
          <Link
            href="/variants/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            新規作成
          </Link>
        </div>

        {variants.length === 0 ? (
          <p className="rounded-lg bg-white dark:bg-gray-800 p-12 text-center text-gray-600 dark:text-gray-300">
            バリアントがまだありません
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {variants.map((variant) => (
              <VariantCard
                key={variant.id}
                variant={variant}
                avatar={avatarOf.get(variant.avatarId)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">アバター</h2>
          <Link
            href="/avatars/new"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            追加
          </Link>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow">
          {avatars.map((avatar) => (
            <AvatarRow
              key={avatar.id}
              avatar={avatar}
              variantCount={variants.filter((v) => v.avatarId === avatar.id).length}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

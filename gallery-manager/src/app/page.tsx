import Link from "next/link";
import { loadGalleryData } from "@/lib/gallery-loader";
import { AvatarCard } from "@/components/AvatarCard";

export default async function HomePage() {
  const avatars = await loadGalleryData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          アバター一覧
        </h2>
        <Link
          href="/avatars/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          新規作成
        </Link>
      </div>

      {avatars.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
          <p className="text-gray-600 dark:text-gray-300">
            アバターがまだ登録されていません
          </p>
          <Link
            href="/avatars/new"
            className="inline-block mt-4 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            最初のアバターを作成 →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {avatars.map((avatar) => (
            <AvatarCard key={avatar.id} avatar={avatar} />
          ))}
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>開発中:</strong> ローカル環境でgallery-managerを構築中です。
          将来的にAWS CDK管理下でのデプロイを検討します。
        </p>
      </div>
    </div>
  );
}

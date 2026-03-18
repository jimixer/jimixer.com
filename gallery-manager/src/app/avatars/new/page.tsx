import Link from "next/link";
import { AvatarForm } from "@/components/AvatarForm";

export default function NewAvatarPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          ← 一覧へ戻る
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          新規アバター作成
        </h2>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <AvatarForm />
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GalleryContent } from "@/types/content";
import { buildImageUrl } from "@/lib/image-url";

interface AvatarDetailClientProps {
  avatar: GalleryContent;
}

export function AvatarDetailClient({ avatar }: AvatarDetailClientProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const mainImageUrl = buildImageUrl(avatar.image);

  const handleDelete = async () => {
    if (
      !confirm(
        `アバター「${avatar.avatarName}」を削除してもよろしいですか？この操作は取り消せません。`
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/avatars/${avatar.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("削除に失敗しました");
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "エラーが発生しました");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            ← 一覧へ戻る
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {avatar.avatarName}
          </h2>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/avatars/${avatar.id}/edit`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            編集
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg font-medium transition-colors"
          >
            {isDeleting ? "削除中..." : "削除"}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              メイン画像
            </h3>
            {mainImageUrl ? (
              <div className="aspect-square max-w-md bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mainImageUrl}
                  alt={avatar.avatarName}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square max-w-md bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">
                  画像が設定されていません
                </p>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              アバターID
            </h3>
            <code className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
              {avatar.id}
            </code>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          ギャラリー画像 ({avatar.images.length})
        </h3>
        {avatar.images.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            画像がアップロードされていません
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {avatar.images.map((image, index) => {
              const imageUrl = buildImageUrl(image.url);
              return (
                <div
                  key={index}
                  className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={`${avatar.avatarName} - ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GalleryContent } from "@/types/content";
import { ImageUploadZone } from "@/components/ImageUploadZone";

interface AvatarEditClientProps {
  avatar: GalleryContent;
}

export function AvatarEditClient({ avatar }: AvatarEditClientProps) {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<string>("");

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError("ファイルが選択されていません");
      return;
    }

    setIsUploading(true);
    setError("");
    setUploadProgress("画像を処理中...");

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      setUploadProgress(`${selectedFiles.length} 個の画像をアップロード中...`);

      const response = await fetch(`/api/avatars/${avatar.id}/images`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "アップロードに失敗しました");
      }

      setUploadProgress("完了！");
      router.push(`/avatars/${avatar.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/avatars/${avatar.id}`}
          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          ← 詳細へ戻る
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {avatar.avatarName} - 画像アップロード
        </h2>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {uploadProgress && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {uploadProgress}
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          画像アップロード
        </h3>

        <ImageUploadZone
          onFilesSelected={handleFilesSelected}
          maxFiles={20}
          disabled={isUploading}
        />

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            選択されたファイル: {selectedFiles.length} 個
          </p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push(`/avatars/${avatar.id}`)}
              disabled={isUploading}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading || selectedFiles.length === 0}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
            >
              {isUploading ? "アップロード中..." : "アップロード"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>注意:</strong>{" "}
          画像は自動的にWebP形式に変換されます。元の画像は保持されません。
        </p>
      </div>
    </div>
  );
}

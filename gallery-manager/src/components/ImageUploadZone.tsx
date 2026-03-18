"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface ImageUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

export function ImageUploadZone({
  onFilesSelected,
  maxFiles = 10,
  disabled = false,
}: ImageUploadZoneProps) {
  const [previews, setPreviews] = useState<string[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Create previews
      const newPreviews = acceptedFiles.map((file) =>
        URL.createObjectURL(file)
      );
      setPreviews((prev) => [...prev, ...newPreviews]);

      // Pass files to parent
      onFilesSelected(acceptedFiles);
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    maxFiles,
    disabled,
  });

  const clearPreviews = () => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center transition-colors
          ${
            isDragActive
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {isDragActive ? (
            <p className="text-blue-600 dark:text-blue-400 font-medium">
              ここにドロップ...
            </p>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-300">
                画像をドラッグ&ドロップ、またはクリックして選択
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                PNG, JPG, WebP (最大 {maxFiles} ファイル)
              </p>
            </>
          )}
        </div>
      </div>

      {previews.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {previews.length} 個のファイルを選択
            </p>
            <button
              type="button"
              onClick={clearPreviews}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
            >
              クリア
            </button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {previews.map((preview, index) => (
              <div
                key={index}
                className="aspect-square bg-gray-100 dark:bg-gray-700 rounded overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

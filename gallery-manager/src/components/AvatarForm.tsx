"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AvatarForm() {
  const router = useRouter();
  const [avatarName, setAvatarName] = useState("");
  const [avatarId, setAvatarId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!avatarName.trim() || !avatarId.trim()) {
      setError("アバター名とIDは必須です");
      return;
    }

    // ID validation (lowercase, alphanumeric, hyphens)
    if (!/^[a-z0-9-]+$/.test(avatarId)) {
      setError("IDは小文字英数字とハイフンのみ使用できます");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/avatars", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: avatarId,
          avatarName: avatarName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "作成に失敗しました");
      }

      router.push(`/avatars/${avatarId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="avatarName"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          アバター名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="avatarName"
          value={avatarName}
          onChange={(e) => setAvatarName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="例: Milltina"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label
          htmlFor="avatarId"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          アバターID <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="avatarId"
          value={avatarId}
          onChange={(e) => setAvatarId(e.target.value.toLowerCase())}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          placeholder="例: milltina"
          pattern="[a-z0-9-]+"
          disabled={isSubmitting}
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          小文字英数字とハイフンのみ使用可能（URLに使用されます）
        </p>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
        >
          {isSubmitting ? "作成中..." : "作成"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          disabled={isSubmitting}
          className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

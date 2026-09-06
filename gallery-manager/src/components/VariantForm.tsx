"use client";

import type { Avatar, Variant } from "@jimixer/gallery-schema";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface VariantFormProps {
  variant: Variant;
  avatars: Avatar[];
}

/**
 * バリアントの表示名とアバターを編集する。
 *
 * 新規作成とは兼用にしない。作成は写真が要る（写真 0 枚のバリアントは
 * 表現できない）ため、そもそも形が違う。
 *
 * カバーはここでは扱わない。バリアント画面の写真グリッドから選ぶ入口が
 * 既にあり、二重に持たせる理由がない。
 */
export function VariantForm({ variant, avatars }: VariantFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(variant.displayName);
  const [avatarId, setAvatarId] = useState(variant.avatarId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/variants/${variant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, avatarId }),
    });

    if (!response.ok) {
      setError((await response.json()).error ?? "保存に失敗しました");
      setBusy(false);
      return;
    }
    router.push(`/variants/${variant.id}`);
    router.refresh();
  }

  const field =
    "w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2";

  return (
    <form onSubmit={submit} className="space-y-4 max-w-lg">
      <label className="block">
        <span className="text-sm text-gray-700 dark:text-gray-300">ID</span>
        <input className={`${field} opacity-50`} value={variant.id} disabled />
        <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
          公開 URL <code className="font-mono">/gallery/{variant.id}/</code> になるため変更できません
        </span>
      </label>
      <label className="block">
        <span className="text-sm text-gray-700 dark:text-gray-300">表示名</span>
        <input
          className={field}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Slim"
          required
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-700 dark:text-gray-300">アバター</span>
        <select
          className={field}
          value={avatarId}
          onChange={(e) => setAvatarId(e.target.value)}
        >
          {avatars.map((avatar) => (
            <option key={avatar.id} value={avatar.id}>
              {avatar.displayName}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
          付け替えても写真と URL はそのまま。変わるのはクレジットの帰属先だけです
        </span>
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium"
      >
        {busy ? "保存中..." : "保存"}
      </button>
    </form>
  );
}

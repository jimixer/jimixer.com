"use client";

import type { Avatar } from "@jimixer/gallery-schema";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AvatarFormProps {
  /** 既存を渡すと編集、渡さないと新規登録になる。 */
  avatar?: Avatar;
}

/** アバター（販売物としてのモデル）の登録・編集。作者クレジットの置き場。 */
export function AvatarForm({ avatar }: AvatarFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    id: avatar?.id ?? "",
    displayName: avatar?.displayName ?? "",
    author: avatar?.author ?? "",
    sourceUrl: avatar?.sourceUrl ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { id, ...rest } = form;
    const response = await fetch(avatar ? `/api/avatars/${avatar.id}` : "/api/avatars", {
      method: avatar ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(avatar ? rest : form),
    });

    if (!response.ok) {
      setError((await response.json()).error ?? "保存に失敗しました");
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  const field = "w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2";

  return (
    <form onSubmit={submit} className="space-y-4 max-w-lg">
      <label className="block">
        <span className="text-sm text-gray-700 dark:text-gray-300">ID</span>
        <input
          className={`${field} ${avatar ? "opacity-50" : ""}`}
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
          placeholder="milltina"
          disabled={Boolean(avatar)}
          required
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-700 dark:text-gray-300">表示名</span>
        <input
          className={field}
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          placeholder="Milltina"
          required
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-700 dark:text-gray-300">作者</span>
        <input
          className={field}
          value={form.author}
          onChange={(e) => setForm({ ...form, author: e.target.value })}
          placeholder="DOLOS art"
          required
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-700 dark:text-gray-300">入手元 URL</span>
        <input
          className={field}
          type="url"
          value={form.sourceUrl}
          onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
          placeholder="https://dolosart.booth.pm/items/6538026"
          required
        />
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

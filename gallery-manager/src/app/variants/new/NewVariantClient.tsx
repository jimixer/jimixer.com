"use client";

import type { Avatar } from "@jimixer/gallery-schema";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PhotoUploader } from "@/components/PhotoUploader";

interface NewVariantClientProps {
  avatars: Avatar[];
}

/**
 * バリアントは写真つきでしか作れない。
 *
 * カバーは必ずそのバリアントの写真であるという不変条件があるため、
 * 写真 0 枚のバリアントはそもそも表現できない。最初の 1 枚がカバーになる。
 */
export function NewVariantClient({ avatars }: NewVariantClientProps) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [avatarId, setAvatarId] = useState(avatars[0]?.id ?? "");
  const [displayName, setDisplayName] = useState("");

  async function create(entries: { file: File; capturedAt: string }[]) {
    const form = new FormData();
    form.set("id", id);
    form.set("avatarId", avatarId);
    form.set("displayName", displayName);
    for (const entry of entries) {
      form.append("file", entry.file);
      form.append("capturedAt", entry.capturedAt);
    }

    const response = await fetch("/api/variants", { method: "POST", body: form });
    if (!response.ok) throw new Error((await response.json()).error);

    router.push(`/variants/${id}`);
    router.refresh();
  }

  const field =
    "w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2";

  if (avatars.length === 0) {
    return (
      <p className="rounded-lg bg-white dark:bg-gray-800 p-6 text-gray-600 dark:text-gray-300">
        先にアバターを登録してください。バリアントは必ずアバターに属します。
      </p>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-gray-700 dark:text-gray-300">ID（URL になる）</span>
          <input
            className={field}
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="milltina-slim"
            required
          />
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
        <label className="block sm:col-span-2">
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
        </label>
      </div>

      <PhotoUploader
        onSubmit={create}
        submitLabel="バリアントを作成"
        disabled={!id || !displayName}
      />
    </div>
  );
}

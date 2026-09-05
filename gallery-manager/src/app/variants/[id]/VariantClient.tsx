"use client";

import type { Avatar, Variant } from "@jimixer/gallery-schema";
import { galleryBaseUrl, monthSections, photoUrl } from "@jimixer/gallery-schema";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PhotoUploader } from "@/components/PhotoUploader";

interface VariantClientProps {
  variant: Variant;
  avatar: Avatar | undefined;
}

export function VariantClient({ variant, avatar }: VariantClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const baseUrl = galleryBaseUrl();
  const sections = monthSections(variant.photos);

  async function call(url: string, init: RequestInit) {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(url, init);
      if (!response.ok) throw new Error((await response.json()).error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function upload(entries: { file: File; capturedAt: string }[]) {
    const form = new FormData();
    for (const entry of entries) {
      form.append("file", entry.file);
      form.append("capturedAt", entry.capturedAt);
    }
    const response = await fetch(`/api/variants/${variant.id}/photos`, {
      method: "POST",
      body: form,
    });
    if (!response.ok) throw new Error((await response.json()).error);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {variant.displayName}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {avatar?.displayName ?? variant.avatarId} · {variant.photos.length} 枚 ·{" "}
            <code className="font-mono">/gallery/{variant.id}/</code>
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!window.confirm(`${variant.displayName} を写真ごと削除します。原本は残ります。`)) {
              return;
            }
            call(`/api/variants/${variant.id}`, { method: "DELETE" }).then(() =>
              router.push("/")
            );
          }}
          className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
        >
          バリアントを削除
        </button>
      </div>

      {error && (
        <p className="rounded border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <PhotoUploader onSubmit={upload} submitLabel="写真を追加" disabled={busy} />

      {sections.map((section) => (
        <section key={section.month} className="space-y-2">
          <h3 className="text-sm font-mono text-gray-500 dark:text-gray-400">
            {section.month} · {section.photos.length}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {section.photos.map((photo) => {
              const isCover = photo.id === variant.coverPhotoId;
              return (
                <div key={photo.id} className="space-y-1">
                  <div
                    className={`aspect-square overflow-hidden rounded ${
                      isCover ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl(photo.id, "thumb", baseUrl)}
                      alt={photo.caption ?? photo.id}
                      className="h-full w-full object-cover"
                      style={{ backgroundColor: photo.dominantColor }}
                    />
                  </div>
                  <p className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
                    {photo.capturedAt.replace("T", " ")}
                  </p>
                  <div className="flex justify-between text-xs">
                    <button
                      type="button"
                      disabled={busy || isCover}
                      onClick={() =>
                        call(`/api/variants/${variant.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ coverPhotoId: photo.id }),
                        })
                      }
                      className="text-blue-600 disabled:text-gray-400 dark:text-blue-400"
                    >
                      {isCover ? "カバー" : "カバーにする"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        call(`/api/variants/${variant.id}/photos/${photo.id}`, {
                          method: "DELETE",
                        })
                      }
                      className="text-red-600 dark:text-red-400"
                    >
                      降ろす
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

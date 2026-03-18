"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { buildImageUrl } from "@/lib/image-url";
import type { GalleryImage } from "@/types/gallery";

interface GalleryGridProps {
  images: GalleryImage[];
  avatarName: string;
}

export default function GalleryGrid({ images, avatarName }: GalleryGridProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const close = useCallback(() => setSelectedIndex(null), []);
  const prev = useCallback(
    () => setSelectedIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null)),
    [images.length]
  );
  const next = useCallback(
    () => setSelectedIndex((i) => (i !== null ? (i + 1) % images.length : null)),
    [images.length]
  );

  useEffect(() => {
    if (selectedIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIndex, close, prev, next]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
        {images.map((image, index) => (
          <button
            key={index}
            className="relative aspect-square overflow-hidden w-full"
            onClick={() => setSelectedIndex(index)}
          >
            <Image
              fill
              src={buildImageUrl(image.url)}
              alt={`${avatarName} - ${index + 1}`}
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 hover:scale-105"
            />
          </button>
        ))}
      </div>

      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={close}
        >
          {/* 前へ */}
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors p-4 text-4xl leading-none"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="前の画像"
          >
            ‹
          </button>

          {/* メイン画像 */}
          <Image
            src={buildImageUrl(images[selectedIndex].url)}
            alt={`${avatarName} - ${selectedIndex + 1}`}
            width={0}
            height={0}
            sizes="90vw"
            style={{ width: 'auto', height: 'auto', maxHeight: '90vh', maxWidth: '90vw' }}
            onClick={(e) => e.stopPropagation()}
          />

          {/* 次へ */}
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors p-4 text-4xl leading-none"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="次の画像"
          >
            ›
          </button>

          {/* カウンター */}
          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm font-mono">
            {selectedIndex + 1} / {images.length}
          </span>

          {/* 閉じる */}
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-2 text-xl leading-none"
            onClick={close}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

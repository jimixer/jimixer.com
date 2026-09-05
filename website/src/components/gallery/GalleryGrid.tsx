"use client";

import type { MonthSection, Photo } from "@jimixer/gallery-schema";
import { useCallback, useEffect, useMemo, useState } from "react";

import PhotoImage from "./PhotoImage";

interface GalleryGridProps {
  /** 撮影日の降順。月が 1 つしかない場合も区切りを出す。 */
  sections: MonthSection[];
  variantName: string;
  baseUrl: string;
}

/** ファーストビューに入る枚数。ここだけ `priority` にする。 */
const EAGER_COUNT = 6;

function monthLabel(month: string): string {
  const [year, m] = month.split("-");
  return `${year}年${Number(m)}月`;
}

function altOf(photo: Photo, variantName: string, position: number): string {
  return photo.caption ?? `${variantName} - ${position}`;
}

export default function GalleryGrid({
  sections,
  variantName,
  baseUrl,
}: GalleryGridProps) {
  // ライトボックスは月をまたいで送るため、区切りとは別に通し順を持つ
  const photos = useMemo(() => sections.flatMap((s) => s.photos), [sections]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const close = useCallback(() => setSelectedIndex(null), []);
  const prev = useCallback(
    () => setSelectedIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null)),
    [photos.length]
  );
  const next = useCallback(
    () => setSelectedIndex((i) => (i !== null ? (i + 1) % photos.length : null)),
    [photos.length]
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

  let position = 0;

  return (
    <>
      {sections.map((section) => (
        <section key={section.month} className="mb-10 last:mb-0">
          <h2 className="mb-2 text-xs font-mono uppercase tracking-[0.3em] text-white/40">
            {monthLabel(section.month)}
            <span className="ml-3 normal-case tracking-normal text-white/25">
              {section.photos.length}
            </span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
            {section.photos.map((photo) => {
              const index = position++;
              return (
                <button
                  key={photo.id}
                  className="relative aspect-square overflow-hidden w-full"
                  onClick={() => setSelectedIndex(index)}
                >
                  <PhotoImage
                    photo={photo}
                    baseUrl={baseUrl}
                    candidates={["thumb", "card"]}
                    fallback="thumb"
                    sizes="(max-width: 768px) 50vw, 320px"
                    alt={altOf(photo, variantName, index + 1)}
                    priority={index < EAGER_COUNT}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={close}
        >
          {/* 前へ */}
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors p-4 text-4xl leading-none"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="前の画像"
          >
            ‹
          </button>

          {/* 画像自体のクリックでは閉じない */}
          <div onClick={(e) => e.stopPropagation()}>
            <PhotoImage
              photo={photos[selectedIndex]}
              baseUrl={baseUrl}
              candidates={["card", "full"]}
              fallback="full"
              sizes="90vw"
              alt={altOf(photos[selectedIndex], variantName, selectedIndex + 1)}
              priority
              className="max-h-[90vh] max-w-[90vw] w-auto h-auto"
            />
          </div>

          {/* 次へ */}
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors p-4 text-4xl leading-none"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="次の画像"
          >
            ›
          </button>

          {/* カウンター */}
          <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm font-mono">
            {selectedIndex + 1} / {photos.length}
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

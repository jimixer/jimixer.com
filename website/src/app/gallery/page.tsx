import { avatarGroups, coverPhoto, galleryBaseUrl } from "@jimixer/gallery-schema";
import type { Metadata } from "next";
import Link from "next/link";

import PhotoImage from "@/components/gallery/PhotoImage";
import { galleryIndex } from "@/lib/gallery";

export const metadata: Metadata = {
  title: "Gallery",
  description: "VRChat で撮影した写真",
};

export default async function GalleryPage() {
  const groups = avatarGroups(await galleryIndex());
  const baseUrl = galleryBaseUrl();

  return (
    <div className="relative min-h-screen">
      {/* モバイル: 縦スタック / デスクトップ: 横スクロール */}
      <div className="md:h-screen md:overflow-x-auto md:overflow-y-hidden">
        <div className="flex flex-col md:flex-row md:h-full gap-0 md:min-w-min px-0 md:px-16">
          {groups.map(({ avatar, variants }) => (
            <section
              key={avatar.id}
              className="flex flex-col md:flex-row md:h-full flex-shrink-0"
            >
              {/* アバターの見出し。バリアントが 1 つでも常に出す */}
              <div className="flex items-center px-4 py-2 bg-neutral-950 border-b border-white/10 md:h-full md:w-10 md:justify-center md:border-b-0 md:border-r md:py-0">
                <h2 className="text-xs font-mono uppercase tracking-[0.3em] text-white/40 md:[writing-mode:vertical-rl] md:rotate-180">
                  {avatar.displayName}
                </h2>
              </div>

              {variants.map((variant) => (
                <Link
                  key={variant.id}
                  href={`/gallery/${variant.id}/`}
                  className="group relative flex-shrink-0"
                >
                  {/* モバイル: 全幅 / デスクトップ: サムネイル（ホバーで拡大） */}
                  <div className="relative h-[50vh] w-full md:h-screen md:w-48 md:group-hover:w-[var(--gallery-card-expanded-width)] bg-neutral-900 border-b md:border-b-0 md:border-r border-white/10 transition-all duration-500 ease-out md:group-hover:shadow-2xl">
                    <div className="relative w-full h-full overflow-hidden">
                      <PhotoImage
                        photo={coverPhoto(variant)}
                        baseUrl={baseUrl}
                        candidates={["thumb", "card", "full"]}
                        fallback="card"
                        sizes="(max-width: 768px) 240px, 600px"
                        alt={variant.displayName}
                        priority
                        className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-auto max-w-none transition-all duration-500 md:group-hover:brightness-110"
                      />

                      {/* モバイル用常時表示タイトル */}
                      <div className="md:hidden absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end">
                        <div className="p-4 text-white w-full">
                          <h3 className="text-xl font-bold drop-shadow">
                            {variant.displayName}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* バリアント名（デスクトップ・右下・縦書き） */}
                    <div className="hidden md:block absolute bottom-6 right-3">
                      <p
                        className="text-4xl font-mono font-bold text-white whitespace-nowrap"
                        style={{
                          writingMode: "vertical-rl",
                          transform: "rotate(180deg)",
                          textShadow: "0 2px 8px rgba(0,0,0,1)",
                        }}
                      >
                        {variant.displayName}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

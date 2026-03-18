import { getGalleryItems } from "@/lib/gallery-loader";
import { buildImageUrl } from "@/lib/image-url";
import Image from "next/image";
import Link from "next/link";

export default function GalleryPage() {
  const items = getGalleryItems();

  return (
    <div className="relative min-h-screen">
      {/* モバイル: 縦スタック / デスクトップ: 横スクロール */}
      <div className="md:h-screen md:overflow-x-auto md:overflow-y-hidden">
        <div className="flex flex-col md:flex-row md:h-full gap-0 md:min-w-min px-0 md:px-16">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/gallery/${item.id}/`}
              className="group relative flex-shrink-0"
            >
              {/* モバイル: 全幅 / デスクトップ: サムネイル（ホバーで拡大） */}
              <div className="relative h-[50vh] w-full md:h-screen md:w-48 md:group-hover:w-[75vh] bg-neutral-900 border-b md:border-b-0 md:border-r border-white/10 transition-all duration-500 ease-out md:group-hover:shadow-2xl">
                <div className="relative w-full h-full overflow-hidden">
                  <Image
                    fill
                    src={buildImageUrl(item.image)}
                    alt={item.avatarName}
                    sizes="(max-width: 768px) 100vw, 75vh"
                    className="object-cover transition-all duration-500 md:group-hover:scale-105 md:group-hover:brightness-110"
                  />

                  {/* モバイル用常時表示タイトル */}
                  <div className="md:hidden absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end">
                    <div className="p-4 text-white w-full">
                      <h2 className="text-xl font-bold drop-shadow">{item.avatarName}</h2>
                    </div>
                  </div>
                </div>

                {/* アバター名（デスクトップ・右下・縦書き） */}
                <div className="hidden md:block absolute bottom-6 right-3">
                  <p
                    className="text-4xl font-mono font-bold text-white whitespace-nowrap"
                    style={{
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      textShadow: '0 2px 8px rgba(0,0,0,1)',
                    }}
                  >
                    {item.avatarName}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>


    </div>
  );
}

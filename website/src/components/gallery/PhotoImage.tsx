import { derivativeSize, photoSrcSet, photoUrl } from "@jimixer/gallery-schema";
import type { DerivativeName, Photo } from "@jimixer/gallery-schema";

interface PhotoImageProps {
  photo: Photo;
  /** 派生物の URL 組み立てに使う。サーバー側で解決して渡す。 */
  baseUrl: string;
  /** `<img sizes>` の値。表示幅を CSS と一致させる。 */
  sizes: string;
  /** srcset に載せる派生物。小さい順に並べる。 */
  candidates: readonly DerivativeName[];
  /** 表示の下限として使う派生物。`src` になる。 */
  fallback: DerivativeName;
  alt: string;
  className?: string;
  /** ファーストビューの数枚だけ true にする。 */
  priority?: boolean;
}

/**
 * 素の `<img>` で写真を出す。
 *
 * next/image は使わない。派生物を別ファイルとして持ち URL を ID から導出する以上、
 * 得られるものが無く、`unoptimized: true` では srcset も生成されないため
 * （docs/gallery-architecture.md §4）。
 *
 * `width` / `height` は必ず派生物の実寸を入れる。原本より大きい派生物は
 * 存在しないので、長辺の目標値をそのまま書くと縦横比が狂う。
 */
export default function PhotoImage({
  photo,
  baseUrl,
  sizes,
  candidates,
  fallback,
  alt,
  className,
  priority = false,
}: PhotoImageProps) {
  const { width, height } = derivativeSize(photo, fallback);

  return (
    <img
      src={photoUrl(photo.id, fallback, baseUrl)}
      srcSet={photoSrcSet(photo, candidates, baseUrl)}
      sizes={sizes}
      width={width}
      height={height}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={className}
      // 読み込み前の穴を埋める。代表色は原本から実測している
      style={photo.dominantColor ? { backgroundColor: photo.dominantColor } : undefined}
    />
  );
}

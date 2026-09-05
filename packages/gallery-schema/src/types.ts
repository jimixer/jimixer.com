/**
 * ギャラリーのドメイン型。
 *
 * 用語は CONTEXT.md の定義に従う。
 * - アバター: 販売物としてのモデル。作者クレジットの帰属先
 * - バリアント: 着せ替えの土台として調整した素体。写真はここにぶら下がる
 * - 写真: 不透明な ID を identity として持つ1枚。URL は ID から導出される
 */

/** アバター（販売物としてのモデル）。 */
export interface Avatar {
  /** `content/avatars/{id}.yml` のファイル名に由来する。 */
  id: string;
  displayName: string;
  author: string;
  sourceUrl: string;
}

/** バリアント（調整した素体）。写真の所属先であり、公開ページの単位。 */
export interface Variant {
  /** `content/gallery/{id}/` のディレクトリ名に由来する。URL の一部になる。 */
  id: string;
  avatarId: string;
  displayName: string;
  /** このバリアントの写真のいずれかを指す。独立したカバーは存在しない。 */
  coverPhotoId: string;
  /** 撮影日の降順。 */
  photos: Photo[];
}

/** 写真1枚。原本・派生物の URL はすべて `id` から導出される。 */
export interface Photo {
  /** 不透明な ID。一度決めたら変更しない。 */
  id: string;
  variantId: string;
  /** ISO8601。撮影日時であり、サイトへの追加日時ではない。 */
  capturedAt: string;
  /** 原本の実寸。ファイル名の解像度表記は当てにならないため実測値を持つ。 */
  width: number;
  height: number;
  /** 表示される説明。あれば `alt` にも流用する。 */
  caption?: string;
  /** 読み込み中のプレースホルダに使う `#rrggbb`。 */
  dominantColor?: string;
}

/** 検証済みのギャラリー全体。 */
export interface GalleryIndex {
  avatars: Avatar[];
  variants: Variant[];
}

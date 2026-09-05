import sharp from "sharp";

import { DERIVATIVE_LONG_EDGE, OG_SIZE, type DerivativeName } from "./urls";

/**
 * 原本から派生物を作る。Node 専用。
 *
 * サイズの定義（`urls.ts`）と同じ場所に置く。配信側が参照する寸法と
 * 生成される画素が別々に決まると、必ずどこかでズレるため。
 */

export type ImageInput = string | Buffer;

const WEBP_OPTIONS = { quality: 85, effort: 6 } as const;

/**
 * すべての写真に対して生成する派生物。
 *
 * OG をカバーだけに絞ると、カバーを差し替えるたびに原本を取り直して
 * 生成する経路が必要になる。1 枚あたり数十 KB なので、全件持つほうが安い。
 */
export const ALL_DERIVATIVES = ["full", "card", "thumb", "og"] as const;

/**
 * 原本の実測値。ファイル名の解像度表記は当てにならないため、必ずここを通す。
 * 代表色は読み込み中のプレースホルダに使う。
 */
export async function measureOriginal(input: ImageInput): Promise<{
  width: number;
  height: number;
  dominantColor: string;
}> {
  const image = sharp(input);
  const [metadata, stats] = await Promise.all([image.metadata(), image.stats()]);
  if (!metadata.width || !metadata.height) {
    throw new Error("画像の実寸を読めません");
  }

  const { r, g, b } = stats.dominant;
  return {
    width: metadata.width,
    height: metadata.height,
    dominantColor: `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`,
  };
}

/**
 * 派生物を 1 つ生成する。
 *
 * `full` / `card` / `thumb` は長辺を合わせるだけで拡大はしない。
 *
 * OG だけは SNS 側の比率（1.91:1）が固定である。縦長の写真から切り出すと
 * 高さの 3 分の 1 しか使えず顔がどこかで切れるため、切り抜かずに全体を収め、
 * 背景に同じ画像をぼかして敷く。余白が事故ではなく意図に見えるようにする。
 */
export async function renderDerivative(
  input: ImageInput,
  name: DerivativeName
): Promise<Buffer> {
  if (name === "og") {
    const [backdrop, photo] = await Promise.all([
      sharp(input)
        .resize(OG_SIZE.width, OG_SIZE.height, { fit: "cover" })
        .blur(28)
        .modulate({ brightness: 0.6 })
        .toBuffer(),
      sharp(input)
        .resize(OG_SIZE.width, OG_SIZE.height, { fit: "inside" })
        .toBuffer(),
    ]);

    return sharp(backdrop)
      .composite([{ input: photo, gravity: "centre" }])
      .webp(WEBP_OPTIONS)
      .toBuffer();
  }

  const longEdge = DERIVATIVE_LONG_EDGE[name];
  return sharp(input)
    .resize(longEdge, longEdge, { fit: "inside", withoutEnlargement: true })
    .webp(WEBP_OPTIONS)
    .toBuffer();
}

import { describe, expect, it } from "vitest";
import {
  derivativeSize,
  originalKey,
  photoKey,
  photoSrcSet,
  photoUrl,
} from "../urls";

const BASE = "https://gallery.example.com";
const portrait = { id: "abc1234567", width: 1080, height: 1920 };

describe("photoKey", () => {
  it("原寸には接尾辞を付けない", () => {
    expect(photoKey("abc1234567")).toBe("gallery/abc1234567.webp");
  });

  it("派生物は長辺を接尾辞にする", () => {
    expect(photoKey("abc1234567", "thumb")).toBe("gallery/abc1234567-640.webp");
    expect(photoKey("abc1234567", "card")).toBe("gallery/abc1234567-1080.webp");
    expect(photoKey("abc1234567", "og")).toBe("gallery/abc1234567-og.webp");
  });

  it("バリアント名も撮影日もキーに含めない", () => {
    expect(photoKey("abc1234567")).not.toMatch(/milltina|2026/);
  });
});

describe("originalKey", () => {
  it("原本は公開プレフィックスの外に置く", () => {
    expect(originalKey("abc1234567")).toBe("originals/abc1234567.png");
    expect(originalKey("abc1234567")).not.toMatch(/^gallery\//);
  });
});

describe("photoUrl", () => {
  it("ベース URL の末尾スラッシュを重複させない", () => {
    expect(photoUrl("abc1234567", "full", `${BASE}/`)).toBe(
      `${BASE}/gallery/abc1234567.webp`
    );
  });
});

describe("derivativeSize", () => {
  it("長辺を目標値に合わせて縦横比を保つ", () => {
    expect(derivativeSize(portrait, "thumb")).toEqual({ width: 360, height: 640 });
  });

  it("原本より大きくはしない", () => {
    // 長辺 1920px の原本に full(2048) を指定しても拡大されない
    expect(derivativeSize(portrait, "full")).toEqual({ width: 1080, height: 1920 });
  });

  it("OG は比率が違うので固定サイズを返す", () => {
    expect(derivativeSize(portrait, "og")).toEqual({ width: 1200, height: 630 });
  });
});

describe("photoSrcSet", () => {
  it("幅記述子には長辺ではなく派生物の実際の幅を使う", () => {
    // 縦長なので card(長辺1080) の幅は 1080 ではなく 608
    expect(photoSrcSet(portrait, ["thumb", "card"], BASE)).toBe(
      `${BASE}/gallery/abc1234567-640.webp 360w, ${BASE}/gallery/abc1234567-1080.webp 608w`
    );
  });
});

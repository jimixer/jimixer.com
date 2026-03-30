import { describe, it, expect } from "vitest";
import { sortImages } from "@/lib/gallery-loader";

// helper: url オブジェクト配列を生成
const urls = (...paths: string[]) => paths.map((url) => ({ url }));
const toUrls = (items: { url: string }[]) => items.map((i) => i.url);

describe("sortImages", () => {
  describe("番号付きファイルは先頭に固定される", () => {
    it("番号付きファイルが VRChat スクリーンショットより前に来る", () => {
      const input = urls(
        "/gallery/milltina/milltina-vrchat-2026-03-18-03-01-17-305-1080x1920-1773804567695.webp",
        "/gallery/milltina/milltina-01.webp",
        "/gallery/milltina/milltina-02.webp"
      );
      const result = toUrls(sortImages(input, "milltina"));
      expect(result[0]).toContain("milltina-01.webp");
      expect(result[1]).toContain("milltina-02.webp");
      expect(result[2]).toContain("vrchat");
    });

    it("番号付きファイルは番号順にサブソートされる", () => {
      const input = urls(
        "/gallery/kipfel/kipfel-03.webp",
        "/gallery/kipfel/kipfel-01.webp",
        "/gallery/kipfel/kipfel-02.webp"
      );
      const result = toUrls(sortImages(input, "kipfel"));
      expect(result).toEqual([
        "/gallery/kipfel/kipfel-01.webp",
        "/gallery/kipfel/kipfel-02.webp",
        "/gallery/kipfel/kipfel-03.webp",
      ]);
    });
  });

  describe("VRChat スクリーンショットは日時昇順になる", () => {
    it("日付が異なる場合に昇順で並ぶ", () => {
      const input = urls(
        "/gallery/milltina/milltina-vrchat-2026-03-20-04-26-59-618-1080x1920-1773999000484.webp",
        "/gallery/milltina/milltina-vrchat-2026-03-18-03-01-17-305-1080x1920-1773804567695.webp",
        "/gallery/milltina/milltina-vrchat-2026-03-19-02-15-19-138-1080x1920-1773998999542.webp"
      );
      const result = toUrls(sortImages(input, "milltina"));
      expect(result[0]).toContain("03-18");
      expect(result[1]).toContain("03-19");
      expect(result[2]).toContain("03-20");
    });

    it("同日で時刻が異なる場合に昇順で並ぶ", () => {
      const input = urls(
        "/gallery/milltina/milltina-vrchat-2026-03-25-00-57-33-853-1080x1920-1774894590444.webp",
        "/gallery/milltina/milltina-vrchat-2026-03-25-00-46-43-536-1080x1920-1774894591173.webp",
        "/gallery/milltina/milltina-vrchat-2026-03-25-00-48-39-220-1920x1080-1774894589845.webp"
      );
      const result = toUrls(sortImages(input, "milltina"));
      expect(result[0]).toContain("00-46");
      expect(result[1]).toContain("00-48");
      expect(result[2]).toContain("00-57");
    });

    it("同日同時刻でミリ秒が異なる場合に昇順で並ぶ", () => {
      // vrchat パターンは秒まで、同秒のケースはファイル名の辞書順に依存
      const input = urls(
        "/gallery/milltina/milltina-vrchat-2026-03-18-03-03-02-556-1080x1920-1773806543024.webp",
        "/gallery/milltina/milltina-vrchat-2026-03-18-03-01-17-305-1080x1920-1773804567695.webp"
      );
      const result = toUrls(sortImages(input, "milltina"));
      expect(result[0]).toContain("03-01");
      expect(result[1]).toContain("03-03");
    });
  });

  describe("番号付きと VRChat の混在", () => {
    it("番号付きが先頭、VRChat が後続となる", () => {
      const input = urls(
        "/gallery/milltina/milltina-vrchat-2026-03-19-02-15-19-138-1080x1920-1773998999542.webp",
        "/gallery/milltina/milltina-02.webp",
        "/gallery/milltina/milltina-vrchat-2026-03-18-03-01-17-305-1080x1920-1773804567695.webp",
        "/gallery/milltina/milltina-01.webp"
      );
      const result = toUrls(sortImages(input, "milltina"));
      expect(result[0]).toContain("milltina-01.webp");
      expect(result[1]).toContain("milltina-02.webp");
      expect(result[2]).toContain("03-18");
      expect(result[3]).toContain("03-19");
    });
  });

  describe("元の配列を変更しない（immutability）", () => {
    it("入力配列が変更されない", () => {
      const input = urls(
        "/gallery/kipfel/kipfel-02.webp",
        "/gallery/kipfel/kipfel-01.webp"
      );
      const original = input.map((i) => i.url);
      sortImages(input, "kipfel");
      expect(input.map((i) => i.url)).toEqual(original);
    });
  });

  describe("空・単一要素", () => {
    it("空配列をそのまま返す", () => {
      expect(sortImages([], "milltina")).toEqual([]);
    });

    it("単一要素をそのまま返す", () => {
      const input = urls("/gallery/milltina/milltina-01.webp");
      expect(sortImages(input, "milltina")).toEqual(input);
    });
  });
});

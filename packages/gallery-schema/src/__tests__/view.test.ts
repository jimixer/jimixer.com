import { describe, expect, it } from "vitest";
import type { Avatar, GalleryIndex, Photo, Variant } from "../types.js";
import { avatarGroups, monthSections } from "../view.js";

function photo(id: string, capturedAt: string, variantId = "v"): Photo {
  return { id, variantId, capturedAt, width: 1080, height: 1920 };
}

function avatar(id: string): Avatar {
  return { id, displayName: id, author: "someone", sourceUrl: "https://example.com/1" };
}

function variant(id: string, avatarId: string, photos: Photo[]): Variant {
  return { id, avatarId, displayName: id, coverPhotoId: photos[0].id, photos };
}

describe("avatarGroups", () => {
  const index: GalleryIndex = {
    avatars: [avatar("alpha"), avatar("bravo"), avatar("unused")],
    variants: [
      variant("alpha-1", "alpha", [photo("a000000001", "2026-01-05T00:00:00")]),
      variant("alpha-2", "alpha", [photo("a000000002", "2026-05-05T00:00:00")]),
      variant("bravo-1", "bravo", [photo("b000000001", "2026-03-05T00:00:00")]),
    ],
  };

  it("アバター群を最新の撮影日が新しい順に並べる", () => {
    expect(avatarGroups(index).map((g) => g.avatar.id)).toEqual(["alpha", "bravo"]);
  });

  it("群内のバリアントも最新の撮影日が新しい順に並べる", () => {
    expect(avatarGroups(index)[0].variants.map((v) => v.id)).toEqual(["alpha-2", "alpha-1"]);
  });

  it("バリアントを持たないアバターは出さない", () => {
    expect(avatarGroups(index).map((g) => g.avatar.id)).not.toContain("unused");
  });
});

describe("monthSections", () => {
  it("撮影日の降順で月ごとにまとめる", () => {
    const sections = monthSections([
      photo("p000000001", "2026-03-01T10:00:00"),
      photo("p000000002", "2026-05-20T10:00:00"),
      photo("p000000003", "2026-03-31T23:59:59"),
    ]);

    expect(sections.map((s) => s.month)).toEqual(["2026-05", "2026-03"]);
    expect(sections[1].photos.map((p) => p.id)).toEqual(["p000000003", "p000000001"]);
  });

  it("同じ月が離れて現れることはない", () => {
    const months = monthSections([
      photo("p000000001", "2026-03-01T10:00:00"),
      photo("p000000002", "2026-05-20T10:00:00"),
      photo("p000000003", "2026-03-31T10:00:00"),
    ]).map((s) => s.month);

    expect(new Set(months).size).toBe(months.length);
  });
});

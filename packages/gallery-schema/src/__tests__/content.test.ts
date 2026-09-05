import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  GalleryContentError,
  loadGallery,
  newPhotoId,
  sidecarBasename,
  writePhoto,
} from "../content.js";
import { PHOTO_ID_PATTERN } from "../schema.js";

let dir: string;

const AVATAR = `displayName: Milltina
author: DOLOS art
sourceUrl: https://dolosart.booth.pm/items/6538026
`;

async function write(rel: string, body: string): Promise<void> {
  const file = path.join(dir, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body, "utf-8");
}

async function seed(): Promise<void> {
  await write("avatars/milltina.yml", AVATAR);
  await write(
    "gallery/milltina/_variant.yml",
    `avatar: milltina\ndisplayName: Milltina\ncoverPhotoId: aaaaaaaaaa\n`
  );
  await write(
    "gallery/milltina/2026-03-15-041408-aaaaaaaaaa.yml",
    `id: aaaaaaaaaa\ncapturedAt: 2026-03-15T04:14:08\nwidth: 1080\nheight: 1920\n`
  );
  await write(
    "gallery/milltina/2026-03-05-023133-bbbbbbbbbb.yml",
    `id: bbbbbbbbbb\ncapturedAt: 2026-03-05T02:31:33\nwidth: 1080\nheight: 1920\n`
  );
}

async function expectIssue(match: RegExp): Promise<void> {
  const error = await loadGallery(dir).catch((e) => e);
  expect(error).toBeInstanceOf(GalleryContentError);
  expect((error as GalleryContentError).issues.join("\n")).toMatch(match);
}

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "gallery-schema-"));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("newPhotoId", () => {
  it("不透明な固定長 ID を返す", () => {
    expect(newPhotoId()).toMatch(PHOTO_ID_PATTERN);
  });

  it("衝突しない", () => {
    const ids = new Set(Array.from({ length: 500 }, () => newPhotoId()));
    expect(ids.size).toBe(500);
  });
});

describe("sidecarBasename", () => {
  it("撮影日時を前置して時系列に並ぶようにする", () => {
    expect(sidecarBasename("2026-03-15T04:14:08", "aaaaaaaaaa")).toBe(
      "2026-03-15-041408-aaaaaaaaaa.yml"
    );
  });
});

describe("loadGallery", () => {
  it("アバターとバリアントを読み、写真を撮影日の降順に並べる", async () => {
    await seed();
    const index = await loadGallery(dir);

    expect(index.avatars).toEqual([
      {
        id: "milltina",
        displayName: "Milltina",
        author: "DOLOS art",
        sourceUrl: "https://dolosart.booth.pm/items/6538026",
      },
    ]);
    expect(index.variants[0].photos.map((p) => p.id)).toEqual([
      "aaaaaaaaaa",
      "bbbbbbbbbb",
    ]);
    expect(index.variants[0].photos[0].variantId).toBe("milltina");
  });

  it("存在しないアバターへの参照を検出する", async () => {
    await seed();
    await write(
      "gallery/milltina/_variant.yml",
      `avatar: nosuch\ndisplayName: Milltina\ncoverPhotoId: aaaaaaaaaa\n`
    );
    await expectIssue(/アバター nosuch が存在しません/);
  });

  it("カバーがそのバリアントの写真でない場合を検出する", async () => {
    await seed();
    await write(
      "gallery/milltina/_variant.yml",
      `avatar: milltina\ndisplayName: Milltina\ncoverPhotoId: cccccccccc\n`
    );
    await expectIssue(/カバー cccccccccc がこのバリアントの写真にありません/);
  });

  it("ファイル名と内容の食い違いを検出する", async () => {
    await seed();
    await write(
      "gallery/milltina/2020-01-01-000000-aaaaaaaaaa.yml",
      `id: aaaaaaaaaa\ncapturedAt: 2026-03-15T04:14:08\nwidth: 1080\nheight: 1920\n`
    );
    await expectIssue(/ファイル名が内容と一致しません/);
  });

  it("写真 ID の重複を検出する", async () => {
    await seed();
    await write(
      "gallery/milltina/2026-04-01-000000-aaaaaaaaaa.yml",
      `id: aaaaaaaaaa\ncapturedAt: 2026-04-01T00:00:00\nwidth: 1080\nheight: 1920\n`
    );
    await expectIssue(/重複しています/);
  });

  it("未知のフィールドを弾く", async () => {
    await seed();
    await write(
      "gallery/milltina/2026-03-15-041408-aaaaaaaaaa.yml",
      `id: aaaaaaaaaa\ncapturedAt: 2026-03-15T04:14:08\nwidth: 1080\nheight: 1920\nworld: somewhere\n`
    );
    await expectIssue(/world/);
  });

  it("不正な内容をすべて列挙する", async () => {
    await seed();
    await write(
      "gallery/milltina/2026-03-05-023133-bbbbbbbbbb.yml",
      `id: bbbbbbbbbb\ncapturedAt: 2026/03/05 02:31\nwidth: 0\nheight: 1920\n`
    );
    const error = (await loadGallery(dir).catch((e) => e)) as GalleryContentError;
    expect(error.issues.length).toBeGreaterThanOrEqual(2);
  });
});

describe("writePhoto", () => {
  it("内容から決まるファイル名で書き、そのまま読み戻せる", async () => {
    await seed();
    const photo = {
      id: newPhotoId(),
      variantId: "milltina",
      capturedAt: "2026-06-01T12:00:00",
      width: 1920,
      height: 1080,
      caption: "テスト",
    };

    const file = await writePhoto(dir, photo);
    expect(path.basename(file)).toBe(sidecarBasename(photo.capturedAt, photo.id));

    const index = await loadGallery(dir);
    expect(index.variants[0].photos[0]).toEqual(photo);
  });
});

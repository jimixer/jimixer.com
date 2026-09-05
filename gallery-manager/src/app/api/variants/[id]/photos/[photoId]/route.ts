import { NextRequest, NextResponse } from "next/server";

import { readGallery } from "@/lib/content";
import { fail, failFrom } from "@/lib/http";
import { removePhoto } from "@/lib/photos";

interface Context {
  params: { id: string; photoId: string };
}

/**
 * 写真をサイトから降ろす。原本は消さない。
 *
 * カバーと最後の 1 枚は消せない。どちらもバリアントの不変条件を壊すため、
 * 前者はカバーを変更してから、後者はバリアントごと削除する。
 */
export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const { variants } = await readGallery();
    const variant = variants.find((v) => v.id === params.id);
    if (!variant) return fail("バリアントが見つかりません", 404);

    const photo = variant.photos.find((p) => p.id === params.photoId);
    if (!photo) return fail("写真が見つかりません", 404);

    if (variant.photos.length === 1) {
      return fail("最後の 1 枚は削除できません。バリアントごと削除してください", 409);
    }
    if (variant.coverPhotoId === photo.id) {
      return fail("カバーは削除できません。先にカバーを変更してください", 409);
    }

    await removePhoto(photo);
    return NextResponse.json({ success: true });
  } catch (error) {
    return failFrom(error);
  }
}

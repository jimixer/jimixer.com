import { deleteVariant, writeVariant } from "@jimixer/gallery-schema/content";
import { NextRequest, NextResponse } from "next/server";

import { contentDir, readGallery } from "@/lib/content";
import { fail, failFrom } from "@/lib/http";
import { removePhoto } from "@/lib/photos";

interface Context {
  params: { id: string };
}

/** 表示名とカバーを変更する。カバーはそのバリアントの写真でなければならない。 */
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const { variants } = await readGallery();
    const variant = variants.find((v) => v.id === params.id);
    if (!variant) return fail("バリアントが見つかりません", 404);

    const body = await request.json();
    const displayName = (body.displayName ?? variant.displayName).trim();
    const coverPhotoId = body.coverPhotoId ?? variant.coverPhotoId;

    if (!displayName) return fail("表示名を入力してください", 400);
    if (!variant.photos.some((p) => p.id === coverPhotoId)) {
      return fail("カバーはこのバリアントの写真から選んでください", 400);
    }

    await writeVariant(contentDir(), {
      id: variant.id,
      avatarId: variant.avatarId,
      displayName,
      coverPhotoId,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return failFrom(error);
  }
}

/** バリアントを写真ごと削除する。原本は残る。 */
export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const { variants } = await readGallery();
    const variant = variants.find((v) => v.id === params.id);
    if (!variant) return fail("バリアントが見つかりません", 404);

    for (const photo of variant.photos) {
      await removePhoto(photo);
    }
    await deleteVariant(contentDir(), variant.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return failFrom(error);
  }
}

import { avatarFileSchema } from "@jimixer/gallery-schema";
import { deleteAvatar, writeAvatar } from "@jimixer/gallery-schema/content";
import { NextRequest, NextResponse } from "next/server";

import { contentDir, readGallery } from "@/lib/content";
import { fail, failFrom } from "@/lib/http";

interface Context {
  params: { id: string };
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const { avatars } = await readGallery();
    const current = avatars.find((a) => a.id === params.id);
    if (!current) return fail("アバターが見つかりません", 404);

    const parsed = avatarFileSchema.safeParse({ ...current, ...(await request.json()) });
    if (!parsed.success) {
      return fail(parsed.error.issues.map((i) => i.message).join(" / "), 400);
    }

    await writeAvatar(contentDir(), { id: params.id, ...parsed.data });
    return NextResponse.json({ avatar: { id: params.id, ...parsed.data } });
  } catch (error) {
    return failFrom(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const { avatars, variants } = await readGallery();
    if (!avatars.some((a) => a.id === params.id)) {
      return fail("アバターが見つかりません", 404);
    }

    // 参照が残ったまま消すと、次の読み込みで全体が検証エラーになる
    const referencing = variants.filter((v) => v.avatarId === params.id);
    if (referencing.length > 0) {
      return fail(
        `バリアント ${referencing.map((v) => v.id).join(", ")} から参照されています`,
        409
      );
    }

    await deleteAvatar(contentDir(), params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return failFrom(error);
  }
}

import { SLUG_PATTERN } from "@jimixer/gallery-schema";
import { avatarFileSchema } from "@jimixer/gallery-schema";
import { writeAvatar } from "@jimixer/gallery-schema/content";
import { NextRequest, NextResponse } from "next/server";

import { contentDir, readGallery } from "@/lib/content";
import { fail, failFrom } from "@/lib/http";

export async function GET() {
  try {
    const { avatars } = await readGallery();
    return NextResponse.json({ avatars });
  } catch (error) {
    return failFrom(error);
  }
}

/** アバター（販売物としてのモデル）を登録する。バリアントから参照される。 */
export async function POST(request: NextRequest) {
  try {
    const { id, ...rest } = await request.json();

    if (typeof id !== "string" || !SLUG_PATTERN.test(id)) {
      return fail("ID は英小文字・数字・ハイフンのみ使用できます", 400);
    }
    const parsed = avatarFileSchema.safeParse(rest);
    if (!parsed.success) {
      return fail(parsed.error.issues.map((i) => i.message).join(" / "), 400);
    }

    const { avatars } = await readGallery();
    if (avatars.some((a) => a.id === id)) {
      return fail(`アバター ${id} は既に登録されています`, 409);
    }

    await writeAvatar(contentDir(), { id, ...parsed.data });
    return NextResponse.json({ avatar: { id, ...parsed.data } }, { status: 201 });
  } catch (error) {
    return failFrom(error);
  }
}

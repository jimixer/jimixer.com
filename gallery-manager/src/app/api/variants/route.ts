import { SLUG_PATTERN } from "@jimixer/gallery-schema";
import { writeVariant } from "@jimixer/gallery-schema/content";
import { NextRequest, NextResponse } from "next/server";

import { contentDir, readGallery } from "@/lib/content";
import { fail, failFrom } from "@/lib/http";
import { addPhoto } from "@/lib/photos";
import { readUploads } from "@/lib/uploads";

export async function GET() {
  try {
    const { variants } = await readGallery();
    return NextResponse.json({ variants });
  } catch (error) {
    return failFrom(error);
  }
}

/**
 * バリアントを写真つきで作る。
 *
 * 写真が 0 枚のバリアントは作れない。カバーは必ずそのバリアントの写真である
 * という不変条件があるため、空のバリアントはそもそも表現できない。
 * 最初の 1 枚がカバーになる。
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const id = String(form.get("id") ?? "");
    const avatarId = String(form.get("avatarId") ?? "");
    const displayName = String(form.get("displayName") ?? "").trim();

    if (!SLUG_PATTERN.test(id)) {
      return fail("ID は英小文字・数字・ハイフンのみ使用できます", 400);
    }
    if (!displayName) return fail("表示名を入力してください", 400);

    const { avatars, variants } = await readGallery();
    if (variants.some((v) => v.id === id)) {
      return fail(`バリアント ${id} は既に存在します`, 409);
    }
    if (!avatars.some((a) => a.id === avatarId)) {
      return fail(`アバター ${avatarId} が存在しません`, 400);
    }

    const uploads = await readUploads(form);
    if (uploads.length === 0) {
      return fail("写真を 1 枚以上選んでください", 400);
    }

    const added = [];
    for (const upload of uploads) {
      added.push(await addPhoto({ variantId: id, ...upload }));
    }

    await writeVariant(contentDir(), {
      id,
      avatarId,
      displayName,
      coverPhotoId: added[0].id,
    });

    return NextResponse.json({ variantId: id, added: added.length }, { status: 201 });
  } catch (error) {
    return failFrom(error);
  }
}

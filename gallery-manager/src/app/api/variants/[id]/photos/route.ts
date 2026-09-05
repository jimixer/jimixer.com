import { NextRequest, NextResponse } from "next/server";

import { readGallery } from "@/lib/content";
import { fail, failFrom } from "@/lib/http";
import { addPhoto } from "@/lib/photos";
import { readUploads } from "@/lib/uploads";

interface Context {
  params: { id: string };
}

/** 写真を追加する。順序が契約になっているので lib/photos.ts に委ねる。 */
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { variants } = await readGallery();
    if (!variants.some((v) => v.id === params.id)) {
      return fail("バリアントが見つかりません", 404);
    }

    const uploads = await readUploads(await request.formData());
    if (uploads.length === 0) return fail("写真が選ばれていません", 400);

    const added = [];
    for (const upload of uploads) {
      added.push(await addPhoto({ variantId: params.id, ...upload }));
    }

    return NextResponse.json({ added: added.length, photos: added });
  } catch (error) {
    return failFrom(error);
  }
}

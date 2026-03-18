import { NextRequest, NextResponse } from "next/server";
import { loadGalleryData, saveGalleryData } from "@/lib/gallery-loader";

/**
 * GET /api/avatars/[id] - 特定のアバター取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const avatars = await loadGalleryData();
    const avatar = avatars.find((a) => a.id === params.id);

    if (!avatar) {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
    }

    return NextResponse.json({ avatar });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load avatar" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/avatars/[id] - アバター削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const avatars = await loadGalleryData();
    const index = avatars.findIndex((a) => a.id === params.id);

    if (index === -1) {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
    }

    avatars.splice(index, 1);
    await saveGalleryData(avatars);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete avatar:", error);
    return NextResponse.json(
      { error: "Failed to delete avatar" },
      { status: 500 }
    );
  }
}

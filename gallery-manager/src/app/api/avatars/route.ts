import { NextRequest, NextResponse } from "next/server";
import { loadGalleryData, saveGalleryData } from "@/lib/gallery-loader";
import type { GalleryContent } from "@/types/content";

/**
 * GET /api/avatars - アバター一覧取得
 */
export async function GET() {
  try {
    const avatars = await loadGalleryData();
    return NextResponse.json({ avatars });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load avatars" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/avatars - 新規アバター作成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, avatarName } = body;

    if (!id || !avatarName) {
      return NextResponse.json(
        { error: "ID and avatar name are required" },
        { status: 400 }
      );
    }

    // ID validation
    if (!/^[a-z0-9-]+$/.test(id)) {
      return NextResponse.json(
        { error: "ID must contain only lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    const avatars = await loadGalleryData();

    // Check for duplicate ID
    if (avatars.some((avatar) => avatar.id === id)) {
      return NextResponse.json(
        { error: "Avatar with this ID already exists" },
        { status: 409 }
      );
    }

    // Create new avatar
    const newAvatar: GalleryContent = {
      type: "gallery",
      id,
      avatarName,
      image: "", // 後で画像アップロード時に設定
      images: [],
    };

    avatars.push(newAvatar);
    await saveGalleryData(avatars);

    return NextResponse.json({ avatar: newAvatar }, { status: 201 });
  } catch (error) {
    console.error("Failed to create avatar:", error);
    return NextResponse.json(
      { error: "Failed to create avatar" },
      { status: 500 }
    );
  }
}

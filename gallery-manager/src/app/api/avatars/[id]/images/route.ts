import { NextRequest, NextResponse } from "next/server";
import { getGalleryItemById, saveGalleryData, loadGalleryData } from "@/lib/gallery-loader";
import { convertToWebP, generateImageFilename } from "@/lib/image-processor";
import { uploadToS3, generateS3Key } from "@/lib/s3-uploader";

/**
 * POST /api/avatars/[id]/images - 画像アップロード
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const avatar = await getGalleryItemById(params.id);

    if (!avatar) {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const images = formData.getAll("images") as File[];

    if (images.length === 0) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 }
      );
    }

    const uploadedImages = [];

    // Process each image
    for (const image of images) {
      // Convert to buffer
      const arrayBuffer = await image.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Convert to WebP
      const webpBuffer = await convertToWebP(buffer, {
        quality: 85,
        maxWidth: 2048,
        maxHeight: 2048,
      });

      // Generate filename and S3 key
      const filename = generateImageFilename(params.id, image.name);
      const s3Key = generateS3Key(params.id, filename);

      // Upload to S3
      const uploadResult = await uploadToS3(webpBuffer, s3Key);

      uploadedImages.push({
        url: uploadResult.url,
      });
    }

    // Update gallery.json
    avatar.images.push(...uploadedImages);

    // Set main image if not set
    if (!avatar.image && uploadedImages.length > 0) {
      avatar.image = uploadedImages[0].url;
    }

    const allAvatars = await loadGalleryData();
    const index = allAvatars.findIndex((a) => a.id === params.id);
    if (index !== -1) {
      allAvatars[index] = avatar;
      await saveGalleryData(allAvatars);
    }

    return NextResponse.json({
      success: true,
      uploadedCount: uploadedImages.length,
      images: uploadedImages,
    });
  } catch (error) {
    console.error("Failed to upload images:", error);
    return NextResponse.json(
      { error: "Failed to upload images" },
      { status: 500 }
    );
  }
}

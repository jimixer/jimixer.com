import sharp from "sharp";
import type { ImageProcessOptions } from "@/types/upload";

/**
 * Convert image to WebP format
 */
export async function convertToWebP(
  buffer: Buffer,
  options: ImageProcessOptions = {}
): Promise<Buffer> {
  const { quality = 85, maxWidth = 2048, maxHeight = 2048 } = options;

  let pipeline = sharp(buffer);

  // Get image metadata
  const metadata = await pipeline.metadata();

  // Resize if needed
  if (
    metadata.width &&
    metadata.height &&
    (metadata.width > maxWidth || metadata.height > maxHeight)
  ) {
    pipeline = pipeline.resize(maxWidth, maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // Convert to WebP
  return pipeline
    .webp({
      quality,
      effort: 6,
    })
    .toBuffer();
}

/**
 * Generate a unique filename with timestamp
 */
export function generateImageFilename(
  avatarId: string,
  originalName: string
): string {
  const timestamp = Date.now();
  const sanitized = originalName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9-]/gi, "-")
    .toLowerCase();
  return `${avatarId}-${sanitized}-${timestamp}.webp`;
}

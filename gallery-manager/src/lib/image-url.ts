/**
 * Build full image URL from relative path
 */
export function buildImageUrl(path: string): string {
  if (!path) return "";

  // Already a full URL
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Build URL from environment variable
  const baseUrl = process.env.NEXT_PUBLIC_GALLERY_URL || "";
  return baseUrl ? `${baseUrl}${path}` : path;
}

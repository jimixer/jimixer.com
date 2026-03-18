/**
 * Build full image URL from relative path
 *
 * @note This is shared logic with gallery-manager/src/lib/image-url.ts
 *       If you modify this, update the other file as well.
 * @see gallery-manager/src/lib/image-url.ts
 */
export function buildImageUrl(path: string): string {
  if (!path) return "";

  // Already a full URL
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Build URL from environment variable or fallback to prod domain
  const baseUrl = process.env.NEXT_PUBLIC_GALLERY_URL ||
                  "https://gallery.jimixer.com";
  return `${baseUrl}${path}`;
}

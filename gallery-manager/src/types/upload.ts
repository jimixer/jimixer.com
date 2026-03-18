/**
 * S3 upload result
 */
export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

/**
 * Image processing options
 */
export interface ImageProcessOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

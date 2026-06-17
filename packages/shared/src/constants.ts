export const THUMBNAIL_WIDTH = 400;
export const PREVIEW_WIDTH = 1200;
export const MAX_PREVIEW_WIDTH = 2400;

export const PHOTO_ACCEPT_MIMES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB per file
export const MAX_GALLERY_PHOTOS = 5000;

export const DOWNLOAD_SIZE_LABELS = {
  web: "Web (1200px)",
  highres: "High Resolution",
  original: "Original",
} as const;

export const ZIP_CHUNK_SIZE = 64 * 1024; // 64KB chunks for streaming

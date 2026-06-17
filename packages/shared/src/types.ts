export interface GalleryResponse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  downloadPermission: "NONE" | "SINGLE" | "SELECTION" | "ALL";
  favoritesEnabled: boolean;
  watermarkEnabled: boolean;
  createdAt: string;
  collections: CollectionResponse[];
}

export interface CollectionResponse {
  id: string;
  title: string;
  sortOrder: number;
  photos: PhotoResponse[];
}

export interface PhotoResponse {
  id: string;
  fileName: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  thumbnailUrl: string;
  previewUrl: string;
  originalUrl: string;
  blurhash: string | null;
  sortOrder: number;
  faces: FaceResponse[];
}

export interface FaceResponse {
  id: string;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  personLabel: string | null;
}

export interface DownloadLogResponse {
  id: string;
  downloadType: string;
  photoCount: number;
  sizeBytes: number;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

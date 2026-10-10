import "server-only";

import { previewUrl, type StoredAsset } from "@/server/storage";

import type { TaskCover } from "../schema";

/** Wide enough for the task panel's banner; cards are narrower. */
const COVER_WIDTH = 800;

export const COVER_FORMATS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "svg",
  "bmp",
  "heic",
]);

export function toCover(asset: StoredAsset | null): TaskCover | null {
  if (!asset) return null;
  const url = previewUrl(asset, COVER_WIDTH);
  if (!url) return null;
  return { id: asset.publicId, url, width: asset.width, height: asset.height };
}

import "server-only";

import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

import { v2 as cld } from "cloudinary";

import { cloudinaryConfig } from "@/server/env";

/**
 * File storage for the Vault (ADR 0013). Cloudinary for now, behind this module only:
 * callers deal in `StoredAsset` and URLs, so an S3-compatible store can replace it.
 *
 * Every asset is `authenticated` (never public): the app hands out signed delivery URLs,
 * and downloads go through short-lived signed links after an ownership check.
 */

if (cloudinaryConfig) {
  cld.config({
    cloud_name: cloudinaryConfig.cloudName,
    api_key: cloudinaryConfig.apiKey,
    api_secret: cloudinaryConfig.apiSecret,
    secure: true,
  });
}

export const storageEnabled = cloudinaryConfig !== null;

/** Cloudinary's free plan caps a file at 10 MB. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type StoredAsset = {
  provider: "cloudinary";
  publicId: string;
  resourceType: "image" | "video" | "raw";
  format: string | null;
  version: number;
  bytes: number;
  width: number | null;
  height: number | null;
  pages: number | null;
  /** The original file name, with its extension. */
  filename: string;
};

/** Files Cloudinary can render (images, PDFs, design files) or play; the rest stay raw. */
const MEDIA = new Set(
  (
    "jpg jpeg png gif webp avif svg bmp tif tiff ico heic heif psd pdf ai eps " +
    "mp4 mov webm m4v avi mkv mp3 wav ogg m4a flac"
  ).split(" "),
);
/** Formats a browser shows as they are; others get converted for previews. */
const BROWSER_IMAGES = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif"]);

export const extensionOf = (filename: string) => {
  const match = /\.([a-z0-9]{1,8})$/i.exec(filename);
  return match ? match[1]!.toLowerCase() : "";
};

const folderOf = (spaceId: string) => `wanna-space/${spaceId}`;

function requireConfig() {
  if (!cloudinaryConfig) throw new Error("File storage isn't configured.");
  return cloudinaryConfig;
}

/**
 * Parameters for one direct browser → Cloudinary upload into the space's folder. The
 * public id is chosen (and signed) here, so the client can't write anywhere else.
 */
export function signUpload(spaceId: string, filename: string) {
  const config = requireConfig();
  const ext = extensionOf(filename);
  // Raw files keep their extension in the id; images and videos must not have one.
  const suffix = ext && !MEDIA.has(ext) ? `.${ext}` : "";
  const params = {
    colors: "true",
    public_id: `${folderOf(spaceId)}/${randomUUID()}${suffix}`,
    timestamp: String(Math.round(Date.now() / 1000)),
    type: "authenticated",
  };
  return {
    url: `https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`,
    fields: {
      ...params,
      api_key: config.apiKey,
      signature: cld.utils.api_sign_request(params, config.apiSecret),
    },
  };
}

/** Cloudinary signs its upload responses; only accept ones for this space's folder. */
export function verifyUpload(
  spaceId: string,
  response: { publicId: string; version: number; signature: string },
) {
  if (!cloudinaryConfig) return false;
  if (!response.publicId.startsWith(`${folderOf(spaceId)}/`)) return false;
  if (!/^([0-9a-f]{40}|[0-9a-f]{64})$/i.test(response.signature)) return false;
  const given = Buffer.from(response.signature, "hex");
  // Accounts sign with SHA-1 unless switched to SHA-256 in the console.
  const expected = createHash(given.length === 32 ? "sha256" : "sha1")
    .update(
      `public_id=${response.publicId}&version=${response.version}${cloudinaryConfig.apiSecret}`,
    )
    .digest();
  return timingSafeEqual(given, expected);
}

type UploadResult = {
  public_id: string;
  version: number;
  format?: string;
  bytes: number;
  width?: number;
  height?: number;
  pages?: number;
  colors?: [string, number][];
};

const toAsset = (
  r: UploadResult,
  resourceType: StoredAsset["resourceType"],
  filename: string,
): StoredAsset => ({
  provider: "cloudinary",
  publicId: r.public_id,
  resourceType,
  format: r.format || null,
  version: r.version,
  bytes: r.bytes,
  width: r.width ?? null,
  height: r.height ?? null,
  pages: r.pages ?? null,
  filename,
});

/**
 * The stored file's real details, read back from the provider: what the browser reports
 * about its own upload isn't trusted.
 */
export async function describeUpload(
  publicId: string,
  resourceType: StoredAsset["resourceType"],
  filename: string,
): Promise<{ asset: StoredAsset; colors: string[] } | null> {
  if (!storageEnabled) return null;
  try {
    const result = (await cld.api.resource(publicId, {
      type: "authenticated",
      resource_type: resourceType,
      ...(resourceType === "image" ? { colors: true, pages: true } : {}),
    })) as UploadResult;
    return { asset: toAsset(result, resourceType, filename), colors: topColors(result.colors) };
  } catch {
    return null;
  }
}

/** Up to five dominant colors as `#RRGGBB`, most prominent first. */
export const topColors = (colors: [string, number][] | undefined) =>
  (colors ?? [])
    .map(([hex]) => hex.toUpperCase())
    .filter((hex) => /^#[0-9A-F]{6}$/.test(hex))
    .slice(0, 5);

/**
 * Has Cloudinary fetch a remote image (a link's share image) into the space's folder, so
 * previews survive the site changing and nobody's browser calls the site to show them.
 */
export async function importRemoteImage(
  spaceId: string,
  url: string,
  filename: string,
): Promise<{ asset: StoredAsset; colors: string[] } | null> {
  if (!storageEnabled) return null;
  try {
    const result = (await cld.uploader.upload(url, {
      public_id: `${folderOf(spaceId)}/${randomUUID()}`,
      type: "authenticated",
      resource_type: "image",
      colors: true,
      timeout: 15_000,
    })) as UploadResult;
    if (result.bytes > MAX_UPLOAD_BYTES) {
      await cld.uploader.destroy(result.public_id, { type: "authenticated" }).catch(() => {});
      return null;
    }
    return { asset: toAsset(result, "image", filename), colors: topColors(result.colors) };
  } catch {
    return null;
  }
}

export async function destroyAsset(asset: StoredAsset) {
  if (!storageEnabled) return;
  await cld.uploader
    .destroy(asset.publicId, {
      type: "authenticated",
      resource_type: asset.resourceType,
      invalidate: true,
    })
    .catch(() => {});
}

const signed = (asset: StoredAsset, options: Record<string, unknown> = {}) =>
  cld.url(asset.publicId, {
    type: "authenticated",
    sign_url: true,
    secure: true,
    resource_type: asset.resourceType,
    version: asset.version,
    ...options,
  });

/** Whether there's something to look at (images, PDFs, design files, video posters). */
export const hasPreview = (asset: StoredAsset) => asset.resourceType !== "raw";

/** A resized preview (at most `width` px wide), or null for raw files. */
export function previewUrl(asset: StoredAsset, width: number): string | null {
  if (!storageEnabled || !hasPreview(asset)) return null;
  const convert = asset.resourceType === "video" || !BROWSER_IMAGES.has(asset.format ?? "");
  return signed(asset, {
    format: convert ? "jpg" : (asset.format ?? undefined),
    transformation: [
      ...(asset.resourceType === "video" ? [{ start_offset: "auto" }] : []),
      { crop: "limit", width },
      { fetch_format: "auto" },
      { quality: "auto" },
    ],
  });
}

/** The file itself, for playing a video or opening an image at full size. */
export function originalUrl(asset: StoredAsset): string | null {
  if (!storageEnabled) return null;
  return signed(asset, asset.resourceType === "raw" ? {} : { format: asset.format ?? undefined });
}

/** A download link that expires in five minutes. */
export function downloadUrl(asset: StoredAsset): string | null {
  if (!storageEnabled) return null;
  return cld.utils.private_download_url(asset.publicId, asset.format ?? "", {
    resource_type: asset.resourceType,
    type: "authenticated",
    attachment: true,
    expires_at: Math.round(Date.now() / 1000) + 300,
  });
}

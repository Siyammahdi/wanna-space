import { z } from "zod";

export const VAULT_KINDS = ["link", "image", "file", "snippet", "note"] as const;
export type VaultKind = (typeof VAULT_KINDS)[number];

/** An item as the board and detail view need it; asset URLs are signed server-side. */
export type VaultItem = {
  id: string;
  kind: VaultKind;
  title: string;
  body: string;
  url: string | null;
  /** The link's host without `www.`, for display. */
  domain: string | null;
  siteName: string | null;
  iconUrl: string | null;
  language: string | null;
  collectionId: string | null;
  tags: string[];
  colors: string[];
  /** Something to look at: an image, a link's share image, a PDF page or a video frame. */
  preview: {
    thumb: string;
    full: string;
    width: number | null;
    height: number | null;
    /** Hotlinked from another site rather than stored. */
    remote: boolean;
  } | null;
  /** Uploads (images included). */
  file: {
    name: string;
    bytes: number;
    ext: string;
    pages: number | null;
    /** A playable source for video and audio. */
    media: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type VaultCollection = { id: string; name: string };

/** Mirrors the storage limit (Cloudinary's free plan caps a file at 10 MB). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type VaultResult = { ok: true; item: VaultItem } | { ok: false; error: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

const id = z.uuid();
const collectionId = id.nullable().default(null);

export const MAX_TAGS = 12;

/** Lowercase words joined by dashes, e.g. `color-palettes`. */
export const tagName = z
  .string()
  .trim()
  .toLowerCase()
  .transform((t) =>
    t
      .replace(/^#+/, "")
      .replace(/[\s_]+/g, "-")
      .replace(/[^\p{L}\p{N}-]/gu, "")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, ""),
  )
  .pipe(z.string().min(1).max(32));

const tags = z
  .array(tagName)
  .max(MAX_TAGS, `Up to ${MAX_TAGS} tags.`)
  .transform((list) => [...new Set(list)]);

export const saveLinkInput = z.object({
  url: z.string().trim().min(1).max(2048),
  collectionId,
  tags: tags.default([]),
});
export type SaveLinkInput = z.input<typeof saveLinkInput>;

export const createNoteInput = z.object({
  title: z.string().trim().max(200).default(""),
  body: z.string().max(20_000),
  collectionId,
  tags: tags.default([]),
});
export type CreateNoteInput = z.input<typeof createNoteInput>;

export const createSnippetInput = z.object({
  title: z.string().trim().max(200).default(""),
  body: z.string().min(1, "Paste some code first.").max(50_000, "That snippet is too long."),
  language: z.string().max(24).nullable().default(null),
  collectionId,
  tags: tags.default([]),
});
export type CreateSnippetInput = z.input<typeof createSnippetInput>;

export const signUploadInput = z.object({ filename: z.string().trim().min(1).max(255) });

/** What the browser got back from the storage provider for one finished upload. */
export const createUploadInput = z.object({
  publicId: z.string().min(1).max(300),
  version: z.number().int().positive(),
  signature: z.string().min(1).max(200),
  resourceType: z.enum(["image", "video", "raw"]),
  filename: z.string().trim().min(1).max(255),
  collectionId,
  tags: tags.default([]),
});
export type CreateUploadInput = z.input<typeof createUploadInput>;

export const updateItemInput = z.object({
  id,
  title: z.string().trim().max(200).optional(),
  body: z.string().max(50_000).optional(),
  language: z.string().max(24).nullable().optional(),
  collectionId: id.nullable().optional(),
  tags: tags.optional(),
});
export type UpdateItemInput = z.input<typeof updateItemInput>;

export const collectionName = z
  .string()
  .trim()
  .min(1, "Give the collection a name.")
  .max(60, "Keep it under 60 characters.");

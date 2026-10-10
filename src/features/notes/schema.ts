import { z } from "zod";

export type PageDoc = { type: "doc"; content?: unknown[] };

/** A page in the tree: everything but the document itself. */
export type PageItem = {
  id: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  sortKey: string;
  updatedAt: string;
};

export type PageWithContent = PageItem & { content: PageDoc | null };

export type RecentPage = PageItem & { excerpt: string };

export type ActionResult<T = void> =
  (T extends void ? { ok: true } : { ok: true; data: T }) | { ok: false; error: string };

/** Documents above this size are refused; a page that big wants splitting anyway. */
export const MAX_DOC_BYTES = 512 * 1024;
export const TITLE_MAX = 200;

const id = z.uuid();
const sortKey = z.string().regex(/^[0-9A-Za-z]{1,128}$/);

/** One grapheme-ish emoji (no plain letters, short). */
const icon = z
  .string()
  .max(16)
  .refine((s) => /\p{Extended_Pictographic}/u.test(s), "That isn’t an emoji.")
  .nullable();

const doc = z
  .object({ type: z.literal("doc"), content: z.array(z.unknown()).optional() })
  .refine((d) => JSON.stringify(d).length <= MAX_DOC_BYTES, "This page is too long to save.");

export const createPageInput = z.object({
  id,
  parentId: id.nullable(),
  title: z.string().max(TITLE_MAX).optional(),
});
export type CreatePageInput = z.infer<typeof createPageInput>;

export const updatePageInput = z.object({
  id,
  title: z.string().max(TITLE_MAX).optional(),
  icon: icon.optional(),
  content: doc.optional(),
});
export type UpdatePageInput = z.input<typeof updatePageInput>;

/** Rows handed back by deletePage so undo can put the subtree back exactly. */
export type DeletedPage = {
  id: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  content: PageDoc | null;
  excerpt: string;
  sortKey: string;
  createdAt: string;
  updatedAt: string;
};

export const restorePagesInput = z
  .array(
    z.object({
      id,
      parentId: id.nullable(),
      title: z.string().max(TITLE_MAX),
      icon,
      content: doc.nullable(),
      excerpt: z.string().max(1000),
      sortKey,
      createdAt: z.iso.datetime({ offset: true }),
      updatedAt: z.iso.datetime({ offset: true }),
    }),
  )
  .min(1)
  .max(500);

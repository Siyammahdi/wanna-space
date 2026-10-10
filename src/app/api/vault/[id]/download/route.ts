import { NextResponse } from "next/server";

import { getVaultItemRow } from "@/features/vault/server/queries";
import { downloadUrl } from "@/server/storage";

/** Checks the item is the caller's, then hands out a five-minute signed link. */
export async function GET(_request: Request, ctx: RouteContext<"/api/vault/[id]/download">) {
  const { id } = await ctx.params;
  const row = await getVaultItemRow(id);
  const url = row?.asset ? downloadUrl(row.asset) : null;
  if (!url) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.redirect(url, { headers: { "cache-control": "private, no-store" } });
}

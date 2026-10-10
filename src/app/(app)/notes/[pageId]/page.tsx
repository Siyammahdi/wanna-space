import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageView } from "@/features/notes/components/page-view";
import { getPage } from "@/features/notes/server/queries";
import { displayTitle } from "@/features/notes/tree";

export async function generateMetadata({
  params,
}: PageProps<"/notes/[pageId]">): Promise<Metadata> {
  const page = await getPage((await params).pageId);
  return { title: page ? displayTitle(page.title) : "Notes" };
}

export default async function NotePage({ params }: PageProps<"/notes/[pageId]">) {
  const page = await getPage((await params).pageId);
  if (!page) notFound();
  return <PageView key={page.id} page={page} />;
}

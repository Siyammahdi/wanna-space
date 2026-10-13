import { NotesProvider } from "@/features/notes/components/notes-provider";
import { PageTree } from "@/features/notes/components/page-tree";
import { listPages } from "@/features/notes/server/queries";

import { NotesFrame } from "../_components/notes-frame";

export default async function NotesTreeLayout({ children }: { children: React.ReactNode }) {
  const pages = await listPages();

  return (
    <NotesProvider pages={pages}>
      <NotesFrame tree={<PageTree className="pt-0.5" />}>{children}</NotesFrame>
    </NotesProvider>
  );
}

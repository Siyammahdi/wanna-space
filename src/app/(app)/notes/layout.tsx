import { RoomTransition } from "@/components/motion/room-transition";
import { NotesProvider } from "@/features/notes/components/notes-provider";
import { PageTree } from "@/features/notes/components/page-tree";
import { listPages } from "@/features/notes/server/queries";

export default async function NotesLayout({ children }: LayoutProps<"/notes">) {
  const pages = await listPages();

  return (
    <RoomTransition>
      <NotesProvider pages={pages}>
        {/* Full width: the page tree sits at the far right, the page centered beside it. */}
        <div
          data-wide
          className="grid gap-10 md:grid-cols-[minmax(0,1fr)_13.5rem] lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-14"
        >
          <div className="min-w-0 lg:pl-4">{children}</div>
          <aside className="hidden md:block">
            <PageTree className="pt-0.5" />
          </aside>
        </div>
      </NotesProvider>
    </RoomTransition>
  );
}

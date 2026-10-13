import type { ReactNode } from "react";

/** Full width: the page tree sits at the far right, the page centered beside it. */
export function NotesFrame({ tree, children }: { tree: ReactNode; children: ReactNode }) {
  return (
    <div
      data-wide
      className="grid gap-10 md:grid-cols-[minmax(0,1fr)_13.5rem] lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-14"
    >
      <div className="min-w-0 lg:pl-4">{children}</div>
      <aside className="hidden md:block">{tree}</aside>
    </div>
  );
}

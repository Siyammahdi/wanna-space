import { RoomTransition } from "@/components/motion/room-transition";

/** No data here: everything above loading.tsx is prefetched, and must not go stale. */
export default function NotesLayout({ children }: LayoutProps<"/notes">) {
  return <RoomTransition>{children}</RoomTransition>;
}

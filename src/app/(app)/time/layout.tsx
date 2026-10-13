import { RoomTransition } from "@/components/motion/room-transition";

/** Wraps loading.tsx too, so the room's skeleton enters the way the room does. */
export default function TimeLayout({ children }: LayoutProps<"/time">) {
  return <RoomTransition>{children}</RoomTransition>;
}

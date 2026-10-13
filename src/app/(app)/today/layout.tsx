import { RoomTransition } from "@/components/motion/room-transition";

/** Wraps loading.tsx too, so the room's skeleton enters the way the room does. */
export default function TodayLayout({ children }: LayoutProps<"/today">) {
  return <RoomTransition>{children}</RoomTransition>;
}

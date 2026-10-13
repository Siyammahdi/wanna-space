import { RoomTransition } from "@/components/motion/room-transition";

/** Wraps loading.tsx too, so the room's skeleton enters the way the room does. */
export default function OrbitLayout({ children }: LayoutProps<"/orbit">) {
  return <RoomTransition>{children}</RoomTransition>;
}

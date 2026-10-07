import { ViewTransition, type ReactNode } from "react";

/**
 * Wrap each room's page content (not the layout — layouts persist, so enter/exit
 * never fire there). Animations are defined in globals.css (.room-enter / .room-exit).
 */
export function RoomTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="room-enter" exit="room-exit" default="none">
      {children}
    </ViewTransition>
  );
}

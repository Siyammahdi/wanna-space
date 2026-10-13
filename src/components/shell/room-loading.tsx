import type { ReactNode } from "react";

/**
 * The frame of a room's `loading.tsx`. It's prefetched with the link, so a click
 * lands here at once while the room's data streams in. `wide` matches rooms that
 * opt out of the reading width, so the page doesn't jump when the data arrives.
 */
export function RoomLoading({
  label,
  wide,
  className,
  children,
}: {
  label: string;
  wide?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-skeleton aria-busy="true" data-wide={wide || undefined} className={className}>
      <span role="status" className="sr-only">
        Loading {label}…
      </span>
      {children}
    </div>
  );
}

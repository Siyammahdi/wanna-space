import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { getRoom, type RoomId } from "@/config/rooms";
import { cn } from "@/lib/cn";

export function RoomHeader({
  roomId,
  title,
  subtitle,
  actions,
}: {
  roomId: RoomId;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  const room = getRoom(roomId);
  const Icon = room.icon;

  return (
    <header className="flex items-end justify-between gap-6 pb-8">
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "mt-1 flex size-11 shrink-0 items-center justify-center rounded-lg",
            room.tone.soft,
          )}
        >
          <Icon className={cn("size-[22px]", room.tone.text)} strokeWidth={1.75} />
        </span>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-[34px] leading-tight font-semibold tracking-[-0.03em] text-ink">
              {title ?? room.label}
            </h1>
            {room.status === "planned" && <Badge>Planned</Badge>}
          </div>
          <p className="mt-1 text-[15px] text-ink-muted">{subtitle ?? room.tagline}</p>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

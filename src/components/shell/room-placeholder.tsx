import { Card } from "@/components/ui/card";
import { getRoom, type RoomId } from "@/config/rooms";
import { cn } from "@/lib/cn";

/** Empty state for rooms that haven't been built yet. */
export function RoomPlaceholder({ roomId, plans }: { roomId: RoomId; plans: string[] }) {
  const room = getRoom(roomId);
  const Icon = room.icon;

  return (
    <Card className="relative overflow-hidden p-10">
      <div
        aria-hidden
        className={cn(
          "absolute -top-24 -right-24 size-72 rounded-full opacity-60 blur-3xl",
          room.tone.soft,
        )}
      />
      <div className="relative max-w-lg">
        <Icon className={cn("mb-5 size-8", room.tone.text)} strokeWidth={1.5} />
        <h2 className="font-display text-2xl tracking-tight text-ink">This room is being built.</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{room.description}</p>
        <ul className="mt-6 flex flex-col gap-2.5">
          {plans.map((plan) => (
            <li key={plan} className="flex items-start gap-3 text-sm text-ink-muted">
              <span className={cn("mt-[7px] size-1.5 shrink-0 rounded-full", room.tone.bg)} />
              {plan}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { addDays, type IsoDate } from "@/lib/dates";
import type { WeekStart } from "@/lib/settings";

import { startOfWeek } from "../week";

const weekHref = (start: IsoDate) => `/planner?week=${start}` as Route;

type WeekNavProps = { start: IsoDate; today: IsoDate; weekStartsOn: WeekStart };

/** Previous / next week links (and back to this week); the board's toolbar holds them. */
export function WeekNav({ start, today, weekStartsOn }: WeekNavProps) {
  const current = startOfWeek(today, weekStartsOn) === start;
  return (
    <nav aria-label="Weeks" className="flex items-center gap-1">
      {!current && (
        <Link href="/planner" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          This week
        </Link>
      )}
      <Link
        href={weekHref(addDays(start, -7))}
        aria-label="Previous week"
        title="Previous week"
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
      >
        <ChevronLeft />
      </Link>
      <Link
        href={weekHref(addDays(start, 7))}
        aria-label="Next week"
        title="Next week"
        className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
      >
        <ChevronRight />
      </Link>
    </nav>
  );
}

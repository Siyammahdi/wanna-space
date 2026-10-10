"use client";

import { Sparkle } from "lucide-react";
import { useRef, useState } from "react";

import { toast } from "@/components/ui/toast";
import { INTENTION_MAX } from "@/features/today/schema";
import { setIntention } from "@/features/today/server/actions";
import type { IsoDate } from "@/lib/dates";

/** One line for the day. Saves on Enter or when you click away; Esc puts it back. */
export function Intention({ today, initial }: { today: IsoDate; initial: string }) {
  const [value, setValue] = useState(initial);
  const saved = useRef(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  async function save() {
    const next = value.trim();
    if (next === saved.current) return setValue(next);
    const prev = saved.current;
    saved.current = next;
    setValue(next);
    const result = await setIntention({ date: today, intention: next }).catch(() => null);
    if (!result?.ok) {
      saved.current = prev;
      toast({ message: "Couldn’t save your intention", detail: result?.error ?? "Try again." });
    }
  }

  return (
    <label className="group mt-3 flex max-w-xl items-center gap-2.5 rounded-lg py-1 text-ink-subtle">
      <Sparkle
        aria-hidden
        className="size-4 shrink-0 text-accent transition-transform duration-500 ease-spring group-focus-within:rotate-90"
      />
      <span className="sr-only">Today’s intention</span>
      <input
        ref={inputRef}
        value={value}
        maxLength={INTENTION_MAX}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            inputRef.current?.blur();
          } else if (e.key === "Escape") {
            e.stopPropagation();
            setValue(saved.current);
            requestAnimationFrame(() => inputRef.current?.blur());
          }
        }}
        placeholder="What would make today a good day?"
        className="min-w-0 flex-1 bg-transparent text-[16px] text-ink-muted outline-none placeholder:text-ink-faint focus:text-ink"
      />
    </label>
  );
}

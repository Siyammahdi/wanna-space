"use client";

import { CornerDownLeft, Hash, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/cn";
import type { IsoDate } from "@/lib/dates";
import { uuidv7 } from "@/lib/id";
import { spring } from "@/lib/motion";
import { QUICK_CAPTURE_EVENT } from "@/lib/quick-capture";

import { parseTaskInput } from "../parse";
import { colorOf } from "../projects";
import type { CreateTaskInput, ProjectItem } from "../schema";
import { DueLabel, PriorityLabel, RepeatLabel } from "./task-meta";

type QuickAddProps = {
  today: IsoDate;
  projects: ProjectItem[];
  onAdd: (input: CreateTaskInput) => void;
  /** New tasks land here unless the text names another project (#name). */
  defaultProjectId?: string | null;
  /** New tasks are due on this day unless the text names a date. */
  defaultDueDate?: IsoDate | null;
  placeholder?: string;
  /** Inline bars answer the global "C" by focusing themselves. */
  claimCapture?: boolean;
  autoFocus?: boolean;
  /** Parsed chips sit inside the bar instead of a reserved row below (phones: below, while typing). */
  inlineChips?: boolean;
  className?: string;
};

export function QuickAdd({
  today,
  projects,
  onAdd,
  defaultProjectId = null,
  defaultDueDate = null,
  placeholder,
  claimCapture = false,
  autoFocus = false,
  inlineChips = false,
  className,
}: QuickAddProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const parsed = parseTaskInput(value, today, projects);
  const hasText = value.trim().length > 0;
  const projectId = parsed.projectId ?? defaultProjectId;
  const project = projects.find((p) => p.id === projectId);
  const dueDate = parsed.dueDate ?? defaultDueDate;

  useEffect(() => {
    if (!claimCapture) return;
    const onCapture = (e: Event) => {
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener(QUICK_CAPTURE_EVENT, onCapture);
    return () => window.removeEventListener(QUICK_CAPTURE_EVENT, onCapture);
  }, [claimCapture]);

  function submit() {
    if (!hasText) return;
    onAdd({
      id: uuidv7(),
      title: parsed.title,
      dueDate,
      dueTime: dueDate ? parsed.dueTime : null,
      repeat: dueDate ? parsed.repeat : null,
      priority: parsed.priority,
      projectId,
      parentId: null,
    });
    setValue("");
  }

  const chips = (
    <AnimatePresence initial={false}>
      {project && hasText && (
        <Chip key={`project-${project.id}`} inline={inlineChips}>
          <span
            className={cn(
              "inline-flex items-center gap-1 truncate text-[12px] font-medium",
              colorOf(project.color).text,
            )}
          >
            <Hash className="size-3.5 shrink-0" strokeWidth={2.25} />
            {project.name}
          </span>
        </Chip>
      )}
      {dueDate && hasText && (
        <Chip key={`date-${dueDate}-${parsed.dueTime}`} inline={inlineChips}>
          <DueLabel date={dueDate} time={parsed.dueTime} today={today} />
        </Chip>
      )}
      {parsed.repeat && hasText && (
        <Chip key={`repeat-${JSON.stringify(parsed.repeat)}`} inline={inlineChips}>
          <RepeatLabel rule={parsed.repeat} />
        </Chip>
      )}
      {parsed.priority > 0 && hasText && (
        <Chip key={`p-${parsed.priority}`} inline={inlineChips}>
          <PriorityLabel priority={parsed.priority} />
        </Chip>
      )}
    </AnimatePresence>
  );

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="group flex h-14 items-center gap-3 rounded-xl bg-surface-raised px-4 transition-shadow focus-within:ring-2 focus-within:ring-accent/40">
        <span className="flex size-6 items-center justify-center rounded-full bg-room-tasks-soft text-room-tasks transition-transform duration-300 ease-spring group-focus-within:rotate-90">
          <Plus className="size-4" strokeWidth={2.25} />
        </span>
        <input
          ref={inputRef}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && value) {
              e.stopPropagation();
              setValue("");
            }
          }}
          placeholder={
            placeholder ??
            (projects[0]
              ? `Add a task — try “Pay rent fri p1 ${projects[0].keyword}”`
              : "Add a task — try “Pay rent fri p1”")
          }
          aria-label="New task"
          maxLength={500}
          className={cn(
            "h-full flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint",
            inlineChips ? "min-w-24" : "min-w-0",
          )}
        />
        {inlineChips && (
          <div className="hidden min-w-0 shrink items-center gap-1.5 overflow-hidden sm:flex">
            {chips}
          </div>
        )}
        {hasText ? (
          <button
            type="submit"
            aria-label="Add task"
            className="flex h-8 items-center gap-1.5 rounded-md bg-ink px-2.5 text-[12.5px] font-medium text-ink-inverse transition-transform active:scale-95"
          >
            Add <CornerDownLeft className="size-3.5" />
          </button>
        ) : (
          <Kbd data-kbd-hints className="hidden sm:inline-flex">
            C
          </Kbd>
        )}
      </div>

      {inlineChips ? (
        hasText && <div className="flex h-8 items-center gap-2 px-1 sm:hidden">{chips}</div>
      ) : (
        <div className={cn("flex h-8 items-center gap-2 px-1", !hasText && "pointer-events-none")}>
          {chips}
        </div>
      )}
    </form>
  );
}

function Chip({ inline, children }: { inline: boolean; children: React.ReactNode }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
      transition={spring.bouncy}
      className={cn(
        "inline-flex h-6 min-w-0 items-center rounded-full px-2.5",
        inline ? "bg-surface-sunken" : "bg-surface-raised",
      )}
    >
      {children}
    </motion.span>
  );
}

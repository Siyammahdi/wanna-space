"use client";

import {
  CalendarDays,
  CalendarRange,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CornerDownLeft,
  Flag,
  FlagOff,
  FolderInput,
  Inbox,
  PanelRight,
  Pencil,
  Repeat,
  RotateCcw,
  Sofa,
  Sun,
  Sunrise,
  Trash2,
} from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";

import { MenuGap, MenuItem, Popover } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { addDays, nextWeekday, type IsoDate } from "@/lib/dates";

import { parseRepeat, type Priority } from "../parse";
import { colorOf } from "../projects";
import { describeRepeat, repeatPresets, sameRule, type RepeatRule } from "../repeat";
import type { ProjectItem, TaskItem } from "../schema";
import { priorityMeta } from "./task-meta";

const shortWeekday = (iso: IsoDate) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en", { timeZone: "UTC", weekday: "short" });

type DateMenuProps = {
  value: IsoDate | null;
  today: IsoDate;
  onChange: (date: IsoDate | null) => void;
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
};

export function DateMenu({ value, today, onChange, trigger }: DateMenuProps) {
  const [open, setOpen] = useState(false);
  const pick = (date: IsoDate | null) => {
    onChange(date);
    setOpen(false);
  };

  const tomorrow = addDays(today, 1);
  const weekend = nextWeekday(today, 6);
  const nextWeek = nextWeekday(today, 1, { includeToday: false });

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label="Due date"
      trigger={trigger({ open, toggle: () => setOpen((o) => !o) })}
    >
      <MenuItem
        icon={<Sun />}
        hint={shortWeekday(today)}
        active={value === today}
        onSelect={() => pick(today)}
      >
        Today
      </MenuItem>
      <MenuItem
        icon={<Sunrise />}
        hint={shortWeekday(tomorrow)}
        active={value === tomorrow}
        onSelect={() => pick(tomorrow)}
      >
        Tomorrow
      </MenuItem>
      <MenuItem
        icon={<Sofa />}
        hint={shortWeekday(weekend)}
        active={value === weekend}
        onSelect={() => pick(weekend)}
      >
        This weekend
      </MenuItem>
      <MenuItem
        icon={<CalendarRange />}
        hint={shortWeekday(nextWeek)}
        active={value === nextWeek}
        onSelect={() => pick(nextWeek)}
      >
        Next week
      </MenuItem>
      {value && (
        <MenuItem icon={<CalendarX />} onSelect={() => pick(null)}>
          No date
        </MenuItem>
      )}
      <label className="mt-1 flex h-9 items-center gap-2.5 rounded-md bg-surface-sunken px-2.5 text-[13px] text-ink-muted focus-within:ring-2 focus-within:ring-accent/40">
        <CalendarDays className="size-[15px] shrink-0" />
        <input
          type="date"
          aria-label="Pick a date"
          value={value ?? ""}
          onChange={(e) => e.target.value && pick(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-ink [color-scheme:light] outline-none dark:[color-scheme:dark]"
        />
      </label>
    </Popover>
  );
}

type ProjectMenuProps = {
  value: string | null;
  projects: ProjectItem[];
  onChange: (projectId: string | null) => void;
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
};

export function ProjectMenu({ value, projects, onChange, trigger }: ProjectMenuProps) {
  const [open, setOpen] = useState(false);
  const pick = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label="Move to project"
      trigger={trigger({ open, toggle: () => setOpen((o) => !o) })}
    >
      <ProjectOptions value={value} projects={projects} onPick={pick} />
    </Popover>
  );
}

function ProjectOptions({
  value,
  projects,
  onPick,
}: {
  value: string | null;
  projects: ProjectItem[];
  onPick: (id: string | null) => void;
}) {
  return (
    <>
      <MenuItem icon={<Inbox />} active={value === null} onSelect={() => onPick(null)}>
        Inbox
      </MenuItem>
      {projects.map((p) => (
        <MenuItem
          key={p.id}
          icon={<span className={cn("mx-[3px] size-2.5 rounded-full", colorOf(p.color).dot)} />}
          active={value === p.id}
          onSelect={() => onPick(p.id)}
        >
          {p.name}
        </MenuItem>
      ))}
      {projects.length === 0 && (
        <p className="px-2.5 py-2 text-[12px] leading-relaxed text-ink-subtle">
          Create a project from the bar above to sort tasks into it.
        </p>
      )}
    </>
  );
}

type RepeatMenuProps = {
  value: RepeatRule | null;
  /** Presets follow this date's weekday and day of month (the due date, or today). */
  anchor: IsoDate;
  onChange: (rule: RepeatRule | null) => void;
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
};

export function RepeatMenu({ value, anchor, onChange, trigger }: RepeatMenuProps) {
  const [open, setOpen] = useState(false);
  const pick = (rule: RepeatRule | null) => {
    if (!sameRule(rule, value)) onChange(rule);
    setOpen(false);
  };
  const presets = repeatPresets(anchor);
  const custom = value && !presets.some((p) => sameRule(p.rule, value)) ? value : null;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label="Repeat"
      className="w-64"
      trigger={trigger({ open, toggle: () => setOpen((o) => !o) })}
    >
      {custom && (
        <MenuItem active onSelect={() => setOpen(false)}>
          {describeRepeat(custom)}
        </MenuItem>
      )}
      {presets.map(({ key, rule }) => (
        <MenuItem key={key} active={sameRule(rule, value)} onSelect={() => pick(rule)}>
          {describeRepeat(rule)}
        </MenuItem>
      ))}
      {value && <MenuItem onSelect={() => pick(null)}>Doesn’t repeat</MenuItem>}
      <CustomRepeat onPick={pick} />
    </Popover>
  );
}

function CustomRepeat({ onPick }: { onPick: (rule: RepeatRule) => void }) {
  const [text, setText] = useState("");
  const hintId = useId();
  const rule = parseRepeat(text);

  return (
    <form
      className="mt-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (rule) onPick(rule);
      }}
    >
      <label className="flex h-9 items-center gap-2.5 rounded-md bg-surface-sunken px-2.5 text-[13px] text-ink-muted focus-within:ring-2 focus-within:ring-accent/40">
        <Repeat className="size-[15px] shrink-0" />
        <input
          value={text}
          aria-label="Custom repeat"
          aria-describedby={hintId}
          placeholder="Custom, e.g. every 2 weeks"
          onChange={(e) => setText(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-faint"
        />
      </label>
      {text.trim() && (
        <p
          id={hintId}
          aria-live="polite"
          className="flex items-center gap-1.5 px-2.5 pt-2 pb-1 text-[12px] text-ink-subtle"
        >
          {rule ? (
            <>
              <CornerDownLeft className="size-3.5 shrink-0" />
              {describeRepeat(rule)}
            </>
          ) : (
            "Try “every 3 days” or “every mon, fri”"
          )}
        </p>
      )}
    </form>
  );
}

type TaskMenuProps = {
  task: TaskItem;
  projects: ProjectItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactNode;
  onOpenDetails?: () => void;
  onRename?: () => void;
  onToggle: () => void;
  onPriority: (priority: Priority) => void;
  onMove: (projectId: string | null) => void;
  onDelete: () => void;
};

/** Everything a row can do, labelled, with its keyboard shortcut alongside. */
export function TaskMenu({ open, onOpenChange, trigger, ...props }: TaskMenuProps) {
  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      label={`Actions for “${props.task.title}”`}
      className="w-60"
      trigger={trigger}
    >
      <TaskMenuBody {...props} close={() => onOpenChange(false)} />
    </Popover>
  );
}

function TaskMenuBody({
  task,
  projects,
  close,
  onOpenDetails,
  onRename,
  onToggle,
  onPriority,
  onMove,
  onDelete,
}: Omit<TaskMenuProps, "open" | "onOpenChange" | "trigger"> & { close: () => void }) {
  const [view, setView] = useState<"main" | "move">("main");
  const bodyRef = useRef<HTMLDivElement>(null);
  const done = task.status === "done";
  const then = (fn: () => void) => () => {
    close();
    fn();
  };

  function switchTo(next: "main" | "move") {
    setView(next);
    // The focused item unmounts with the view; keep focus inside the menu.
    requestAnimationFrame(() => bodyRef.current?.querySelector("button")?.focus());
  }

  if (view === "move") {
    return (
      <div ref={bodyRef}>
        <button
          type="button"
          onClick={() => switchTo("main")}
          className="flex h-8 w-full items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-ink-subtle transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-3.5" />
          Move to
        </button>
        <ProjectOptions
          value={task.projectId}
          projects={projects}
          onPick={(id) => {
            close();
            if (id !== task.projectId) onMove(id);
          }}
        />
      </div>
    );
  }

  return (
    <div ref={bodyRef}>
      {onOpenDetails && (
        <MenuItem
          icon={<PanelRight />}
          hint={<Shortcut>↵</Shortcut>}
          onSelect={then(onOpenDetails)}
        >
          Open details
        </MenuItem>
      )}
      {onRename && !done && (
        <MenuItem icon={<Pencil />} hint={<Shortcut>E</Shortcut>} onSelect={then(onRename)}>
          Rename
        </MenuItem>
      )}
      <MenuItem
        icon={done ? <RotateCcw /> : <CircleCheck />}
        hint={<Shortcut>X</Shortcut>}
        onSelect={then(onToggle)}
      >
        {done ? "Reopen" : "Complete"}
      </MenuItem>
      {!done && (
        <>
          <MenuGap />
          <PriorityPicker
            value={task.priority}
            onPick={(p) => {
              close();
              if (p !== task.priority) onPriority(p);
            }}
          />
          {projects.length > 0 && (
            <MenuItem
              icon={<FolderInput />}
              hint={<ChevronRight className="size-3.5" />}
              onSelect={() => switchTo("move")}
            >
              Move to…
            </MenuItem>
          )}
        </>
      )}
      <MenuGap />
      <MenuItem
        icon={<Trash2 />}
        hint={<Shortcut>⌫</Shortcut>}
        tone="danger"
        onSelect={then(onDelete)}
      >
        Delete
      </MenuItem>
    </div>
  );
}

/** Shortcut hints teach the keyboard; touch screens have none to teach. */
function Shortcut({ children }: { children: ReactNode }) {
  return (
    <span data-kbd-hints className="font-medium [@media(hover:none)]:hidden">
      {children}
    </span>
  );
}

const PRIORITY_CHOICES = [1, 2, 3, 0] as const;

function PriorityPicker({ value, onPick }: { value: Priority; onPick: (p: Priority) => void }) {
  return (
    <div role="group" aria-label="Priority" className="flex h-9 items-center gap-2.5 pr-1 pl-2.5">
      <Flag className="size-[15px] shrink-0 text-ink-muted" />
      <span className="flex-1 text-[13px] text-ink-muted">Priority</span>
      {PRIORITY_CHOICES.map((p) => {
        const label = p ? priorityMeta[p].label : "No priority";
        return (
          <button
            key={p}
            type="button"
            aria-label={label}
            aria-pressed={value === p}
            title={p ? `${label} (${p})` : `${label} (0)`}
            onClick={() => onPick(p)}
            className={cn(
              "flex size-7 items-center justify-center rounded-md transition-colors hover:bg-surface-hover [&_svg]:size-[15px]",
              value === p && "bg-surface-hover",
            )}
          >
            {p ? (
              <Flag className={priorityMeta[p].text} fill="currentColor" fillOpacity={0.2} />
            ) : (
              <FlagOff className="text-ink-faint" />
            )}
          </button>
        );
      })}
    </div>
  );
}

type PriorityMenuProps = {
  value: Priority;
  onChange: (priority: Priority) => void;
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
};

export function PriorityMenu({ value, onChange, trigger }: PriorityMenuProps) {
  const [open, setOpen] = useState(false);
  const pick = (p: Priority) => {
    onChange(p);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label="Priority"
      className="min-w-44"
      trigger={trigger({ open, toggle: () => setOpen((o) => !o) })}
    >
      {([1, 2, 3] as const).map((p) => (
        <MenuItem
          key={p}
          icon={<Flag className={priorityMeta[p].text} fill="currentColor" fillOpacity={0.2} />}
          hint={`p${p}`}
          active={value === p}
          onSelect={() => pick(p)}
        >
          {priorityMeta[p].label}
        </MenuItem>
      ))}
      <MenuItem
        icon={<Flag className={cn("text-ink-faint")} />}
        active={value === 0}
        onSelect={() => pick(0)}
      >
        No priority
      </MenuItem>
    </Popover>
  );
}

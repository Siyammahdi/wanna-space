"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Ellipsis,
  Gauge,
  Inbox,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { MenuGap, MenuItem, Popover } from "@/components/ui/popover";
import {
  parseTaskInput,
  type ProjectItem,
  type TaskActions,
  type TaskItem,
} from "@/features/tasks";
import { cn } from "@/lib/cn";
import type { IsoDate } from "@/lib/dates";
import { uuidv7 } from "@/lib/id";
import { STAGE_LIMITS } from "@/lib/settings";

import type { StageActions } from "../hooks/use-stages";
import type { StageItem } from "../schema";

const LIMITS = [null, 1, 2, 3, 4, 5, 6, 8, 10, 12] as const;

export function Column({
  id,
  label,
  count,
  limit,
  done = false,
  header,
  menu,
  footer,
  children,
}: {
  id: string;
  label: string;
  count: number;
  limit?: number | null;
  done?: boolean;
  header?: ReactNode;
  menu?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const over = limit != null && count > limit;
  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      data-col={id}
      className={cn(
        "flex min-h-[26rem] w-[17.5rem] shrink-0 snap-start flex-col rounded-xl p-1.5 transition-colors duration-200 sm:w-auto sm:min-w-[15.5rem] sm:flex-1 sm:shrink",
        done ? "bg-success-soft/40" : over ? "bg-warning-soft/50" : "bg-surface",
        isOver && "bg-surface-hover/70",
      )}
    >
      <header className="flex h-9 items-center gap-1.5 pr-0.5 pl-1.5 text-[13px] font-semibold">
        {header ?? (
          <span className={cn("truncate", done ? "text-success" : "text-ink")}>{label}</span>
        )}
        <span
          className={cn(
            "shrink-0 text-[12px] font-medium tabular-nums",
            over ? "text-warning" : "text-ink-faint",
          )}
          title={limit != null ? `Limit ${limit}` : undefined}
        >
          {count}
          {limit != null && `/${limit}`}
          {over && <span className="sr-only">, over the limit</span>}
        </span>
        <span className="flex-1" />
        {menu}
      </header>
      {children}
      {footer && <div className="mt-auto flex items-center gap-1 pt-1.5">{footer}</div>}
    </section>
  );
}

/** A stage's name; click (or Rename in its menu) to edit it in place. */
export function StageName({
  stage,
  editing,
  onEditingChange,
  stageActions,
}: {
  stage: StageItem;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  stageActions: StageActions;
}) {
  function rename(value: string) {
    onEditingChange(false);
    const name = value.trim().slice(0, STAGE_LIMITS.nameLength);
    if (name && name !== stage.name) stageActions.update({ id: stage.id, name });
  }

  return editing ? (
    <input
      autoFocus
      defaultValue={stage.name}
      maxLength={STAGE_LIMITS.nameLength}
      aria-label="Stage name"
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          e.stopPropagation();
          e.currentTarget.value = stage.name;
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => rename(e.currentTarget.value)}
      className="h-7 min-w-0 flex-1 rounded-md bg-surface-raised px-1.5 text-[13px] font-semibold text-ink outline-none focus:ring-2 focus:ring-accent/40"
    />
  ) : (
    <button
      type="button"
      onClick={() => onEditingChange(true)}
      title="Rename stage"
      className="min-w-0 cursor-text truncate rounded-sm text-left text-ink"
    >
      {stage.name}
    </button>
  );
}

/** A stage's menu: rename, work-in-progress limit, move, delete. */
export function StageMenu({
  stage,
  index,
  total,
  stageActions,
  onMove,
  onRename,
}: {
  stage: StageItem;
  index: number;
  total: number;
  stageActions: StageActions;
  onMove: (stage: StageItem, delta: -1 | 1) => void;
  onRename: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<"menu" | "limit">("menu");

  return (
    <Popover
      open={menuOpen}
      onOpenChange={(o) => {
        setMenuOpen(o);
        if (!o) setView("menu");
      }}
      label={`${stage.name} stage`}
      trigger={
        <button
          type="button"
          aria-label={`${stage.name} stage actions`}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="flex size-7 items-center justify-center rounded-md font-normal text-ink-subtle transition-[color,background-color,transform] hover:bg-surface-hover hover:text-ink active:scale-90"
        >
          <Ellipsis className="size-4" />
        </button>
      }
    >
      {view === "limit" ? (
        <div className="w-56">
          <MenuItem icon={<ChevronLeft />} onSelect={() => setView("menu")}>
            Work-in-progress limit
          </MenuItem>
          <MenuGap />
          <div className="grid grid-cols-5 gap-1 p-0.5">
            {LIMITS.map((n) => (
              <button
                key={n ?? "none"}
                type="button"
                aria-pressed={stage.wipLimit === n}
                onClick={() => {
                  setMenuOpen(false);
                  setView("menu");
                  if (n !== stage.wipLimit) stageActions.update({ id: stage.id, wipLimit: n });
                }}
                className={cn(
                  "flex h-8 items-center justify-center rounded-md text-[12.5px] font-medium tabular-nums transition-colors",
                  stage.wipLimit === n
                    ? "bg-accent-soft text-accent-ink"
                    : "text-ink-muted hover:bg-surface-hover hover:text-ink",
                  n === null && "col-span-5",
                )}
              >
                {n ?? "No limit"}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <MenuItem
            icon={<Pencil />}
            onSelect={() => {
              setMenuOpen(false);
              onRename();
            }}
          >
            Rename
          </MenuItem>
          <MenuItem
            icon={<Gauge />}
            hint={stage.wipLimit ?? "None"}
            onSelect={() => setView("limit")}
          >
            Limit
          </MenuItem>
          <MenuGap />
          {index > 0 && (
            <MenuItem
              icon={<ArrowLeft />}
              onSelect={() => {
                setMenuOpen(false);
                onMove(stage, -1);
              }}
            >
              Move left
            </MenuItem>
          )}
          {index < total - 1 && (
            <MenuItem
              icon={<ArrowRight />}
              onSelect={() => {
                setMenuOpen(false);
                onMove(stage, 1);
              }}
            >
              Move right
            </MenuItem>
          )}
          {total > 1 && (
            <>
              <MenuGap />
              <MenuItem
                icon={<Trash2 />}
                tone="danger"
                onSelect={() => {
                  setMenuOpen(false);
                  stageActions.remove(stage.id);
                }}
              >
                Delete stage
              </MenuItem>
            </>
          )}
        </>
      )}
    </Popover>
  );
}

/** "Add task" at the foot of a stage; the quick-add grammar works here too. */
export function ColumnAdd({
  stage,
  projectId,
  today,
  projects,
  onAdd,
}: {
  stage: StageItem;
  projectId: string;
  today: IsoDate;
  projects: ProjectItem[];
  onAdd: TaskActions["add"];
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  function submit() {
    const text = value.trim();
    if (!text) return;
    const parsed = parseTaskInput(text, today, projects);
    const elsewhere = parsed.projectId && parsed.projectId !== projectId;
    onAdd({
      id: uuidv7(),
      title: parsed.title,
      dueDate: parsed.dueDate,
      dueTime: parsed.dueDate ? parsed.dueTime : null,
      repeat: parsed.repeat,
      priority: parsed.priority,
      projectId: elsewhere ? parsed.projectId : projectId,
      stageId: elsewhere ? null : stage.id,
      parentId: null,
    });
    setValue("");
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex h-8 flex-1 items-center gap-1.5 rounded-md px-2 text-[13px] text-ink-faint transition-colors hover:bg-surface-hover/60 hover:text-ink-muted"
      >
        <Plus className="size-3.5" />
        Add task
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={value}
      aria-label={`New task in ${stage.name}`}
      placeholder="Task name"
      maxLength={500}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") {
          e.stopPropagation();
          setValue("");
          setEditing(false);
        }
      }}
      onBlur={() => {
        submit();
        setEditing(false);
      }}
      className="h-9 w-full flex-1 rounded-md bg-surface-raised px-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-accent/40"
    />
  );
}

/** Brings open Inbox tasks into this stage. */
export function PullIn({
  stage,
  inbox,
  onPull,
}: {
  stage: StageItem;
  inbox: TaskItem[];
  onPull: (task: TaskItem, stage: StageItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = (q ? inbox.filter((t) => t.title.toLowerCase().includes(q)) : inbox).slice(0, 40);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
      label={`Pull Inbox tasks into ${stage.name}`}
      trigger={
        <button
          type="button"
          aria-label={`Pull Inbox tasks into ${stage.name}`}
          title="Pull in from Inbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex size-8 items-center justify-center rounded-md text-ink-faint transition-[color,background-color,transform] hover:bg-surface-hover/60 hover:text-ink-muted active:scale-90"
        >
          <Inbox className="size-3.5" />
        </button>
      }
      className="w-72"
    >
      <div className="flex h-9 items-center gap-2 rounded-md bg-surface-sunken px-2.5">
        <Search className="size-3.5 shrink-0 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the Inbox"
          aria-label="Search the Inbox"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
        />
      </div>
      <MenuGap />
      <div className="max-h-72 overflow-y-auto">
        {shown.length === 0 ? (
          <p className="px-2.5 py-3 text-[13px] text-ink-subtle">
            {inbox.length === 0 ? "Your Inbox is clear." : "Nothing matches."}
          </p>
        ) : (
          shown.map((t) => (
            <MenuItem key={t.id} icon={<Check />} onSelect={() => onPull(t, stage)}>
              {t.title}
            </MenuItem>
          ))
        )}
      </div>
    </Popover>
  );
}

/** The slim last column: name a new stage. */
export function AddStage({
  onAdd,
  disabled,
}: {
  onAdd: (name: string) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (disabled) return null;
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex h-11 w-[12rem] shrink-0 snap-start items-center justify-center gap-1.5 rounded-xl text-[13px] font-medium text-ink-subtle transition-colors hover:bg-surface hover:text-ink"
      >
        <Plus className="size-3.5" />
        Add stage
      </button>
    );
  }
  return (
    <input
      autoFocus
      maxLength={STAGE_LIMITS.nameLength}
      aria-label="New stage name"
      placeholder="Stage name"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const name = e.currentTarget.value.trim();
          if (name) onAdd(name);
          e.currentTarget.value = "";
        }
        if (e.key === "Escape") {
          e.stopPropagation();
          setEditing(false);
        }
      }}
      onBlur={(e) => {
        const name = e.currentTarget.value.trim();
        if (name) onAdd(name);
        setEditing(false);
      }}
      className="h-11 w-[12rem] shrink-0 rounded-xl bg-surface px-3 text-[13.5px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-faint focus:ring-2 focus:ring-accent/40"
    />
  );
}

"use client";

import { Play, Plus, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type KeyboardEvent } from "react";

import { Kbd } from "@/components/ui/kbd";
import { Popover } from "@/components/ui/popover";
import {
  colorOf,
  CoverImage,
  DueLabel,
  ProjectLabel,
  TaskCheck,
  TaskTitle,
  type ProjectItem,
  type TaskActions,
  type TaskItem,
} from "@/features/tasks";
import { FOCUS_MAX } from "@/features/today/schema";
import type { TaskChoice } from "@/features/time/schema";
import { cn } from "@/lib/cn";
import type { IsoDate } from "@/lib/dates";
import { uuidv7 } from "@/lib/id";
import { spring } from "@/lib/motion";

export type Pick = {
  id: string;
  title: string;
  task: TaskItem | undefined;
  projectColor: string | null;
  projectName: string | null;
};

/** A recurring task completed today has already moved on to its next date. */
export const isDoneToday = (task: TaskItem | undefined, today: IsoDate) =>
  Boolean(
    task &&
    (task.status === "done" ||
      (task.repeat && task.parentId === null && task.dueDate && task.dueDate > today)),
  );

export function TodaysThree({
  today,
  picks,
  suggestions,
  choices,
  projects,
  actions,
  focusingId,
  onPick,
  onUnpick,
  onOpen,
  onFocus,
}: {
  today: IsoDate;
  picks: Pick[];
  /** Due today or overdue, not yet picked: offered first. */
  suggestions: TaskItem[];
  /** Every open task, for search. */
  choices: TaskChoice[];
  projects: ProjectItem[];
  actions: TaskActions;
  /** The task the running focus timer is on. */
  focusingId: string | null;
  onPick: (id: string) => void;
  onUnpick: (id: string) => void;
  onOpen: (id: string) => void;
  onFocus: (pick: Pick) => void;
}) {
  const done = picks.filter((p) => isDoneToday(p.task, today)).length;
  const allDone = picks.length === FOCUS_MAX && done === FOCUS_MAX;

  return (
    <section aria-labelledby="three-title">
      <div className="mb-3 flex items-end justify-between gap-4 px-1">
        <div>
          <h2 id="three-title" className="text-[13px] font-semibold text-ink">
            Today’s three
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-subtle">
            {allDone
              ? "All three done. Anything else is a bonus."
              : picks.length === 0
                ? "Pick the few things that would make today count."
                : "The few things that would make today count."}
          </p>
        </div>
        {picks.length > 0 && (
          <span className="shrink-0 text-[12.5px] text-ink-subtle tabular-nums">
            {done} of {picks.length} done
          </span>
        )}
      </div>

      <ol className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: FOCUS_MAX }, (_, i) => {
          const pick = picks[i];
          return (
            <li
              key={pick?.id ?? `empty-${i}`}
              className={cn("grid", !pick && i !== picks.length && "max-sm:hidden")}
            >
              {pick ? (
                <PickedSlot
                  index={i}
                  pick={pick}
                  today={today}
                  projects={projects}
                  actions={actions}
                  focusing={focusingId === pick.id}
                  onUnpick={onUnpick}
                  onOpen={onOpen}
                  onFocus={onFocus}
                />
              ) : (
                <EmptySlot
                  index={i}
                  first={i === picks.length}
                  today={today}
                  picked={picks.map((p) => p.id)}
                  suggestions={suggestions}
                  choices={choices}
                  projects={projects}
                  actions={actions}
                  onPick={onPick}
                />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function PickedSlot({
  index,
  pick,
  today,
  projects,
  actions,
  focusing,
  onUnpick,
  onOpen,
  onFocus,
}: {
  index: number;
  pick: Pick;
  today: IsoDate;
  projects: ProjectItem[];
  actions: TaskActions;
  focusing: boolean;
  onUnpick: (id: string) => void;
  onOpen: (id: string) => void;
  onFocus: (pick: Pick) => void;
}) {
  const { task } = pick;
  const done = isDoneToday(task, today);
  const rolled = done && task?.status === "open";
  const project = task?.projectId ? projects.find((p) => p.id === task.projectId) : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={spring.gentle}
      className={cn(
        "group relative flex min-h-28 w-full flex-col rounded-xl p-4 transition-colors duration-500 sm:min-h-32",
        done ? "bg-room-tasks-soft/60" : "bg-surface-raised",
      )}
    >
      <div className="flex h-6 items-center justify-between">
        <span
          aria-hidden
          className={cn(
            "font-heading text-[22px] leading-none font-semibold tabular-nums transition-colors",
            done ? "text-room-tasks" : "text-ink-faint/70",
          )}
        >
          {index + 1}
        </span>
        <button
          type="button"
          onClick={() => onUnpick(pick.id)}
          aria-label={`Take “${pick.title}” out of today’s three`}
          title="Take out of today’s three"
          className="flex size-7 items-center justify-center rounded-md text-ink-faint opacity-0 transition-[opacity,background-color,color] group-hover:opacity-100 hover:bg-surface-hover hover:text-ink focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="mt-2.5 flex items-start gap-2.5">
        {task ? (
          <TaskCheck
            checked={done}
            label={`Complete “${pick.title}”`}
            className="mt-[3px]"
            onCheckedChange={(next) => {
              if (rolled) return;
              actions.update({ id: task.id, status: next ? "done" : "open" });
            }}
          />
        ) : (
          <span className="mt-[3px] size-[18px] shrink-0 rounded-full bg-surface-sunken" />
        )}
        <button
          type="button"
          onClick={() => onOpen(pick.id)}
          disabled={!task}
          className="min-w-0 text-left text-[15px] leading-snug font-medium text-ink"
        >
          <TaskTitle checked={done}>{pick.title}</TaskTitle>
        </button>
        {task?.cover && (
          <CoverImage
            cover={task.cover}
            dim={done}
            className="ml-auto size-11 shrink-0 rounded-lg"
          />
        )}
      </div>

      <div className="mt-auto flex min-h-7 items-center justify-between gap-2 pt-4">
        <span className="flex min-w-0 items-center gap-2">
          {project ? (
            <ProjectLabel name={project.name} color={project.color} />
          ) : pick.projectName ? (
            <span className="inline-flex items-center gap-1.5 truncate text-[12px] font-medium text-ink-subtle">
              <span
                className={cn("size-2 rounded-full", colorOf(pick.projectColor ?? "fern").dot)}
              />
              {pick.projectName}
            </span>
          ) : null}
          {task?.dueDate && task.dueDate !== today && !done && (
            <DueLabel date={task.dueDate} time={task.dueTime} today={today} />
          )}
        </span>
        <AnimatePresence initial={false} mode="popLayout">
          {!done && (
            <motion.button
              key={focusing ? "focusing" : "focus"}
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={spring.snappy}
              onClick={() => onFocus(pick)}
              disabled={focusing}
              aria-label={focusing ? `Focusing on “${pick.title}”` : `Focus on “${pick.title}”`}
              className={cn(
                "flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-[background-color,transform] active:scale-95",
                focusing
                  ? "bg-room-time-soft text-room-time"
                  : "bg-surface-sunken text-ink-muted hover:bg-room-time-soft hover:text-room-time",
              )}
            >
              {focusing ? (
                <>
                  <span className="size-1.5 animate-pulse rounded-full bg-room-time" />
                  Focusing
                </>
              ) : (
                <>
                  <Play className="size-3" fill="currentColor" />
                  Focus
                </>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function EmptySlot({
  index,
  first,
  today,
  picked,
  suggestions,
  choices,
  projects,
  actions,
  onPick,
}: {
  index: number;
  /** The next slot to fill: drawn a little stronger. */
  first: boolean;
  today: IsoDate;
  picked: string[];
  suggestions: TaskItem[];
  choices: TaskChoice[];
  projects: ProjectItem[];
  actions: TaskActions;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listId = useId();
  const q = query.trim().toLowerCase();
  const matches = (title: string) => !q || title.toLowerCase().includes(q);

  const soon = suggestions.filter((t) => !picked.includes(t.id) && matches(t.title)).slice(0, 6);
  const soonIds = new Set(soon.map((t) => t.id));
  const rest = choices
    .filter((c) => !picked.includes(c.id) && !soonIds.has(c.id) && matches(c.title))
    .slice(0, q ? 30 : 8);
  const exact = [...soon, ...rest].some((t) => t.title.toLowerCase() === q);

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const pick = (id: string) => {
    onPick(id);
    close();
  };
  const create = () => {
    const title = query.trim();
    if (!title) return;
    const id = uuidv7();
    actions.add({
      id,
      title,
      dueDate: today,
      dueTime: null,
      repeat: null,
      priority: 0,
      projectId: null,
      parentId: null,
    });
    pick(id);
  };

  // Enter takes the best match; a new task only when nothing matches.
  const top = soon[0] ?? rest[0];
  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      document.getElementById(listId)?.querySelector<HTMLElement>("button")?.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (top) pick(top.id);
      else create();
    }
  };

  const addItem = (
    <Item onSelect={create} enter={!top}>
      <Plus className="size-3.5 shrink-0 text-room-tasks" />
      <span className="flex-1 truncate">
        Add “<span className="text-ink">{query.trim()}</span>” for today
      </span>
    </Item>
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
      label={`Pick task ${index + 1} of today’s three`}
      align={index === FOCUS_MAX - 1 ? "end" : "start"}
      className="w-80 max-w-[calc(100vw-2.5rem)] p-1.5"
      trigger={
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "group flex h-full w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors sm:min-h-32 sm:flex-col sm:items-start sm:py-4",
            first
              ? "bg-surface-sunken/70 text-ink-muted hover:bg-surface-sunken hover:text-ink"
              : "bg-surface-sunken/35 text-ink-faint hover:bg-surface-sunken/70 hover:text-ink-muted",
          )}
        >
          <span
            aria-hidden
            className="flex h-6 items-center font-heading text-[22px] leading-none font-semibold text-ink-faint/50 tabular-nums"
          >
            {index + 1}
          </span>
          <span className="flex items-center gap-2.5 text-[13px] font-medium sm:mt-auto">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full transition-transform duration-300 ease-spring group-hover:scale-110 group-hover:rotate-90",
                first ? "bg-surface-raised text-ink" : "bg-surface-raised/60",
              )}
            >
              <Plus className="size-3.5" />
            </span>
            {first ? "Pick a task" : "Pick another"}
          </span>
        </button>
      }
    >
      <div className="flex items-center gap-2 rounded-md bg-surface-sunken px-2.5">
        <Search className="size-3.5 shrink-0 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder="Find or add a task…"
          aria-label="Find or add a task"
          aria-controls={listId}
          maxLength={500}
          className="h-9 min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-faint"
        />
      </div>
      <div id={listId} className="mt-1 max-h-80 overflow-y-auto">
        {!top && q && addItem}
        {soon.length > 0 && <Group>Due today</Group>}
        {soon.map((t) => (
          <Item key={t.id} onSelect={() => pick(t.id)} enter={t.id === top?.id && Boolean(q)}>
            <Dot color={projects.find((p) => p.id === t.projectId)?.color ?? null} />
            <span className="flex-1 truncate">{t.title}</span>
            {t.dueDate && t.dueDate < today && (
              <span className="shrink-0 text-[11.5px] text-warning">Overdue</span>
            )}
          </Item>
        ))}
        {rest.length > 0 && <Group>{q ? "Other tasks" : "From your lists"}</Group>}
        {rest.map((c) => (
          <Item key={c.id} onSelect={() => pick(c.id)} enter={c.id === top?.id && Boolean(q)}>
            <Dot color={c.projectColor} />
            <span className="flex-1 truncate">{c.title}</span>
            {c.projectName && (
              <span className="max-w-24 shrink-0 truncate text-[12px] text-ink-faint">
                {c.projectName}
              </span>
            )}
          </Item>
        ))}
        {top && q && !exact && (
          <>
            <div aria-hidden className="h-1.5" />
            {addItem}
          </>
        )}
        {!top && !q && (
          <p className="px-2.5 py-3 text-[13px] text-ink-subtle">
            No open tasks yet. Type to add one for today.
          </p>
        )}
      </div>
    </Popover>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2.5 pt-2 pb-1 text-[11px] font-medium tracking-wide text-ink-faint uppercase">
      {children}
    </p>
  );
}

function Dot({ color }: { color: string | null }) {
  return (
    <span
      className={cn("size-2 shrink-0 rounded-full", color ? colorOf(color).dot : "bg-ink-faint")}
    />
  );
}

function Item({
  onSelect,
  enter = false,
  children,
}: {
  onSelect: () => void;
  /** What Enter in the search box would choose. */
  enter?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] transition-colors hover:bg-surface-hover hover:text-ink focus-visible:-outline-offset-2",
        enter ? "bg-surface-sunken text-ink" : "text-ink-muted",
      )}
    >
      {children}
      {enter && <Kbd className="shrink-0">↵</Kbd>}
    </button>
  );
}

"use client";

import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import { CalendarDays, ChevronRight, Ellipsis, GripVertical, Pencil } from "lucide-react";
import { motion } from "motion/react";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
} from "react";

import { cn } from "@/lib/cn";
import type { IsoDate } from "@/lib/dates";
import { isTypingTarget } from "@/lib/keyboard";
import { spring } from "@/lib/motion";

import type { TaskActions } from "../hooks/use-tasks";
import type { Priority } from "../parse";
import type { ProjectItem, TaskItem } from "../schema";
import { TaskCheck, TaskTitle } from "./task-check";
import { CoverImage } from "./task-cover";
import { DateMenu, TaskMenu } from "./task-menus";
import {
  DetailHints,
  DueLabel,
  PriorityLabel,
  priorityMeta,
  ProjectLabel,
  RepeatLabel,
} from "./task-meta";

/** Long enough to enjoy the check animation before the row moves away. */
const SETTLE_MS = 650;

/** Clicks on these do their own thing; anywhere else on the row opens the task. */
const OWN_CLICK = "button, a, input, textarea, label, [role=dialog]";

/** Pressing inside these never picks the row up (menus can render inside the row's tree). */
const NO_DRAG = "input, textarea, [role=dialog]";

export type TaskRowProps = {
  task: TaskItem;
  today: IsoDate;
  actions: TaskActions;
  projects?: ProjectItem[];
  /** Show which project the task is in (off inside a project's own view). */
  showProject?: boolean;
  hideDueWhenToday?: boolean;
  compact?: boolean;
  /** Subtask progress for the meta line. */
  progress?: { done: number; total: number };
  /** Opens the detail panel; without it, clicking the title renames inline. */
  onOpen?: (id: string) => void;
  selected?: boolean;
  /** The keyboard cursor is on this row: it answers x, e, Delete, 0–3 and the menu key. */
  focused?: boolean;
  /** Set when the list can be reordered by dragging the row. */
  drag?: RowDrag;
  /** AnimatePresence "popLayout" measures the row through this ref. */
  ref?: Ref<HTMLLIElement>;
};

export type RowDrag = {
  setNodeRef: (node: HTMLElement | null) => void;
  listeners: DraggableSyntheticListeners;
  style: CSSProperties;
  dragging: boolean;
  /** Some row is being dragged: hold layout animations so they don't fight the drag. */
  active: boolean;
};

export function TaskRow({
  task,
  today,
  actions,
  projects = [],
  showProject = false,
  hideDueWhenToday = false,
  compact = false,
  progress = { done: 0, total: 0 },
  onOpen,
  selected = false,
  focused = false,
  drag,
  ref,
}: TaskRowProps) {
  const project = showProject ? projects.find((p) => p.id === task.projectId) : undefined;
  const [settling, setSettling] = useState(false);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const rowRef = useRef<HTMLDivElement>(null);
  const done = task.status === "done";
  const checked = done || settling;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || editing) return;
    const key = e.key.toLowerCase();
    if (key === "x") toggle(!checked);
    else if (key === "e" && !done) setEditing(true);
    else if (key === "delete" || key === "backspace") actions.remove(task.id);
    else if (key === "contextmenu" || (e.shiftKey && key === "f10")) setMenuOpen(true);
    else if (["0", "1", "2", "3"].includes(key) && !done) setPriority(Number(key) as Priority);
    else return;
    e.preventDefault();
  });

  useEffect(() => {
    if (!focused) return;
    rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const listener = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [focused]);

  function toggle(next: boolean) {
    if (done) return actions.update({ id: task.id, status: "open" });
    if (next) {
      setSettling(true);
      timer.current = window.setTimeout(() => {
        actions.update({ id: task.id, status: "done" });
        // A recurring task stays open (it moves to its next date): uncheck it again.
        if (task.repeat && task.dueDate) setSettling(false);
      }, SETTLE_MS);
    } else {
      window.clearTimeout(timer.current);
      setSettling(false);
    }
  }

  function setPriority(priority: Priority) {
    if (priority !== task.priority) actions.update({ id: task.id, priority });
  }

  function moveTo(projectId: string | null) {
    const name = projects.find((p) => p.id === projectId)?.name ?? "Inbox";
    actions.update({ id: task.id, projectId }, { announce: `Moved to ${name}` });
  }

  function onRowClick(e: MouseEvent) {
    if (!onOpen || editing) return;
    if ((e.target as Element).closest(OWN_CLICK)) return;
    // Selecting text to copy isn't a click.
    if (window.getSelection()?.toString()) return;
    onOpen(task.id);
  }

  function onContextMenu(e: MouseEvent) {
    // A touch long-press also lifts the row for dragging; don't open the menu under it.
    if (drag?.dragging) return e.preventDefault();
    if (editing || (e.target as Element).closest("input, textarea, [role=dialog]")) return;
    e.preventDefault();
    setMenuOpen(true);
  }

  const dragListeners =
    drag?.listeners && !editing
      ? Object.fromEntries(
          Object.entries(drag.listeners).map(([name, handler]) => [
            name,
            (e: SyntheticEvent) => {
              if (!(e.target as Element).closest(NO_DRAG)) handler(e);
            },
          ]),
        )
      : undefined;

  const showDue = task.dueDate && !(hideDueWhenToday && task.dueDate === today && !task.dueTime);
  const hasNotes = Boolean(task.notes);
  const showMeta =
    showDue || task.repeat || task.priority > 0 || project || progress.total > 0 || hasNotes;
  const ringClass = !checked && task.priority ? priorityMeta[task.priority].ring : undefined;

  return (
    <motion.li
      ref={ref}
      layout={drag?.active ? false : "position"}
      // A row dropped into another section re-mounts there: arrive and leave in place.
      initial={drag?.active ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={
        drag?.active
          ? { opacity: 0, transition: { duration: 0 } }
          : { opacity: 0, x: 12, transition: { duration: 0.18 } }
      }
      transition={spring.gentle}
      className={cn("group relative", drag?.dragging && "z-20")}
    >
      {/* dnd-kit moves this wrapper; the li's own transform belongs to motion. */}
      <div ref={drag?.setNodeRef} style={drag?.style} className="relative">
        {focused && !drag?.dragging && (
          <motion.span
            aria-hidden
            layoutId="task-cursor"
            transition={spring.snappy}
            className="absolute top-3 bottom-3 left-0 w-[3px] rounded-full bg-accent"
          />
        )}
        {drag && !done && !editing && (
          <span
            aria-hidden
            className={cn(
              "absolute top-2.5 -left-5 hidden h-6 w-4 items-center justify-center text-ink-faint transition-opacity md:flex [@media(hover:none)]:hidden",
              drag.dragging ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
          >
            <GripVertical className="size-3.5" />
          </span>
        )}
        <div
          ref={rowRef}
          onClick={onRowClick}
          onContextMenu={onContextMenu}
          {...dragListeners}
          className={cn(
            "flex items-start gap-3 rounded-lg transition-[background-color,box-shadow,scale] duration-200",
            drag?.dragging
              ? "scale-[1.01] cursor-grabbing bg-surface-raised shadow-lg"
              : selected || focused || menuOpen
                ? "bg-surface-hover/70"
                : "hover:bg-surface-hover/50",
            onOpen && !editing && !drag?.dragging && "cursor-pointer",
            compact ? "py-1.5 pr-1.5 pl-2" : "py-2 pr-2 pl-3",
          )}
        >
          <TaskCheck
            checked={checked}
            onCheckedChange={toggle}
            label={`Complete “${task.title}”`}
            className={cn("mt-[5px]", ringClass)}
          />

          <div className="min-w-0 flex-1 py-0.5">
            {editing ? (
              <TitleEditor
                initial={task.title}
                onDone={(title) => {
                  setEditing(false);
                  if (title && title !== task.title) actions.update({ id: task.id, title });
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => (onOpen ? onOpen(task.id) : !done && setEditing(true))}
                aria-haspopup={onOpen ? "dialog" : undefined}
                className="block max-w-full text-left text-[14.5px] leading-6 break-words"
              >
                <TaskTitle checked={checked}>{task.title}</TaskTitle>
                <span className="sr-only">{onOpen ? ", open details" : ", rename"}</span>
              </button>
            )}

            {showMeta && !done && (
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                {showDue && <DueLabel date={task.dueDate!} time={task.dueTime} today={today} />}
                {task.repeat && <RepeatLabel rule={task.repeat} />}
                <PriorityLabel priority={task.priority} />
                <DetailHints done={progress.done} total={progress.total} notes={hasNotes} />
                {project && <ProjectLabel name={project.name} color={project.color} />}
              </div>
            )}
          </div>

          {task.cover && !editing && (
            <CoverImage
              cover={task.cover}
              dim={done}
              className={cn("shrink-0 rounded-md", compact ? "mt-0.5 size-8" : "mt-0.5 size-10")}
            />
          )}

          {!editing && (
            <div className="flex shrink-0 items-center">
              {/* Quick actions surface on hover or keyboard focus; touch keeps just the menu. */}
              <div
                className={cn(
                  "flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 has-[[role=dialog]]:opacity-100 [@media(hover:none)]:opacity-100",
                  (menuOpen || focused) && "opacity-100",
                )}
              >
                {!done && (
                  <RowAction label="Rename" onClick={() => setEditing(true)} desktopOnly>
                    <Pencil />
                  </RowAction>
                )}
                {!done && (
                  <DateMenu
                    value={task.dueDate}
                    today={today}
                    onChange={(dueDate) => actions.update({ id: task.id, dueDate })}
                    trigger={({ toggle: open }) => (
                      <RowAction label="Due date" onClick={open} desktopOnly>
                        <CalendarDays />
                      </RowAction>
                    )}
                  />
                )}
                <TaskMenu
                  task={task}
                  projects={projects}
                  open={menuOpen}
                  onOpenChange={setMenuOpen}
                  onOpenDetails={onOpen && (() => onOpen(task.id))}
                  onRename={() => setEditing(true)}
                  onToggle={() => toggle(!checked)}
                  onPriority={setPriority}
                  onMove={moveTo}
                  onDelete={() => actions.remove(task.id)}
                  trigger={
                    <RowAction
                      label="More actions"
                      onClick={() => setMenuOpen((o) => !o)}
                      expanded={menuOpen}
                    >
                      <Ellipsis />
                    </RowAction>
                  }
                />
              </div>
              {onOpen && (
                <span
                  aria-hidden
                  className={cn(
                    "flex h-8 w-5 items-center justify-center text-ink-faint transition-[opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 [@media(hover:none)]:opacity-100",
                    selected ? "opacity-100" : "opacity-0",
                  )}
                >
                  <ChevronRight className="size-4" />
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.li>
  );
}

function RowAction({
  label,
  onClick,
  expanded,
  desktopOnly = false,
  children,
}: {
  label: string;
  onClick: () => void;
  expanded?: boolean;
  /** Touch gets these from the detail panel and the menu instead. */
  desktopOnly?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-haspopup={expanded === undefined ? undefined : "dialog"}
      aria-expanded={expanded}
      title={label}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-ink-subtle transition-[color,background-color,transform] hover:bg-surface-hover hover:text-ink active:scale-90 [&_svg]:size-4",
        expanded && "bg-surface-hover text-ink",
        desktopOnly && "[@media(hover:none)]:hidden",
      )}
    >
      {children}
    </button>
  );
}

function TitleEditor({ initial, onDone }: { initial: string; onDone: (title: string) => void }) {
  const [value, setValue] = useState(initial);
  const cancelled = useRef(false);

  return (
    <input
      autoFocus
      value={value}
      aria-label="Task title"
      maxLength={500}
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          // Esc cancels the rename only; it shouldn't also clear the cursor or close a panel.
          e.stopPropagation();
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      onBlur={() => onDone(cancelled.current ? initial : value.trim())}
      className="-mx-1.5 w-[calc(100%+12px)] rounded-sm bg-surface-sunken px-1.5 text-[14.5px] leading-6 text-ink outline-none focus:ring-2 focus:ring-accent/40"
    />
  );
}

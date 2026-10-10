"use client";

import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Ellipsis, Repeat } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type SyntheticEvent,
} from "react";

import {
  CoverImage,
  DetailHints,
  DueLabel,
  describeRepeat,
  priorityMeta,
  PriorityLabel,
  ProjectLabel,
  TaskCheck,
  TaskMenu,
  TaskTitle,
  type Priority,
  type ProjectItem,
  type TaskActions,
  type TaskItem,
} from "@/features/tasks";
import { useSettings } from "@/components/shell/settings-context";
import { cn } from "@/lib/cn";
import { formatTime, type IsoDate } from "@/lib/dates";

/** Long enough to enjoy the check animation before the card moves. */
const SETTLE_MS = 650;

/** Clicks on these do their own thing; anywhere else on the card opens the task. */
const OWN_CLICK = "button, a, input, textarea, label, [role=dialog]";
/** Pressing inside these never picks the card up. */
const NO_DRAG = "input, textarea, [role=dialog]";

export type Step = "up" | "down" | "left" | "right";
const STEPS: Record<string, Step> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

export type CardProps = {
  task: TaskItem;
  today: IsoDate;
  projects: ProjectItem[];
  actions: TaskActions;
  progress: { done: number; total: number };
  onOpen: (id: string) => void;
  /** Alt + arrow keys: move the task a day, or up and down its day. */
  onStep?: (task: TaskItem, step: Step) => void;
  /** Overdue tasks show their date; tasks on a day only their time. */
  showDate?: boolean;
  /** In the Unscheduled tray: a fixed width in the strip, the cover as a thumbnail. */
  tray?: boolean;
};

type Face = {
  nodeRef?: (node: HTMLElement | null) => void;
  listeners?: DraggableSyntheticListeners;
  style?: CSSProperties;
  /** The card's slot while it's being dragged. */
  placeholder?: boolean;
  /** The copy that follows the pointer. */
  overlay?: boolean;
};

export function SortableCard(props: CardProps) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({
    id: props.task.id,
  });
  return (
    <PlannerCard
      {...props}
      nodeRef={setNodeRef}
      listeners={listeners}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      placeholder={isDragging}
    />
  );
}

export function PlannerCard({
  task,
  today,
  projects,
  actions,
  progress,
  onOpen,
  onStep,
  showDate = false,
  tray = false,
  nodeRef,
  listeners,
  style,
  placeholder = false,
  overlay = false,
}: CardProps & Face) {
  const [settling, setSettling] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { timeFormat } = useSettings();
  const timer = useRef<number | undefined>(undefined);
  const done = task.status === "done";
  const checked = done || settling;
  const project = projects.find((p) => p.id === task.projectId);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function toggle(next: boolean) {
    if (done) return actions.update({ id: task.id, status: "open" });
    if (next) {
      setSettling(true);
      timer.current = window.setTimeout(() => {
        actions.update({ id: task.id, status: "done" });
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

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if ((e.target as Element).closest(NO_DRAG) || e.metaKey || e.ctrlKey) return;
    if (e.altKey) {
      const step = STEPS[e.key];
      if (!step || done || !onStep) return;
      e.preventDefault();
      return onStep(task, step);
    }
    const key = e.key.toLowerCase();
    if (key === "x") toggle(!checked);
    else if (key === "delete" || key === "backspace") actions.remove(task.id);
    else if (key === "contextmenu" || (e.shiftKey && key === "f10")) setMenuOpen(true);
    else if (["0", "1", "2", "3"].includes(key) && !done) setPriority(Number(key) as Priority);
    else return;
    e.preventDefault();
  }

  function onClick(e: MouseEvent) {
    if ((e.target as Element).closest(OWN_CLICK)) return;
    if (window.getSelection()?.toString()) return;
    onOpen(task.id);
  }

  function onContextMenu(e: MouseEvent) {
    if ((e.target as Element).closest("input, textarea, [role=dialog]")) return;
    e.preventDefault();
    setMenuOpen(true);
  }

  const dragListeners = listeners
    ? Object.fromEntries(
        Object.entries(listeners).map(([name, handler]) => [
          name,
          (e: SyntheticEvent) => {
            if (!(e.target as Element).closest(NO_DRAG)) handler(e);
          },
        ]),
      )
    : undefined;

  const ringClass = !checked && task.priority ? priorityMeta[task.priority].ring : undefined;
  const time = !showDate && task.dueTime ? formatTime(task.dueTime, timeFormat) : null;
  const hasMeta =
    !done &&
    (showDate ||
      time ||
      task.priority > 0 ||
      task.repeat ||
      progress.total > 0 ||
      task.notes ||
      project);

  return (
    <div
      ref={nodeRef}
      style={style}
      data-card={task.id}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onKeyDown={onKeyDown}
      {...dragListeners}
      className={cn(
        "group relative rounded-lg py-2 pr-2 pl-2.5 transition-colors duration-200",
        tray && !overlay && "w-60 shrink-0 2xl:w-auto",
        placeholder
          ? "bg-surface-sunken [&>*]:invisible"
          : overlay
            ? "scale-[1.02] cursor-grabbing bg-surface-raised shadow-lg"
            : done
              ? "cursor-pointer hover:bg-surface-hover/60"
              : cn(
                  "cursor-pointer hover:bg-surface-hover",
                  menuOpen ? "bg-surface-hover" : "bg-surface-raised",
                ),
      )}
    >
      {task.cover && !tray && (
        <CoverImage
          cover={task.cover}
          dim={done}
          className="mb-2 -ml-0.5 aspect-[2/1] rounded-md"
        />
      )}
      <div className="flex items-start gap-2">
        <TaskCheck
          checked={checked}
          onCheckedChange={toggle}
          label={`Complete “${task.title}”`}
          className={cn("mt-px", ringClass)}
        />
        <button
          type="button"
          data-title
          onClick={() => onOpen(task.id)}
          aria-haspopup="dialog"
          className="min-w-0 flex-1 text-left text-[13.5px] leading-5 break-words"
        >
          <TaskTitle checked={checked}>{task.title}</TaskTitle>
          <span className="sr-only">, open details</span>
        </button>
        {task.cover && tray && (
          <CoverImage cover={task.cover} dim={done} className="size-9 shrink-0 rounded-md" />
        )}
      </div>

      {hasMeta && (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-[26px]">
          {showDate && task.dueDate && (
            <DueLabel date={task.dueDate} time={task.dueTime} today={today} />
          )}
          {time && (
            <span className="text-[12px] font-medium text-ink-subtle tabular-nums">{time}</span>
          )}
          <PriorityLabel priority={task.priority} />
          {task.repeat && (
            <span className="inline-flex text-ink-subtle" title={describeRepeat(task.repeat)}>
              <Repeat className="size-3.5" strokeWidth={2} aria-hidden />
              <span className="sr-only">Repeats {describeRepeat(task.repeat)}</span>
            </span>
          )}
          <DetailHints done={progress.done} total={progress.total} notes={Boolean(task.notes)} />
          {project && <ProjectLabel name={project.name} color={project.color} />}
        </div>
      )}

      {!overlay && (
        <div
          className={cn(
            // Takes the card's own background, so it sits cleanly over a long title.
            "absolute top-1 right-1 rounded-md bg-inherit opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 has-[[role=dialog]]:opacity-100 [@media(hover:none)]:hidden",
            menuOpen && "opacity-100",
          )}
        >
          <TaskMenu
            task={task}
            projects={projects}
            open={menuOpen}
            onOpenChange={setMenuOpen}
            onOpenDetails={() => onOpen(task.id)}
            onToggle={() => toggle(!checked)}
            onPriority={setPriority}
            onMove={moveTo}
            onDelete={() => actions.remove(task.id)}
            trigger={
              <button
                type="button"
                aria-label="More actions"
                aria-haspopup="dialog"
                aria-expanded={menuOpen}
                title="More actions"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex size-7 items-center justify-center rounded-md text-ink-subtle transition-[color,background-color,transform] hover:bg-surface-sunken hover:text-ink active:scale-90"
              >
                <Ellipsis className="size-4" />
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}

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
  describeRepeat,
  DetailHints,
  DueLabel,
  priorityMeta,
  PriorityLabel,
  TaskCheck,
  TaskMenu,
  TaskTitle,
  type Priority,
  type ProjectItem,
  type TaskActions,
  type TaskItem,
} from "@/features/tasks";
import { cn } from "@/lib/cn";
import type { IsoDate } from "@/lib/dates";

/** Long enough to enjoy the check animation before the card flies to Done. */
const SETTLE_MS = 650;

const OWN_CLICK = "button, a, input, textarea, label, [role=dialog]";
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
  /** Alt + arrows: to the next or previous stage, or up and down the column. */
  onStep?: (task: TaskItem, step: Step) => void;
  /** Plain arrows: walk focus across the board. */
  onFocusMove?: (task: TaskItem, step: Step) => void;
};

type Face = {
  nodeRef?: (node: HTMLElement | null) => void;
  listeners?: DraggableSyntheticListeners;
  style?: CSSProperties;
  placeholder?: boolean;
  overlay?: boolean;
};

export function SortableCard(props: CardProps) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({
    id: props.task.id,
  });
  return (
    <OrbitCard
      {...props}
      nodeRef={setNodeRef}
      listeners={listeners}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      placeholder={isDragging}
    />
  );
}

export function OrbitCard({
  task,
  today,
  projects,
  actions,
  progress,
  onOpen,
  onStep,
  onFocusMove,
  nodeRef,
  listeners,
  style,
  placeholder = false,
  overlay = false,
}: CardProps & Face) {
  const [settling, setSettling] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const done = task.status === "done";
  const checked = done || settling;

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
    const step = STEPS[e.key];
    if (step) {
      e.preventDefault();
      return e.altKey ? onStep?.(task, step) : onFocusMove?.(task, step);
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
  const hasMeta =
    !done && (task.dueDate || task.priority > 0 || task.repeat || progress.total > 0 || task.notes);

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
        "group relative rounded-lg py-2.5 pr-2 pl-2.5 transition-colors duration-200",
        placeholder
          ? "bg-surface-sunken [&>*]:invisible"
          : overlay
            ? "scale-[1.02] rotate-[0.6deg] cursor-grabbing bg-surface-raised shadow-lg"
            : done
              ? "cursor-pointer hover:bg-surface-hover/60"
              : cn(
                  "cursor-pointer hover:bg-surface-hover",
                  menuOpen ? "bg-surface-hover" : "bg-surface-raised",
                ),
      )}
    >
      {task.cover && (
        <CoverImage
          cover={task.cover}
          dim={done}
          className="-mt-0.5 mb-2 -ml-0.5 aspect-[16/9] rounded-md"
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
      </div>

      {hasMeta && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-[26px]">
          {task.dueDate && <DueLabel date={task.dueDate} time={task.dueTime} today={today} />}
          <PriorityLabel priority={task.priority} />
          {task.repeat && (
            <span className="inline-flex text-ink-subtle" title={describeRepeat(task.repeat)}>
              <Repeat className="size-3.5" strokeWidth={2} aria-hidden />
              <span className="sr-only">Repeats {describeRepeat(task.repeat)}</span>
            </span>
          )}
          <DetailHints done={progress.done} total={progress.total} notes={Boolean(task.notes)} />
        </div>
      )}

      {progress.total > 0 && !done && (
        <div
          aria-hidden
          className="mt-2 ml-[26px] h-1 overflow-hidden rounded-full bg-surface-sunken"
        >
          <div
            className="h-full origin-left rounded-full bg-room-orbit transition-transform duration-500 ease-spring"
            style={{ transform: `scaleX(${progress.done / progress.total})` }}
          />
        </div>
      )}

      {!overlay && (
        <div
          className={cn(
            "absolute top-1.5 right-1 rounded-md bg-inherit opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 has-[[role=dialog]]:opacity-100 [@media(hover:none)]:hidden",
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

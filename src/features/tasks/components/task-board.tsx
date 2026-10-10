"use client";

import {
  closestCenter,
  DndContext,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type Modifier,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { Alert } from "@/components/ui/alert";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/cn";
import type { IsoDate } from "@/lib/dates";
import { isMac, isTypingTarget } from "@/lib/keyboard";
import { spring } from "@/lib/motion";
import { useDevicePref } from "@/lib/use-device-pref";

import { useTaskNavigation } from "../hooks/use-task-navigation";
import { useTasks, type TaskActions } from "../hooks/use-tasks";
import {
  compareTasks,
  placeTask,
  sectionOf,
  stepTask,
  type Placement,
  type SectionId,
} from "../order";
import { inScope, type ProjectItem, type TaskItem, type TaskScope } from "../schema";
import { QuickAdd } from "./quick-add";
import { TaskDetail } from "./task-detail";
import { TaskRow, type TaskRowProps } from "./task-row";

type Props = {
  open: TaskItem[];
  completed: TaskItem[];
  today: IsoDate;
  projects: ProjectItem[];
  scope: TaskScope;
  /** From `?task=` (e.g. a command palette result): open this task's panel. */
  openTaskId?: string | null;
};

type RowContext = {
  today: IsoDate;
  actions: TaskActions;
  projects: ProjectItem[];
  showProject: boolean;
  subtasksOf: Map<string, TaskItem[]>;
  selectedId: string | null;
  cursorId: string | null;
  onOpen: (id: string) => void;
  /** The task being dragged, if any. */
  dragging: TaskItem | null;
  /** A drag is in progress or just landed: rows hold their layout animations. */
  dragActive: boolean;
};

/** Long enough for the dropped row to settle before layout animations resume. */
const DROP_SETTLE_MS = 400;

const ZONE = "zone:";

const zoneCopy: Partial<Record<SectionId, string>> = {
  today: "Drop here to do it today",
  upcoming: "Drop here to do it tomorrow",
  someday: "Drop here to clear the date",
};

/** Empty sections a dragged task may land in (the board hides empty sections otherwise). */
function canLandIn(section: SectionId, task: TaskItem) {
  return section !== "overdue" && !(section === "someday" && task.repeat);
}

const vertical: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/** Empty-section zones win while the pointer is inside them; rows sort by nearest center. */
const collide: CollisionDetection = (args) => {
  const isZone = (id: UniqueIdentifier) => String(id).startsWith(ZONE);
  const zones = pointerWithin({
    ...args,
    droppableContainers: args.droppableContainers.filter((c) => isZone(c.id)),
  });
  if (zones.length > 0) return zones;
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter((c) => !isZone(c.id)),
  });
};

/** The click that ends a mouse drag shouldn't also open the task or tick its checkbox. */
function swallowNextClick() {
  const stop = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
  };
  window.addEventListener("click", stop, { capture: true, once: true });
  window.setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
}

export function TaskBoard({ open, completed, today, projects, scope, openTaskId = null }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { tasks, error, dismissError, ...actions } = useTasks([...open, ...completed], today);
  // Null until toggled here: follows the device preference (Settings → Tasks).
  const [completedToggle, setCompletedToggle] = useState<boolean | null>(null);
  const completedByDefault = useDevicePref("showCompleted");
  const showCompleted = completedToggle ?? completedByDefault;
  const [dragId, setDragId] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);
  const settleTimer = useRef<number | undefined>(undefined);
  const unlink = useCallback(() => {
    if (openTaskId) router.replace(pathname as Route, { scroll: false });
  }, [openTaskId, pathname, router]);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  const sensors = useSensors(
    // A few pixels of travel before lifting, so a click still opens the task.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Touch lifts on a long press, so a swipe still scrolls the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const subtasksOf = new Map<string, TaskItem[]>();
  for (const t of tasks) {
    if (t.parentId) subtasksOf.set(t.parentId, [...(subtasksOf.get(t.parentId) ?? []), t]);
  }
  const topLevel = tasks.filter((t) => !t.parentId);
  const visible = topLevel.filter((t) => inScope(t, scope));

  const openTasks = visible.filter((t) => t.status === "open").sort(compareTasks);
  const doneTasks = visible
    .filter((t) => t.status === "done")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  const sections: Record<SectionId, TaskItem[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    someday: [],
  };
  for (const t of openTasks) sections[sectionOf(t, today)].push(t);

  const order = openTasks.concat(showCompleted ? doneTasks : []).map((t) => t.id);
  const nav = useTaskNavigation({
    order,
    openable: topLevel.map((t) => t.id),
    linkedId: openTaskId,
    onClose: unlink,
  });
  const selected = topLevel.find((t) => t.id === nav.openId);
  const dragging = openTasks.find((t) => t.id === dragId) ?? null;

  function place(task: TaskItem, { dueDate, sortKey }: Placement) {
    actions.update({ id: task.id, sortKey, ...(dueDate !== task.dueDate && { dueDate }) });
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (!e.altKey || e.metaKey || e.ctrlKey || isTypingTarget(e.target)) return;
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    const task = openTasks.find((t) => t.id === nav.cursorId);
    if (!task) return;
    e.preventDefault();
    const placement = stepTask(task, sections, e.key === "ArrowUp" ? -1 : 1, today);
    if (placement) place(task, placement);
  });

  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  function endDrag() {
    setDragId(null);
    swallowNextClick();
    setSettling(true);
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => setSettling(false), DROP_SETTLE_MS);
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    endDrag();
    const task = openTasks.find((t) => t.id === active.id);
    if (!task || !over) return;

    const overId = String(over.id);
    let section: SectionId;
    let rows: TaskItem[];
    let index: number;
    if (overId.startsWith(ZONE)) {
      section = overId.slice(ZONE.length) as SectionId;
      rows = sections[section];
      index = 0;
    } else {
      const target = openTasks.find((t) => t.id === overId);
      if (!target) return;
      section = sectionOf(target, today);
      rows = sections[section].filter((t) => t.id !== task.id);
      // Where the row sits after the move, as drawn during the drag.
      const flat = openTasks.map((t) => t.id);
      const moved = arrayMove(flat, flat.indexOf(task.id), flat.indexOf(target.id));
      const at = moved.indexOf(task.id);
      index = rows.filter((r) => moved.indexOf(r.id) < at).length;
    }

    const placement = placeTask(task, rows, index, section, today);
    if (placement) place(task, placement);
  }

  const titleOf = (id: UniqueIdentifier) => {
    const title = openTasks.find((t) => t.id === id)?.title;
    return title ? `“${title}”` : "the task";
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${titleOf(active.id)} is over ${titleOf(over.id)}.` : undefined,
    onDragEnd: ({ active }) => `Dropped ${titleOf(active.id)}.`,
    onDragCancel: ({ active }) => `Put ${titleOf(active.id)} back.`,
  };

  const ctx: RowContext = {
    today,
    actions,
    projects,
    showProject: scope.kind === "all",
    subtasksOf,
    selectedId: nav.openId,
    cursorId: nav.cursorId,
    onOpen: nav.open,
    dragging,
    dragActive: dragId !== null || settling,
  };

  return (
    <div className="flex flex-col gap-6">
      <QuickAdd
        today={today}
        projects={projects}
        onAdd={actions.add}
        defaultProjectId={scope.kind === "project" ? scope.id : null}
        claimCapture
      />

      {error && (
        <Alert tone="danger">
          {error}{" "}
          <button type="button" onClick={dismissError} className="font-medium underline">
            Dismiss
          </button>
        </Alert>
      )}

      {openTasks.length === 0 ? (
        <AllClear hasCompleted={doneTasks.length > 0} scope={scope} />
      ) : (
        <DndContext
          id="task-board"
          sensors={sensors}
          collisionDetection={collide}
          modifiers={[vertical]}
          accessibility={{ announcements }}
          onDragStart={({ active }) => setDragId(String(active.id))}
          onDragEnd={onDragEnd}
          onDragCancel={endDrag}
        >
          <SortableContext
            items={openTasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-7">
              <Section
                id="overdue"
                title="Overdue"
                tone="text-warning"
                tasks={sections.overdue}
                ctx={ctx}
              />
              <Section id="today" title="Today" tasks={sections.today} ctx={ctx} hideDueWhenToday />
              <Section id="upcoming" title="Upcoming" tasks={sections.upcoming} ctx={ctx} />
              <Section id="someday" title="No date" tasks={sections.someday} ctx={ctx} />
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Completed
        tasks={doneTasks}
        ctx={ctx}
        open={showCompleted}
        onToggle={() => setCompletedToggle(!showCompleted)}
      />

      {visible.length > 0 && <KeyboardHints />}

      <AnimatePresence>
        {selected && (
          <TaskDetail
            key="task-detail"
            task={selected}
            subtasks={subtasksOf.get(selected.id) ?? []}
            today={today}
            projects={projects}
            actions={actions}
            onClose={nav.close}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({
  id,
  title,
  tasks,
  ctx,
  tone,
  hideDueWhenToday,
}: {
  id: SectionId;
  title: string;
  tasks: TaskItem[];
  ctx: RowContext;
  tone?: string;
  hideDueWhenToday?: boolean;
}) {
  const zone = tasks.length === 0 && ctx.dragging && canLandIn(id, ctx.dragging);
  if (tasks.length === 0 && !zone) return null;
  return (
    <section>
      <SectionHeading tone={tone} count={tasks.length}>
        {title}
      </SectionHeading>
      {zone ? (
        <DropZone id={id} />
      ) : (
        <TaskList tasks={tasks} ctx={ctx} hideDueWhenToday={hideDueWhenToday} sortable />
      )}
    </section>
  );
}

function DropZone({ id }: { id: SectionId }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${ZONE}${id}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-11 animate-rise items-center rounded-lg px-3 text-[13px] transition-colors duration-200",
        isOver ? "bg-accent-soft text-accent-ink" : "bg-surface-sunken text-ink-faint",
      )}
    >
      {zoneCopy[id]}
    </div>
  );
}

function SectionHeading({
  children,
  count,
  tone,
}: {
  children: ReactNode;
  count: number;
  tone?: string;
}) {
  return (
    <h2 className="mb-1 flex items-baseline gap-2 px-3 font-heading text-[15px] font-semibold tracking-[-0.01em]">
      <span className={tone ?? "text-ink"}>{children}</span>
      <span className="text-[12px] font-medium text-ink-faint tabular-nums">{count}</span>
    </h2>
  );
}

function TaskList({
  tasks,
  ctx,
  hideDueWhenToday,
  sortable = false,
}: {
  tasks: TaskItem[];
  ctx: RowContext;
  hideDueWhenToday?: boolean;
  /** Rows can be dragged to reorder (open tasks only). */
  sortable?: boolean;
}) {
  return (
    <ul className="relative flex flex-col">
      <AnimatePresence mode="popLayout" initial={false}>
        {tasks.map((task) => {
          const subtasks = ctx.subtasksOf.get(task.id) ?? [];
          const props: TaskRowProps = {
            task,
            today: ctx.today,
            actions: ctx.actions,
            projects: ctx.projects,
            showProject: ctx.showProject,
            hideDueWhenToday,
            progress: {
              done: subtasks.filter((s) => s.status === "done").length,
              total: subtasks.length,
            },
            selected: ctx.selectedId === task.id,
            focused: ctx.cursorId === task.id,
            onOpen: ctx.onOpen,
          };
          return sortable ? (
            <SortableTaskRow key={task.id} {...props} dragActive={ctx.dragActive} />
          ) : (
            <TaskRow key={task.id} {...props} />
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

function SortableTaskRow({ dragActive, ...props }: TaskRowProps & { dragActive: boolean }) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({
    id: props.task.id,
  });
  return (
    <TaskRow
      {...props}
      drag={{
        setNodeRef,
        listeners,
        style: { transform: CSS.Translate.toString(transform), transition },
        dragging: isDragging,
        active: dragActive,
      }}
    />
  );
}

function Completed({
  tasks,
  ctx,
  open,
  onToggle,
}: {
  tasks: TaskItem[];
  ctx: RowContext;
  open: boolean;
  onToggle: () => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <section>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex items-center gap-1.5 rounded-md px-3 py-1 text-[13px] font-medium text-ink-subtle transition-colors hover:text-ink"
      >
        <ChevronRight
          className={cn(
            "size-4 transition-transform duration-300 ease-spring",
            open && "rotate-90",
          )}
        />
        Completed
        <span className="text-ink-faint tabular-nums">{tasks.length}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring.gentle}
            className="overflow-hidden"
          >
            <div className="pt-1">
              <TaskList tasks={tasks} ctx={ctx} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

const noop = () => () => {};
/** "⌥" on Apple keyboards, "Alt" elsewhere (the server can't know, so it renders "Alt"). */
const useAltLabel = () =>
  useSyncExternalStore(
    noop,
    () => (isMac() ? "⌥" : "Alt"),
    () => "Alt",
  );

/** Pointer devices only; touch has no keyboard to hint at. */
function KeyboardHints() {
  const alt = useAltLabel();
  const hints: [keys: string[], label: string][] = [
    [["J", "K"], "move"],
    [["X"], "complete"],
    [["E"], "rename"],
    [["↵"], "open"],
    [[alt, "↑", "↓"], "reorder"],
    [["1", "2", "3"], "priority"],
    [["⌫"], "delete"],
  ];
  return (
    <p
      data-kbd-hints
      className="hidden flex-wrap items-center gap-x-4 gap-y-1.5 px-3 text-[12px] text-ink-faint md:flex [@media(hover:none)]:hidden"
    >
      {hints.map(([keys, label]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="inline-flex gap-0.5">
            {keys.map((k) => (
              <Kbd key={k}>{k}</Kbd>
            ))}
          </span>
          {label}
        </span>
      ))}
    </p>
  );
}

const emptyCopy: Record<TaskScope["kind"], { fresh: [string, string]; done: [string, string] }> = {
  all: {
    fresh: [
      "A clean slate.",
      "Press C and type naturally: “Call the bank tomorrow p1”. Dates and priorities are picked up for you.",
    ],
    done: ["All clear.", "Everything’s done. Enjoy it — or press C to capture what’s next."],
  },
  inbox: {
    fresh: ["Inbox zero.", "Tasks without a project land here. Capture freely, sort later."],
    done: ["Inbox zero.", "Everything here is sorted or done."],
  },
  project: {
    fresh: ["Nothing here yet.", "Add the first step — new tasks on this page join this project."],
    done: ["Project clear.", "Every task in this project is done."],
  },
};

function AllClear({ hasCompleted, scope }: { hasCompleted: boolean; scope: TaskScope }) {
  const [title, body] = emptyCopy[scope.kind][hasCompleted ? "done" : "fresh"];
  return (
    <div className="paper-grain flex animate-rise flex-col items-center rounded-2xl bg-surface-raised px-6 py-14 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-room-tasks-soft text-room-tasks">
        <Sparkles className="size-6" strokeWidth={1.75} />
      </span>
      <h2 className="font-heading text-[22px] font-semibold tracking-[-0.02em] text-ink">
        {title}
      </h2>
      <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}

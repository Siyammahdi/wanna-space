"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  getFirstCollision,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  verticalListSortingStrategy,
  type SortingStrategy,
} from "@dnd-kit/sortable";
import { Inbox } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { recordUndo } from "@/components/shell/undo";
import { Alert } from "@/components/ui/alert";
import {
  compareTasks,
  lastKey,
  placeAt,
  TaskDetail,
  useTasks,
  type Placement,
  type ProjectItem,
  type TaskItem,
} from "@/features/tasks";
import { cn } from "@/lib/cn";
import { addDays, type IsoDate } from "@/lib/dates";

import { dayName, dayNumber, longDay, weekDays, weekLabel } from "../week";
import { LaneAdd } from "./lane-add";
import { PlannerCard, SortableCard, type CardProps, type Step } from "./planner-card";

type Props = {
  tasks: TaskItem[];
  today: IsoDate;
  weekStart: IsoDate;
  projects: ProjectItem[];
  /** Week navigation links (server-rendered), placed in the toolbar. */
  nav: ReactNode;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** A day of the week (its ISO date), the overdue pile, or the undated pile. */
type LaneId = IsoDate | "overdue" | "someday";
type Lanes = Record<LaneId, string[]>;

/** Long enough for the dropped card to settle before lanes follow the data again. */
const DROP_SETTLE_MS = 400;

/** Overdue cards can be dragged out, but don't make room for each other. */
const still: SortingStrategy = () => null;

const laneDate = (lane: LaneId): IsoDate | null => (lane === "someday" ? null : lane);

/** A keyboard move re-mounts the card in its new lane; put focus back once it has painted. */
function focusCardSoon(id: string) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-card="${id}"] [data-title]`)?.focus(),
    ),
  );
}

function swallowNextClick() {
  const stop = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
  };
  window.addEventListener("click", stop, { capture: true, once: true });
  window.setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
}

export function WeekBoard({ tasks: serverTasks, today, weekStart, projects, nav }: Props) {
  const { tasks, error, dismissError, ...actions } = useTasks(serverTasks, today);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragLanes, setDragLanes] = useState<Lanes | null>(null);
  const [trayOpen, setTrayOpen] = useState(true);
  const settleTimer = useRef<number | undefined>(undefined);
  const scroller = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const days = weekDays(weekStart);
  const topLevel = tasks.filter((t) => !t.parentId);
  const byId = new Map(topLevel.map((t) => [t.id, t]));
  const subtasksOf = new Map<string, TaskItem[]>();
  for (const t of tasks) {
    if (t.parentId) subtasksOf.set(t.parentId, [...(subtasksOf.get(t.parentId) ?? []), t]);
  }

  // Past days show what got done; whatever is still open from them waits in Overdue.
  const lanes: Lanes = { overdue: [], someday: [] };
  for (const day of days) lanes[day] = [];
  for (const t of topLevel.filter((t) => t.status === "open").sort(compareTasks)) {
    const lane = !t.dueDate ? "someday" : t.dueDate < today ? "overdue" : t.dueDate;
    lanes[lane]?.push(t.id);
  }
  const doneOn = new Map<IsoDate, TaskItem[]>();
  for (const t of topLevel) {
    if (t.status !== "done" || !t.dueDate) continue;
    doneOn.set(t.dueDate, [...(doneOn.get(t.dueDate) ?? []), t]);
  }
  const shown = dragLanes ?? lanes;
  const laneIds = new Set(Object.keys(shown));
  const laneOf = (id: string, from: Lanes = shown) =>
    laneIds.has(id) ? id : Object.keys(from).find((lane) => from[lane]!.includes(id));
  const accepts = (lane: LaneId, task: TaskItem) =>
    lane === "someday" ? !task.repeat : lane !== "overdue" && lane >= today;

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  // Open with today's column in view when the week is wider than the screen.
  useLayoutEffect(() => {
    const box = scroller.current;
    const column = box?.querySelector<HTMLElement>("[data-today]");
    if (!box || !column || box.scrollWidth <= box.clientWidth) return;
    box.scrollLeft =
      column.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft;
  }, [weekStart]);

  function place(task: TaskItem, { dueDate, sortKey }: Placement) {
    actions.update({ id: task.id, sortKey, ...(dueDate !== task.dueDate && { dueDate }) });
  }

  /** Overdue tasks onto today, as one undoable step. */
  function moveOverdue() {
    const moved = lanes.overdue.map((id) => ({ id, dueDate: byId.get(id)!.dueDate }));
    if (moved.length === 0) return;
    const apply = (to: (prev: IsoDate | null) => IsoDate | null) => {
      for (const t of moved) {
        actions.update({ id: t.id, dueDate: to(t.dueDate) }, { record: false });
      }
    };
    apply(() => today);
    recordUndo(
      {
        label: plural(moved.length, "overdue task"),
        undo: () => apply((prev) => prev),
        redo: () => apply(() => today),
      },
      `Moved ${plural(moved.length, "task")} to today`,
    );
  }

  function commit(task: TaskItem, lane: LaneId, ids: string[]) {
    const rows = ids.filter((id) => id !== task.id).map((id) => byId.get(id)!);
    const placement = placeAt(task, rows, ids.indexOf(task.id), laneDate(lane));
    if (placement) place(task, placement);
  }

  function step(task: TaskItem, direction: Step) {
    const lane = laneOf(task.id, lanes);
    if (!lane) return;
    focusCardSoon(task.id);

    if (direction === "up" || direction === "down") {
      if (!accepts(lane, task)) return;
      const delta = direction === "up" ? -1 : 1;
      const ids = lanes[lane]!;
      const rows = ids.filter((id) => id !== task.id).map((id) => byId.get(id)!);
      for (let i = ids.indexOf(task.id) + delta; i >= 0 && i <= rows.length; i += delta) {
        const placement = placeAt(task, rows, i, laneDate(lane));
        if (placement) return place(task, placement);
      }
      return;
    }

    // A day later or earlier, never into the past; overdue and undated tasks start today.
    const scheduled = task.dueDate && task.dueDate >= today ? task.dueDate : null;
    const target =
      direction === "right"
        ? scheduled
          ? addDays(scheduled, 1)
          : today
        : scheduled && scheduled > today
          ? addDays(scheduled, -1)
          : null;
    if (!target) return;
    const ids = lanes[target];
    const placement = ids
      ? placeAt(
          task,
          ids.map((id) => byId.get(id)!),
          ids.length,
          target,
        )
      : { dueDate: target, sortKey: lastKey(topLevel) };
    if (placement) place(task, placement);
  }

  /** Inside a lane, the nearest card wins; otherwise whatever the pointer is over. */
  const collide: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    const overId = getFirstCollision(hits.length > 0 ? hits : rectIntersection(args), "id");
    if (overId == null) return [];
    const items = laneIds.has(String(overId)) ? shown[String(overId)] : undefined;
    if (items && items.length > 0) {
      const nearest = closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter((c) => items.includes(String(c.id))),
      });
      if (nearest.length > 0) return nearest;
    }
    return [{ id: overId }];
  };

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    setDragLanes((prev) => {
      if (!prev) return prev;
      const from = laneOf(activeId, prev);
      const to = laneOf(overId, prev);
      const task = byId.get(activeId);
      if (!from || !to || from === to || !task || !accepts(to, task)) return prev;
      const target = prev[to]!;
      const overIndex = target.indexOf(overId);
      const translated = active.rect.current.translated;
      const below = translated && translated.top > over.rect.top + over.rect.height / 2;
      const index = overIndex === -1 ? target.length : overIndex + (below ? 1 : 0);
      return {
        ...prev,
        [from]: prev[from]!.filter((id) => id !== activeId),
        [to]: [...target.slice(0, index), activeId, ...target.slice(index)],
      };
    });
  }

  function finishDrag(final: Lanes | null) {
    setDragId(null);
    swallowNextClick();
    // Hold the dropped arrangement until the optimistic update has painted.
    setDragLanes(final);
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => setDragLanes(null), DROP_SETTLE_MS);
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const id = String(active.id);
    const task = byId.get(id);
    const current = dragLanes;
    const lane = current && laneOf(id, current);
    if (!task || !over || !current || !lane || !accepts(lane, task)) return finishDrag(null);

    let ids = current[lane]!;
    const overId = String(over.id);
    if (overId !== id && ids.includes(overId)) {
      ids = arrayMove(ids, ids.indexOf(id), ids.indexOf(overId));
    }
    finishDrag({ ...current, [lane]: ids });
    commit(task, lane, ids);
  }

  const laneName = (lane: string) =>
    lane === "someday" ? "No date" : lane === "overdue" ? "Overdue" : longDay(lane);
  const nameOf = (id: UniqueIdentifier) => {
    const key = String(id);
    if (laneIds.has(key)) return laneName(key);
    const title = byId.get(key)?.title;
    return title ? `“${title}”` : "the task";
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
    onDragOver: ({ active, over }) => {
      const lane = over && laneOf(String(active.id));
      return lane ? `${nameOf(active.id)} is in ${laneName(lane)}.` : undefined;
    },
    onDragEnd: ({ active }) => `Dropped ${nameOf(active.id)}.`,
    onDragCancel: ({ active }) => `Put ${nameOf(active.id)} back.`,
  };

  const cardProps = (task: TaskItem): CardProps => {
    const subtasks = subtasksOf.get(task.id) ?? [];
    return {
      task,
      today,
      projects,
      actions,
      progress: {
        done: subtasks.filter((s) => s.status === "done").length,
        total: subtasks.length,
      },
      onOpen: setOpenId,
      onStep: step,
    };
  };
  const cards = (lane: LaneId) =>
    shown[lane]!.flatMap((id) => {
      const task = byId.get(id);
      const inTray = lane === "overdue" || lane === "someday";
      return task
        ? [
            <SortableCard
              key={id}
              {...cardProps(task)}
              showDate={lane === "overdue"}
              tray={inTray}
            />,
          ]
        : [];
    });

  const dragging = dragId ? byId.get(dragId) : undefined;
  const selected = openId ? byId.get(openId) : undefined;
  const unscheduled = shown.overdue!.length + shown.someday!.length;
  const planned = days.filter((d) => d >= today).reduce((n, d) => n + lanes[d]!.length, 0);
  const doneThisWeek = days.reduce((n, d) => n + (doneOn.get(d)?.length ?? 0), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 className="font-heading text-[19px] font-semibold tracking-[-0.015em] text-ink">
            {weekLabel(weekStart)}
          </h2>
          <p className="text-[12.5px] text-ink-subtle tabular-nums">
            {planned} planned
            {doneThisWeek > 0 && <> · {doneThisWeek} done</>}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-expanded={trayOpen}
            aria-controls="planner-tray"
            onClick={() => setTrayOpen((o) => !o)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors 2xl:hidden",
              trayOpen
                ? "bg-surface-hover text-ink"
                : "text-ink-muted hover:bg-surface-hover hover:text-ink",
            )}
          >
            <Inbox className="size-[15px]" />
            Unscheduled
            <span className="text-[12px] text-ink-faint tabular-nums">{unscheduled}</span>
          </button>
          {nav}
        </div>
      </div>
      {error && (
        <Alert tone="danger">
          {error}{" "}
          <button type="button" onClick={dismissError} className="font-medium underline">
            Dismiss
          </button>
        </Alert>
      )}

      <DndContext
        id="week-board"
        sensors={sensors}
        collisionDetection={collide}
        accessibility={{ announcements }}
        onDragStart={({ active }) => {
          window.clearTimeout(settleTimer.current);
          setDragId(String(active.id));
          setDragLanes(lanes);
        }}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => finishDrag(null)}
      >
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-start 2xl:gap-4">
          {/* One tray, two shapes: a strip above the week, a rail beside it from 2xl. */}
          <aside
            id="planner-tray"
            aria-label="Unscheduled"
            className={cn(
              "-mx-5 [scrollbar-width:thin] [scrollbar-color:var(--color-surface-hover)_transparent] overflow-x-auto px-5 pb-1 md:mx-0 md:px-0 2xl:sticky 2xl:top-6 2xl:w-64 2xl:shrink-0 2xl:overflow-visible 2xl:pb-0",
              !trayOpen && "max-2xl:hidden",
            )}
          >
            <h2 className="hidden px-1.5 pb-2 font-heading text-[15px] font-semibold tracking-[-0.01em] text-ink 2xl:flex 2xl:items-baseline 2xl:gap-1.5">
              Unscheduled
              <span className="font-sans text-[12px] font-medium text-ink-faint tabular-nums">
                {unscheduled}
              </span>
            </h2>
            <div className="flex w-max items-start gap-2 2xl:w-auto 2xl:flex-col 2xl:items-stretch">
              {shown.overdue!.length > 0 && (
                <Pile
                  title="Overdue"
                  tone="text-warning"
                  count={shown.overdue!.length}
                  action={
                    <button
                      type="button"
                      onClick={moveOverdue}
                      className="rounded-md px-1.5 py-0.5 text-[12px] font-medium text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink"
                    >
                      Move to today
                    </button>
                  }
                >
                  <SortableContext items={shown.overdue!} strategy={still}>
                    <div className="flex gap-1.5 2xl:flex-col">{cards("overdue")}</div>
                  </SortableContext>
                </Pile>
              )}
              <Pile title="No date" count={shown.someday!.length} droppable="someday">
                <div className="flex items-start gap-1.5 2xl:flex-col 2xl:items-stretch">
                  <SortableContext items={shown.someday!} strategy={rectSortingStrategy}>
                    <div className="flex gap-1.5 2xl:flex-col">{cards("someday")}</div>
                  </SortableContext>
                  <div className="w-48 shrink-0 2xl:w-auto">
                    <LaneAdd
                      date={null}
                      label="New task without a date"
                      today={today}
                      projects={projects}
                      onAdd={actions.add}
                    />
                  </div>
                </div>
              </Pile>
            </div>
          </aside>

          <div
            ref={scroller}
            className="[scrollbar-width:thin] [scrollbar-color:var(--color-surface-hover)_transparent] sm:-mx-5 sm:overflow-x-auto sm:px-5 sm:pb-1 md:mx-0 md:px-0 2xl:min-w-0 2xl:flex-1"
          >
            {/* Phones read the week as an agenda; wider screens get seven columns. */}
            <div className="grid gap-2 sm:auto-cols-[minmax(7.75rem,1fr)] sm:grid-flow-col">
              {days.map((day) => (
                <DayColumn
                  key={day}
                  date={day}
                  today={today}
                  open={lanes[day]!.length}
                  done={doneOn.get(day)?.length ?? 0}
                >
                  <SortableContext items={shown[day]!} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-1.5">{cards(day)}</div>
                  </SortableContext>
                  {(doneOn.get(day) ?? []).length > 0 && (
                    <div className="mt-1.5 flex flex-col gap-0.5">
                      {doneOn.get(day)!.map((t) => (
                        <PlannerCard key={t.id} {...cardProps(t)} />
                      ))}
                    </div>
                  )}
                  {day >= today && (
                    <div className="mt-auto pt-1.5">
                      <LaneAdd
                        date={day}
                        label={`New task for ${longDay(day)}`}
                        today={today}
                        projects={projects}
                        onAdd={actions.add}
                      />
                    </div>
                  )}
                </DayColumn>
              ))}
            </div>
          </div>
        </div>

        <DragOverlay>{dragging && <PlannerCard {...cardProps(dragging)} overlay />}</DragOverlay>
      </DndContext>

      <AnimatePresence>
        {selected && (
          <TaskDetail
            key="task-detail"
            task={selected}
            subtasks={subtasksOf.get(selected.id) ?? []}
            today={today}
            projects={projects}
            actions={actions}
            onClose={() => setOpenId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Pile({
  title,
  tone,
  count,
  droppable,
  action,
  children,
}: {
  title: string;
  tone?: string;
  count: number;
  droppable?: LaneId;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: droppable ?? `pile:${title}`, disabled: !droppable });
  return (
    <section ref={setNodeRef} className="flex shrink-0 flex-col rounded-xl bg-surface p-1.5">
      <h3 className="flex h-7 items-center gap-1.5 px-1.5 pb-1 text-[13px] font-semibold">
        <span className={tone ?? "text-ink"}>{title}</span>
        <span className="text-[12px] font-medium text-ink-faint tabular-nums">{count}</span>
        {action && <span className="ml-auto">{action}</span>}
      </h3>
      {children}
    </section>
  );
}

function DayColumn({
  date,
  today,
  open,
  done,
  children,
}: {
  date: IsoDate;
  today: IsoDate;
  /** Open tasks on the day, and those completed. */
  open: number;
  done: number;
  children: ReactNode;
}) {
  const past = date < today;
  const isToday = date === today;
  const total = open + done;
  const { setNodeRef } = useDroppable({ id: date, disabled: past });
  return (
    <section
      ref={setNodeRef}
      aria-label={longDay(date)}
      data-today={isToday || undefined}
      className={cn(
        "flex flex-col rounded-xl p-1.5 sm:min-h-[max(18rem,calc(100dvh-28rem))] 2xl:min-h-[max(18rem,calc(100dvh-19rem))]",
        isToday ? "bg-accent-soft/50" : past ? "bg-surface/50" : "bg-surface",
        past && total === 0 && "max-sm:hidden",
      )}
    >
      <header className="flex h-9 items-center gap-1.5 px-1.5 pb-1">
        <span
          className={cn(
            "text-[11.5px] font-semibold tracking-[0.06em] uppercase",
            isToday ? "text-accent-ink" : past ? "text-ink-faint" : "text-ink-subtle",
          )}
        >
          {dayName(date)}
        </span>
        <span
          className={cn(
            "font-heading font-semibold tabular-nums",
            isToday
              ? "flex size-6 items-center justify-center rounded-full bg-accent text-[13px] text-accent-contrast"
              : cn("text-[15px]", past ? "text-ink-faint" : "text-ink"),
          )}
        >
          {dayNumber(date)}
        </span>
        {total > 0 && (
          <span
            className="ml-auto text-[11.5px] font-medium text-ink-faint tabular-nums"
            title={past ? `${done} done` : `${done} of ${total} done`}
          >
            {past ? `${done} done` : done > 0 ? `${done}/${total}` : open}
          </span>
        )}
      </header>
      {!past && total > 0 && (
        <div
          aria-hidden
          className="mx-1.5 mb-2 h-0.5 overflow-hidden rounded-full bg-surface-sunken"
        >
          <div
            className="h-full origin-left rounded-full bg-room-planner transition-transform duration-500 ease-spring"
            style={{ transform: `scaleX(${done / total})` }}
          />
        </div>
      )}
      {children}
    </section>
  );
}

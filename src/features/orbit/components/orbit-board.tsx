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
  SortableContext,
  verticalListSortingStrategy,
  type SortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { lastKey, TaskDetail, useTasks, type ProjectItem, type TaskItem } from "@/features/tasks";
import type { IsoDate } from "@/lib/dates";
import { uuidv7 } from "@/lib/id";
import { STAGE_LIMITS } from "@/lib/settings";

import { columnsOf, DONE, healthOf, keyAt, stageKeyAt, stageOf, type Columns } from "../board";
import { useStages } from "../hooks/use-stages";
import type { OrbitProject, StageItem } from "../schema";
import { BoardHeader } from "./board-header";
import { OrbitCard, SortableCard, type CardProps, type Step } from "./orbit-card";
import { AddStage, Column, ColumnAdd, PullIn, StageMenu, StageName } from "./stage-column";

type Props = {
  project: OrbitProject;
  stages: StageItem[];
  /** The project's open tasks, its recently done ones and open Inbox tasks, with subtasks. */
  tasks: TaskItem[];
  projects: ProjectItem[];
  today: IsoDate;
  /** Top-level done tasks in the project, including ones not loaded. */
  doneTotal: number;
  openTaskId: string | null;
};

const DROP_SETTLE_MS = 400;
const DONE_SHOWN = 12;
const STAGE_CAP = STAGE_LIMITS.count * 2;

/** Done is ordered by completion, so cards dropped there don't make room for each other. */
const still: SortingStrategy = () => null;

function focusCard(id: string | undefined) {
  if (!id) return;
  document.querySelector<HTMLElement>(`[data-card="${id}"] [data-title]`)?.focus();
}

function focusCardSoon(id: string) {
  requestAnimationFrame(() => requestAnimationFrame(() => focusCard(id)));
}

function swallowNextClick() {
  const stop = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
  };
  window.addEventListener("click", stop, { capture: true, once: true });
  window.setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
}

export function OrbitBoard({
  project,
  stages: serverStages,
  tasks: serverTasks,
  projects,
  today,
  doneTotal,
  openTaskId,
}: Props) {
  const { tasks, error, dismissError, ...actions } = useTasks(serverTasks, today);
  const {
    stages,
    error: stageError,
    dismissError: dismissStageError,
    ...stageActions
  } = useStages(serverStages, project.id);
  const [openId, setOpenId] = useState<string | null>(openTaskId);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragColumns, setDragColumns] = useState<Columns | null>(null);
  const [allDone, setAllDone] = useState(false);
  const settleTimer = useRef<number | undefined>(undefined);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const topLevel = tasks.filter((t) => !t.parentId);
  const mine = topLevel.filter((t) => t.projectId === project.id);
  const inbox = topLevel.filter((t) => t.projectId === null && t.status === "open");
  const byId = new Map(mine.map((t) => [t.id, t]));
  const subtasksOf = new Map<string, TaskItem[]>();
  for (const t of tasks) {
    if (t.parentId) subtasksOf.set(t.parentId, [...(subtasksOf.get(t.parentId) ?? []), t]);
  }

  const columns = columnsOf(mine, stages);
  const shown = dragColumns ?? columns;
  const order = [...stages.map((s) => s.id), DONE];
  const columnIds = new Set(order);
  const columnOf = (id: string, from: Columns = shown) =>
    columnIds.has(id) ? id : order.find((c) => from[c]?.includes(id));
  const stageName = (id: string) =>
    id === DONE ? "Done" : (stages.find((s) => s.id === id)?.name ?? "the board");

  // Totals follow optimistic changes: loaded done tasks are swapped for the live count.
  const open = mine.filter((t) => t.status === "open").length;
  const loadedDone = serverTasks.filter(
    (t) => !t.parentId && t.projectId === project.id && t.status === "done",
  ).length;
  const done = Math.max(0, doneTotal - loadedDone + columns[DONE]!.length);
  const overdue = mine.filter((t) => t.status === "open" && t.dueDate && t.dueDate < today).length;
  const health = healthOf({ ...project, open, done, overdue }, today);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  /** Puts `task` at `index` of column `to` (ids exclude it), completing or reopening as needed. */
  function placeIn(task: TaskItem, to: string, ids: string[], index: number) {
    if (to === DONE) {
      if (task.status === "open") actions.update({ id: task.id, status: "done" });
      return;
    }
    const from = task.status === "done" ? DONE : stageOf(task, stages);
    const rows = ids.map((id) => byId.get(id)!).filter((t) => t.status === "open");
    const sortKey = keyAt(task, rows, index, from === to);
    const patch = {
      ...(sortKey && { sortKey }),
      ...(task.stageId !== to && { stageId: to }),
      ...(task.status === "done" && { status: "open" as const }),
    };
    if (Object.keys(patch).length === 0) return;
    actions.update(
      { id: task.id, ...patch },
      from !== to ? { announce: `Moved to ${stageName(to)}` } : undefined,
    );
  }

  function step(task: TaskItem, direction: Step) {
    const from = columnOf(task.id, columns);
    if (!from) return;
    focusCardSoon(task.id);

    if (direction === "up" || direction === "down") {
      if (from === DONE) return;
      const ids = columns[from]!;
      const at = ids.indexOf(task.id) + (direction === "up" ? -1 : 1);
      if (at < 0 || at >= ids.length) return;
      return placeIn(
        task,
        from,
        ids.filter((id) => id !== task.id),
        at,
      );
    }

    const to = order[order.indexOf(from) + (direction === "right" ? 1 : -1)];
    if (!to) return;
    const ids = columns[to]!;
    placeIn(task, to, ids, ids.length);
  }

  /** Plain arrows walk focus: up and down a column, across to the same row of the next one. */
  function focusMove(task: TaskItem, direction: Step) {
    const from = columnOf(task.id, columns);
    if (!from) return;
    const ids = visible(from);
    const at = ids.indexOf(task.id);
    if (direction === "up") return focusCard(ids[at - 1]);
    if (direction === "down") return focusCard(ids[at + 1]);
    const delta = direction === "right" ? 1 : -1;
    for (let c = order.indexOf(from) + delta; c >= 0 && c < order.length; c += delta) {
      const target = visible(order[c]!);
      if (target.length > 0) return focusCard(target[Math.min(at, target.length - 1)]);
    }
  }

  const visible = (column: string) =>
    column === DONE && !allDone ? shown[DONE]!.slice(0, DONE_SHOWN) : shown[column]!;

  function moveStage(stage: StageItem, delta: -1 | 1) {
    const at = stages.findIndex((s) => s.id === stage.id);
    const rest = stages.filter((s) => s.id !== stage.id);
    const sortKey = stageKeyAt(rest, at + delta);
    stageActions.update({ id: stage.id, sortKey });
  }

  function addStage(name: string) {
    stageActions.add({
      id: uuidv7(),
      name: name.slice(0, STAGE_LIMITS.nameLength),
      sortKey: stageKeyAt(stages, stages.length),
      wipLimit: null,
    });
  }

  function pull(task: TaskItem, stage: StageItem) {
    actions.update(
      { id: task.id, projectId: project.id, stageId: stage.id, sortKey: lastKey(tasks) },
      { announce: `Pulled into ${stage.name}` },
    );
  }

  const collide: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    const overId = getFirstCollision(hits.length > 0 ? hits : rectIntersection(args), "id");
    if (overId == null) return [];
    const items = columnIds.has(String(overId)) ? shown[String(overId)] : undefined;
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
    setDragColumns((prev) => {
      if (!prev) return prev;
      const from = columnOf(activeId, prev);
      const to = columnOf(overId, prev);
      if (!from || !to || from === to) return prev;
      const target = prev[to]!;
      let index = 0;
      if (to !== DONE) {
        const overIndex = target.indexOf(overId);
        const translated = active.rect.current.translated;
        const below = translated && translated.top > over.rect.top + over.rect.height / 2;
        index = overIndex === -1 ? target.length : overIndex + (below ? 1 : 0);
      }
      return {
        ...prev,
        [from]: prev[from]!.filter((id) => id !== activeId),
        [to]: [...target.slice(0, index), activeId, ...target.slice(index)],
      };
    });
  }

  function finishDrag(final: Columns | null) {
    setDragId(null);
    swallowNextClick();
    setDragColumns(final);
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => setDragColumns(null), DROP_SETTLE_MS);
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const id = String(active.id);
    const task = byId.get(id);
    const current = dragColumns;
    const to = current && columnOf(id, current);
    if (!task || !over || !current || !to) return finishDrag(null);

    let ids = current[to]!;
    const overId = String(over.id);
    if (to !== DONE && overId !== id && ids.includes(overId)) {
      ids = arrayMove(ids, ids.indexOf(id), ids.indexOf(overId));
    }
    finishDrag({ ...current, [to]: ids });
    placeIn(
      task,
      to,
      ids.filter((x) => x !== id),
      ids.indexOf(id),
    );
  }

  const nameOf = (id: UniqueIdentifier) => {
    const key = String(id);
    if (columnIds.has(key)) return stageName(key);
    const title = byId.get(key)?.title;
    return title ? `“${title}”` : "the task";
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
    onDragOver: ({ active, over }) => {
      const column = over && columnOf(String(active.id));
      return column ? `${nameOf(active.id)} is in ${stageName(column)}.` : undefined;
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
      onFocusMove: focusMove,
    };
  };
  const cards = (column: string) =>
    visible(column).flatMap((id) => {
      const task = byId.get(id);
      return task ? [<SortableCard key={id} {...cardProps(task)} />] : [];
    });

  const dragging = dragId ? byId.get(dragId) : undefined;
  const selected = openId ? byId.get(openId) : undefined;
  const hiddenDone = shown[DONE]!.length - DONE_SHOWN;
  const errorText = error ?? stageError;

  return (
    <div className="flex flex-col">
      <BoardHeader
        key={project.id}
        project={project}
        open={open}
        done={done}
        health={health}
        today={today}
      />

      {errorText && (
        <Alert tone="danger" className="mb-4">
          {errorText}{" "}
          <button
            type="button"
            onClick={() => {
              dismissError();
              dismissStageError();
            }}
            className="font-medium underline"
          >
            Dismiss
          </button>
        </Alert>
      )}

      <DndContext
        id="orbit-board"
        sensors={sensors}
        collisionDetection={collide}
        accessibility={{ announcements }}
        onDragStart={({ active }) => {
          window.clearTimeout(settleTimer.current);
          setDragId(String(active.id));
          setDragColumns(columns);
        }}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => finishDrag(null)}
      >
        <div className="-mx-5 snap-x snap-mandatory scroll-px-5 overflow-x-auto px-5 pb-3 md:mx-0 md:snap-none md:px-0">
          <div className="flex items-start gap-2">
            {stages.map((stage, i) => (
              <Column
                key={stage.id}
                id={stage.id}
                label={stage.name}
                count={shown[stage.id]?.length ?? 0}
                limit={stage.wipLimit}
                header={
                  <StageName
                    stage={stage}
                    editing={renamingId === stage.id}
                    onEditingChange={(editing) => setRenamingId(editing ? stage.id : null)}
                    stageActions={stageActions}
                  />
                }
                menu={
                  <StageMenu
                    stage={stage}
                    index={i}
                    total={stages.length}
                    stageActions={stageActions}
                    onMove={moveStage}
                    onRename={() => setRenamingId(stage.id)}
                  />
                }
                footer={
                  <>
                    <ColumnAdd
                      stage={stage}
                      projectId={project.id}
                      today={today}
                      projects={projects}
                      onAdd={actions.add}
                    />
                    {inbox.length > 0 && <PullIn stage={stage} inbox={inbox} onPull={pull} />}
                  </>
                }
              >
                <SortableContext
                  items={shown[stage.id] ?? []}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-1.5">{cards(stage.id)}</div>
                </SortableContext>
              </Column>
            ))}

            <Column id={DONE} label="Done" count={done} done>
              <SortableContext items={visible(DONE)} strategy={still}>
                <div className="flex flex-col gap-0.5">{cards(DONE)}</div>
              </SortableContext>
              {shown[DONE]!.length === 0 && (
                <p className="px-2 py-3 text-[12.5px] leading-relaxed text-ink-subtle">
                  Drop a card here to finish it.
                </p>
              )}
              {hiddenDone > 0 && (
                <button
                  type="button"
                  onClick={() => setAllDone((v) => !v)}
                  className="mt-1 h-8 rounded-md px-2 text-left text-[12.5px] font-medium text-ink-subtle transition-colors hover:bg-surface-hover/60 hover:text-ink"
                >
                  {allDone ? "Show fewer" : `Show ${hiddenDone} more`}
                </button>
              )}
            </Column>

            <AddStage onAdd={addStage} disabled={stages.length >= STAGE_CAP} />
          </div>
        </div>

        <DragOverlay>{dragging && <OrbitCard {...cardProps(dragging)} overlay />}</DragOverlay>
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
            stages={stages.map((s) => ({ id: s.id, name: s.name }))}
            onClose={() => setOpenId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

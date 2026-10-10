"use client";

import { ArrowRight, ChevronRight, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { startTransition, useOptimistic, useState, type ReactNode } from "react";

import { Reveal } from "@/components/motion/reveal";
import { recordUndo } from "@/components/shell/undo";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import {
  compareTasks,
  TaskDetail,
  useTasks,
  type ProjectItem,
  type TaskActions,
  type TaskItem,
} from "@/features/tasks";
import { QuickAdd } from "@/features/tasks/components/quick-add";
import { TaskRow } from "@/features/tasks/components/task-row";
import { useTaskNavigation } from "@/features/tasks/hooks/use-task-navigation";
import { useTimer } from "@/features/time/components/timer-provider";
import type { TaskChoice, TimeEntryItem } from "@/features/time/schema";
import { isBreak, isIdle, isRunning } from "@/features/time/timer";
import { setFocusTasks } from "@/features/today/server/actions";
import { cn } from "@/lib/cn";
import type { IsoDate } from "@/lib/dates";
import { spring } from "@/lib/motion";

import { ComingUp } from "./coming-up";
import { DayProgress } from "./day-progress";
import { FocusCard } from "./focus-card";
import { Greeting } from "./greeting";
import { Intention } from "./intention";
import { isDoneToday, TodaysThree, type Pick } from "./todays-three";

type Props = {
  name: string;
  today: IsoDate;
  tasks: TaskItem[];
  projects: ProjectItem[];
  /** Open top-level tasks, for the picker's search. */
  choices: TaskChoice[];
  plan: { intention: string; focus: string[] };
  entries: TimeEntryItem[];
  /** Open tasks due tomorrow. */
  tomorrow: number;
  /** Server-rendered cards for the bottom row (projects, notes, vault): three, one per column. */
  rooms: ReactNode;
};

const plural = (n: number, one: string) => (n === 1 ? `1 ${one}` : `${n} ${one}s`);

export function TodayBoard({
  name,
  today,
  tasks: serverTasks,
  projects,
  choices,
  plan,
  entries,
  tomorrow,
  rooms,
}: Props) {
  const { tasks, error, dismissError, ...actions } = useTasks(serverTasks, today);
  const [focus, setFocusOptimistic] = useOptimistic(plan.focus);
  const [showDone, setShowDone] = useState(false);
  const { timer, send } = useTimer();

  const subtasksOf = new Map<string, TaskItem[]>();
  for (const t of tasks) {
    if (t.parentId) subtasksOf.set(t.parentId, [...(subtasksOf.get(t.parentId) ?? []), t]);
  }
  const topLevel = tasks.filter((t) => !t.parentId);
  const open = topLevel.filter((t) => t.status === "open").sort(compareTasks);
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today);
  const dueToday = open.filter((t) => t.dueDate === today);
  const done = topLevel
    .filter((t) => t.status === "done")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  const picks: Pick[] = focus.map((id) => {
    const task = topLevel.find((t) => t.id === id);
    const choice = choices.find((c) => c.id === id);
    return {
      id,
      title: task?.title ?? choice?.title ?? "Task",
      task,
      projectName: choice?.projectName ?? null,
      projectColor: choice?.projectColor ?? null,
    };
  });
  // A finished repeating pick has rolled to its next date: it still counts as done today.
  const rolled = picks.filter((p) => p.task?.status === "open" && isDoneToday(p.task, today));

  const order = [...overdue, ...dueToday, ...(showDone ? done : [])].map((t) => t.id);
  const nav = useTaskNavigation({ order, openable: topLevel.map((t) => t.id) });
  const selected = topLevel.find((t) => t.id === nav.openId);

  const focusingId = !isIdle(timer) && !isBreak(timer) ? timer.taskId : null;

  function savePicks(next: string[]) {
    startTransition(async () => {
      setFocusOptimistic(next);
      const result = await setFocusTasks({ date: today, taskIds: next }).catch(() => null);
      if (!result?.ok) {
        toast({
          id: "today-three",
          message: "Couldn’t update today’s three",
          detail: result?.error ?? "Check your connection and try again.",
        });
      }
    });
  }

  function pick(id: string) {
    if (focus.includes(id) || focus.length >= 3) return;
    savePicks([...focus, id]);
  }

  function unpick(id: string) {
    const before = focus;
    const after = focus.filter((f) => f !== id);
    const title = picks.find((p) => p.id === id)?.title ?? "task";
    savePicks(after);
    recordUndo(
      {
        label: `“${title}” in today’s three`,
        undo: () => savePicks(before),
        redo: () => savePicks(after),
      },
      "Taken out of today’s three",
    );
  }

  function focusOn(p: Pick) {
    void send({ type: "task", taskId: p.id }, { task: { id: p.id, title: p.title } });
    if (!isRunning(timer) && !isBreak(timer)) void send({ type: "start" });
  }

  function moveOverdue() {
    const moved = overdue.map((t) => ({ id: t.id, dueDate: t.dueDate }));
    const apply = (to: (prev: IsoDate | null) => IsoDate | null) => {
      for (const t of moved)
        actions.update({ id: t.id, dueDate: to(t.dueDate) }, { record: false });
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

  const left = overdue.length + dueToday.length;
  const timed = dueToday.filter((t) => t.dueTime);

  return (
    <div className="flex flex-col gap-8">
      <Reveal className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0 flex-1 basis-80">
          <Greeting name={name} />
          <Intention today={today} initial={plan.intention} />
        </div>
        <DayProgress done={done.length + rolled.length} left={left} />
      </Reveal>

      {/* Above the next section: the picker opens over it. */}
      <Reveal order={1} className="relative z-10">
        <TodaysThree
          today={today}
          picks={picks}
          suggestions={open.filter((t) => t.dueDate && t.dueDate <= today)}
          choices={choices}
          projects={projects}
          actions={actions}
          focusingId={focusingId}
          onPick={pick}
          onUnpick={unpick}
          onOpen={nav.open}
          onFocus={focusOn}
        />
      </Reveal>

      {/* One three-column grid for the whole page: every band lines up with the three slots. */}
      <div className="flex flex-col gap-4">
        <Reveal order={2} className="grid gap-4 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
            <QuickAdd
              today={today}
              projects={projects}
              onAdd={actions.add}
              defaultDueDate={today}
              placeholder="Add a task for today…"
              claimCapture
              inlineChips
            />

            {error && (
              <Alert tone="danger">
                {error}{" "}
                <button type="button" onClick={dismissError} className="font-medium underline">
                  Dismiss
                </button>
              </Alert>
            )}

            <Card className="flex flex-1 flex-col gap-5 p-2 pb-3">
              {overdue.length > 0 && (
                <section>
                  <Heading
                    count={overdue.length}
                    tone="text-warning"
                    action={
                      <button
                        type="button"
                        onClick={moveOverdue}
                        className="rounded-md px-2 py-1 text-[12.5px] font-medium text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink"
                      >
                        Move all to today
                      </button>
                    }
                  >
                    Overdue
                  </Heading>
                  <Rows
                    tasks={overdue}
                    today={today}
                    projects={projects}
                    actions={actions}
                    subtasksOf={subtasksOf}
                    nav={nav}
                  />
                </section>
              )}

              <section>
                <Heading
                  count={dueToday.length}
                  action={
                    <Link
                      href="/tasks"
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] font-medium text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink"
                    >
                      All tasks <ArrowRight className="size-3.5" />
                    </Link>
                  }
                >
                  Today
                </Heading>
                {dueToday.length > 0 ? (
                  <Rows
                    tasks={dueToday}
                    today={today}
                    projects={projects}
                    actions={actions}
                    subtasksOf={subtasksOf}
                    nav={nav}
                    hideDueWhenToday
                  />
                ) : (
                  <Empty doneCount={done.length + rolled.length} overdue={overdue.length > 0} />
                )}
              </section>

              {done.length > 0 && (
                <section>
                  <button
                    type="button"
                    aria-expanded={showDone}
                    onClick={() => setShowDone(!showDone)}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-ink-subtle transition-colors hover:text-ink"
                  >
                    <ChevronRight
                      className={cn(
                        "size-4 transition-transform duration-300 ease-spring",
                        showDone && "rotate-90",
                      )}
                    />
                    Done today
                    <span className="text-ink-faint tabular-nums">{done.length}</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {showDone && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={spring.gentle}
                        className="overflow-hidden"
                      >
                        <div className="pt-1">
                          <Rows
                            tasks={done}
                            today={today}
                            projects={projects}
                            actions={actions}
                            subtasksOf={subtasksOf}
                            nav={nav}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <FocusCard entries={entries} />
            <ComingUp
              tasks={timed}
              projects={projects}
              tomorrow={tomorrow}
              onOpen={nav.open}
              className="flex-1"
            />
          </div>
        </Reveal>

        <Reveal order={3} className="grid gap-4 md:grid-cols-3">
          {rooms}
        </Reveal>
      </div>

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

function Heading({
  children,
  count,
  tone,
  action,
}: {
  children: ReactNode;
  count: number;
  tone?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-1 flex min-h-8 items-center justify-between gap-3">
      <h2 className="flex items-baseline gap-2 px-3 text-[13px] font-semibold">
        <span className={tone ?? "text-ink"}>{children}</span>
        <span className="text-[12px] font-medium text-ink-faint tabular-nums">{count}</span>
      </h2>
      {action}
    </div>
  );
}

function Rows({
  tasks,
  today,
  projects,
  actions,
  subtasksOf,
  nav,
  hideDueWhenToday,
}: {
  tasks: TaskItem[];
  today: IsoDate;
  projects: ProjectItem[];
  actions: TaskActions;
  subtasksOf: Map<string, TaskItem[]>;
  nav: { openId: string | null; cursorId: string | null; open: (id: string) => void };
  hideDueWhenToday?: boolean;
}) {
  return (
    <ul className="relative flex flex-col">
      <AnimatePresence mode="popLayout" initial={false}>
        {tasks.map((task) => {
          const subtasks = subtasksOf.get(task.id) ?? [];
          return (
            <TaskRow
              key={task.id}
              task={task}
              today={today}
              actions={actions}
              projects={projects}
              showProject
              hideDueWhenToday={hideDueWhenToday}
              progress={{
                done: subtasks.filter((s) => s.status === "done").length,
                total: subtasks.length,
              }}
              selected={nav.openId === task.id}
              focused={nav.cursorId === task.id}
              onOpen={nav.open}
            />
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

function Empty({ doneCount, overdue }: { doneCount: number; overdue: boolean }) {
  const [title, body] =
    doneCount > 0
      ? ["All clear for today.", `${plural(doneCount, "task")} done. The rest of the day is yours.`]
      : overdue
        ? ["Nothing new due today.", "Catch up on what slipped, or pull those tasks into today."]
        : ["A clear day.", "Add what you want to get done, or pick from your lists above."];
  return (
    <div className="flex items-center gap-4 px-3 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-room-today-soft text-room-today">
        <Sun className="size-5" strokeWidth={1.75} />
      </span>
      <div>
        <p className="text-[14px] font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-[13px] text-ink-subtle">{body}</p>
      </div>
    </div>
  );
}

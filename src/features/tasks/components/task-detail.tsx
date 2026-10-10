"use client";

import {
  AlignLeft,
  CalendarDays,
  Clock,
  Columns3,
  Flag,
  ImageIcon,
  ImagePlus,
  Inbox,
  ListChecks,
  Plus,
  Repeat,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useIsPresent } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { useCapabilities } from "@/components/shell/capabilities";
import { Button } from "@/components/ui/button";
import { MenuItem, Popover } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import type { IsoDate } from "@/lib/dates";
import { uuidv7 } from "@/lib/id";
import { spring } from "@/lib/motion";
import { claimSplitView, useSplitScreen } from "@/lib/split-view";

import type { TaskActions } from "../hooks/use-tasks";
import { colorOf } from "../projects";
import { describeRepeat, firstOccurrence } from "../repeat";
import type { ProjectItem, TaskItem } from "../schema";
import { TaskCheck, TaskTitle } from "./task-check";
import { CoverImage, DropHint, useImageDrop, useImagePicker } from "./task-cover";
import { DateMenu, PriorityMenu, ProjectMenu, RepeatMenu } from "./task-menus";
import { DueLabel, PriorityLabel } from "./task-meta";

/** A column of the task's project board (Orbit passes these; other rooms don't). */
export type StageChoice = { id: string; name: string };

type Props = {
  task: TaskItem;
  subtasks: TaskItem[];
  today: IsoDate;
  projects: ProjectItem[];
  actions: TaskActions;
  onClose: () => void;
  /** The project's stages, for a Stage field (Orbit). */
  stages?: StageChoice[];
};

/** Matches the page's slide into the left half (globals.css, --split-ease / --split-duration). */
const splitMotion = { type: "tween", duration: 0.52, ease: [0.32, 0.72, 0, 1] } as const;

/**
 * One task's details. On wide screens the page slides into the left half and this takes
 * the right half, side by side, so the list stays usable; smaller screens get a sheet.
 */
export function TaskDetail({ onClose, ...props }: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const split = useSplitScreen();
  const isPresent = useIsPresent();
  const { task, actions } = props;
  const canCover = useCapabilities().uploads && !task.parentId;
  const drop = useImageDrop((file) => canCover && actions.setCover(task.id, file));

  useEffect(() => {
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      if (returnTo?.isConnected) returnTo.focus({ preventScroll: true });
    };
  }, []);

  // Release as soon as the exit starts, so the page glides back while the panel leaves.
  useEffect(() => {
    if (!isPresent) return;
    return claimSplitView();
  }, [isPresent]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {!split && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-40 bg-ink/10"
        />
      )}
      <motion.aside
        ref={panelRef}
        tabIndex={-1}
        role={split ? "region" : "dialog"}
        aria-modal={split ? undefined : true}
        aria-label="Task details"
        initial={split ? { x: "100%", opacity: 0 } : { x: "100%" }}
        animate={{ x: 0, opacity: 1 }}
        exit={
          split
            ? { x: "100%", opacity: 0, transition: { ...splitMotion, duration: 0.42 } }
            : { x: "100%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }
        }
        transition={split ? splitMotion : spring.glide}
        {...drop.handlers}
        className={cn(
          "fixed z-50 flex flex-col outline-none",
          split
            ? "inset-y-3 right-3 w-[calc(var(--split-width)-0.75rem)] rounded-2xl bg-surface"
            : "inset-y-0 right-0 w-full bg-canvas shadow-xl sm:w-[440px] sm:rounded-l-2xl",
        )}
      >
        <DetailBody key={task.id} onClose={onClose} {...props} />
        <DropHint show={drop.over && canCover}>
          {task.cover ? "Drop to replace the image" : "Drop to add an image"}
        </DropHint>
      </motion.aside>
    </>
  );
}

function DetailBody({ task, subtasks, today, projects, actions, onClose, stages }: Props) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  // Follow outside changes (undo/redo, refresh) without clobbering local typing otherwise.
  const [synced, setSynced] = useState({ title: task.title, notes: task.notes });
  if (synced.title !== task.title || synced.notes !== task.notes) {
    setSynced({ title: task.title, notes: task.notes });
    if (synced.title !== task.title) setTitle(task.title);
    if (synced.notes !== task.notes) setNotes(task.notes ?? "");
  }
  const done = task.status === "done";
  const project = projects.find((p) => p.id === task.projectId);
  const picker = useImagePicker((file) => actions.setCover(task.id, file));
  const canCover = useCapabilities().uploads && !task.parentId;

  function saveTitle(value = title) {
    const next = value.trim();
    if (!next) return setTitle(task.title);
    if (next !== task.title) actions.update({ id: task.id, title: next });
  }

  function saveNotes(value = notes) {
    const next = value.trim() || null;
    if (next !== (task.notes?.trim() || null)) actions.update({ id: task.id, notes: next });
  }

  // Closing the panel unmounts the fields without a blur; save what's pending.
  const flush = useRef(() => {});
  useEffect(() => {
    flush.current = () => {
      saveTitle();
      saveNotes();
    };
  });
  useEffect(() => {
    const pending = flush;
    return () => pending.current();
  }, []);

  return (
    <>
      <header className="mx-auto flex h-14 w-full max-w-[46rem] shrink-0 items-center gap-1 px-3">
        <ProjectMenu
          value={task.projectId}
          projects={projects}
          onChange={(projectId) =>
            actions.update(
              { id: task.id, projectId },
              {
                announce: `Moved to ${projects.find((p) => p.id === projectId)?.name ?? "Inbox"}`,
              },
            )
          }
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              {project ? (
                <span className={cn("size-2.5 rounded-full", colorOf(project.color).dot)} />
              ) : (
                <Inbox className="size-[15px]" />
              )}
              <span className="max-w-48 truncate">{project?.name ?? "Inbox"}</span>
            </button>
          )}
        />
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete task"
          title="Delete task"
          onClick={() => {
            onClose();
            actions.remove(task.id);
          }}
        >
          <Trash2 />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close"
          title="Close (Esc)"
          onClick={onClose}
        >
          <X />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-16">
        <div className="mx-auto max-w-[43rem]">
          {picker.input}
          {canCover && task.cover && (
            <div className="group/cover relative mt-1 mb-4">
              <CoverImage cover={task.cover} className="aspect-[2/1] max-h-64 w-full rounded-xl" />
              {!task.cover.pending && (
                <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 transition-opacity group-focus-within/cover:opacity-100 group-hover/cover:opacity-100 [@media(hover:none)]:opacity-100">
                  <CoverButton onClick={picker.open}>
                    <ImagePlus />
                    Change
                  </CoverButton>
                  <CoverButton onClick={() => actions.setCover(task.id, null)}>
                    <X />
                    Remove
                  </CoverButton>
                </div>
              )}
            </div>
          )}
          <div className="flex items-start gap-3 pt-2">
            <TaskCheck
              checked={done}
              onCheckedChange={(checked) =>
                actions.update({ id: task.id, status: checked ? "done" : "open" })
              }
              label={done ? `Reopen “${task.title}”` : `Complete “${task.title}”`}
              className="mt-[7px]"
            />
            <textarea
              value={title}
              rows={1}
              maxLength={500}
              aria-label="Task title"
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              onBlur={() => saveTitle()}
              className={cn(
                "-mx-1.5 field-sizing-content min-w-0 flex-1 resize-none rounded-md bg-transparent px-1.5 py-0.5 font-heading text-[21px] leading-snug font-semibold tracking-[-0.02em] transition-colors outline-none hover:bg-surface-hover/50 focus:bg-surface-sunken",
                done ? "text-ink-subtle line-through decoration-ink-faint" : "text-ink",
              )}
            />
          </div>

          <dl className="mt-5 flex flex-col gap-0.5">
            <Property icon={<CalendarDays />} label="Due">
              <DateMenu
                value={task.dueDate}
                today={today}
                onChange={(dueDate) => actions.update({ id: task.id, dueDate })}
                trigger={({ toggle }) => (
                  <PropertyButton onClick={toggle}>
                    {task.dueDate ? (
                      <DueLabel date={task.dueDate} today={today} className="text-[13px]" />
                    ) : (
                      <span className="text-ink-faint">Add a date</span>
                    )}
                  </PropertyButton>
                )}
              />
              {task.dueDate && (
                <TimeField
                  key={task.dueTime ?? "none"}
                  value={task.dueTime}
                  onChange={(dueTime) => actions.update({ id: task.id, dueTime })}
                />
              )}
            </Property>
            <Property icon={<Repeat />} label="Repeat">
              <RepeatMenu
                value={task.repeat}
                anchor={task.dueDate ?? today}
                onChange={(repeat) =>
                  actions.update({
                    id: task.id,
                    repeat,
                    // A series needs a start; undated tasks begin at the first fitting day.
                    ...(repeat && !task.dueDate && { dueDate: firstOccurrence(repeat, today) }),
                  })
                }
                trigger={({ toggle }) => (
                  <PropertyButton onClick={toggle}>
                    {task.repeat ? (
                      <span className="text-ink">{describeRepeat(task.repeat)}</span>
                    ) : (
                      <span className="text-ink-faint">Doesn’t repeat</span>
                    )}
                  </PropertyButton>
                )}
              />
            </Property>
            <Property icon={<Flag />} label="Priority">
              <PriorityMenu
                value={task.priority}
                onChange={(priority) => actions.update({ id: task.id, priority })}
                trigger={({ toggle }) => (
                  <PropertyButton onClick={toggle}>
                    {task.priority ? (
                      <PriorityLabel priority={task.priority} />
                    ) : (
                      <span className="text-ink-faint">None</span>
                    )}
                  </PropertyButton>
                )}
              />
            </Property>
            {stages && stages.length > 0 && task.projectId && !task.parentId && (
              <Property icon={<Columns3 />} label="Stage">
                <StageField task={task} stages={stages} actions={actions} />
              </Property>
            )}
            {canCover && !task.cover && (
              <Property icon={<ImageIcon />} label="Image">
                <PropertyButton onClick={picker.open} title="Or paste or drop an image here">
                  <span className="text-ink-faint">Add an image</span>
                </PropertyButton>
              </Property>
            )}
          </dl>

          <Section icon={<AlignLeft />} title="Notes">
            <textarea
              value={notes}
              maxLength={20_000}
              aria-label="Notes"
              placeholder="Add details, links, or thoughts…"
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => saveNotes()}
              className="-mx-3 field-sizing-content min-h-20 w-[calc(100%+24px)] resize-none rounded-lg bg-transparent px-3 py-2.5 text-[14px] leading-relaxed text-ink transition-colors outline-none placeholder:text-ink-faint hover:bg-surface-hover/40 focus:bg-surface-sunken"
            />
          </Section>

          <Subtasks parent={task} subtasks={subtasks} actions={actions} />
        </div>
      </div>
    </>
  );
}

function StageField({
  task,
  stages,
  actions,
}: {
  task: TaskItem;
  stages: StageChoice[];
  actions: TaskActions;
}) {
  const [open, setOpen] = useState(false);
  const done = task.status === "done";
  const current = done ? null : (stages.find((s) => s.id === task.stageId) ?? stages[0]);

  function choose(stageId: string | "done") {
    setOpen(false);
    if (stageId === "done") {
      if (!done) actions.update({ id: task.id, status: "done" });
      return;
    }
    if (!done && stageId === current?.id) return;
    const name = stages.find((s) => s.id === stageId)?.name ?? "";
    actions.update(
      { id: task.id, stageId, ...(done && { status: "open" as const }) },
      { announce: `Moved to ${name}` },
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label="Stage"
      align="start"
      trigger={
        <PropertyButton onClick={() => setOpen((o) => !o)}>
          <span className="text-ink">{current?.name ?? "Done"}</span>
        </PropertyButton>
      }
    >
      {stages.map((s) => (
        <MenuItem key={s.id} active={s.id === current?.id} onSelect={() => choose(s.id)}>
          {s.name}
        </MenuItem>
      ))}
      <MenuItem active={done} onSelect={() => choose("done")}>
        Done
      </MenuItem>
    </Popover>
  );
}

function Property({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-10 grid-cols-[104px_1fr] items-center">
      <dt className="flex items-center gap-2 text-[13px] text-ink-subtle [&_svg]:size-[15px]">
        {icon}
        {label}
      </dt>
      <dd className="flex flex-wrap items-center gap-1">{children}</dd>
    </div>
  );
}

function PropertyButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="-ml-2 flex h-8 items-center rounded-md px-2 text-[13px] transition-colors hover:bg-surface-hover"
    >
      {children}
    </button>
  );
}

function CoverButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-7 items-center gap-1.5 rounded-md bg-surface/85 px-2.5 text-[12.5px] font-medium text-ink backdrop-blur-sm transition-[background-color,scale] hover:bg-surface active:scale-95 [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}

function TimeField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (time: string | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const commit = () => {
    setOpen(false);
    const next = /^\d{2}:\d{2}$/.test(draft) ? draft : null;
    if (next !== value) onChange(next);
  };

  if (!value && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink-muted"
      >
        <Clock className="size-3.5 shrink-0" />
        Add time
      </button>
    );
  }

  return (
    <label className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] text-ink-muted transition-colors focus-within:bg-surface-sunken hover:bg-surface-hover">
      <Clock className="size-3.5 shrink-0" />
      <input
        type="time"
        aria-label="Due time"
        autoFocus={open}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            e.stopPropagation();
            setDraft(value ?? "");
            setOpen(false);
          }
        }}
        className={cn(
          "w-[4.75rem] bg-transparent [color-scheme:light] outline-none dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden",
          draft ? "text-ink" : "text-ink-faint",
        )}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear time"
          onClick={() => {
            setDraft("");
            onChange(null);
          }}
          className="rounded-sm text-ink-faint hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      )}
    </label>
  );
}

function Section({
  icon,
  title,
  aside,
  children,
}: {
  icon: ReactNode;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-7">
      <h3 className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold tracking-wide text-ink-subtle uppercase [&_svg]:size-3.5">
        {icon}
        {title}
        {aside && <span className="ml-auto normal-case">{aside}</span>}
      </h3>
      {children}
    </section>
  );
}

function Subtasks({
  parent,
  subtasks,
  actions,
}: {
  parent: TaskItem;
  subtasks: TaskItem[];
  actions: TaskActions;
}) {
  const [draft, setDraft] = useState("");
  const done = subtasks.filter((s) => s.status === "done").length;
  const total = subtasks.length;

  function add() {
    const title = draft.trim();
    if (!title) return;
    actions.add({
      id: uuidv7(),
      title,
      dueDate: null,
      dueTime: null,
      priority: 0,
      projectId: null,
      parentId: parent.id,
    });
    setDraft("");
  }

  return (
    <Section
      icon={<ListChecks />}
      title="Subtasks"
      aside={
        total > 0 && (
          <span className="text-[12px] font-medium text-ink-faint tabular-nums">
            {done}/{total}
          </span>
        )
      }
    >
      {total > 0 && (
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-surface-sunken">
          <motion.div
            className="h-full rounded-full bg-room-tasks"
            initial={false}
            animate={{ width: `${(done / total) * 100}%` }}
            transition={spring.gentle}
          />
        </div>
      )}

      <ul className="flex flex-col">
        <AnimatePresence initial={false}>
          {subtasks.map((s) => (
            <SubtaskRow key={s.id} subtask={s} actions={actions} />
          ))}
        </AnimatePresence>
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="-mx-2 mt-1 flex h-9 items-center gap-3 rounded-md px-2 focus-within:bg-surface-sunken"
      >
        <Plus className="size-[18px] shrink-0 text-ink-faint" />
        <input
          value={draft}
          maxLength={500}
          aria-label="New subtask"
          placeholder="Add a subtask"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && draft) {
              e.stopPropagation();
              setDraft("");
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint"
        />
      </form>
    </Section>
  );
}

function SubtaskRow({ subtask, actions }: { subtask: TaskItem; actions: TaskActions }) {
  const [editing, setEditing] = useState(false);
  const done = subtask.status === "done";

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 8, transition: { duration: 0.15 } }}
      transition={spring.gentle}
      className="group -mx-2 flex min-h-9 items-center gap-3 rounded-md px-2 hover:bg-surface-hover/50"
    >
      <TaskCheck
        checked={done}
        onCheckedChange={(checked) =>
          actions.update({ id: subtask.id, status: checked ? "done" : "open" })
        }
        label={`Complete “${subtask.title}”`}
      />
      {editing ? (
        <input
          autoFocus
          defaultValue={subtask.title}
          maxLength={500}
          aria-label="Subtask title"
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              e.stopPropagation();
              e.currentTarget.value = subtask.title;
              e.currentTarget.blur();
            }
          }}
          onBlur={(e) => {
            setEditing(false);
            const title = e.currentTarget.value.trim();
            if (title && title !== subtask.title) actions.update({ id: subtask.id, title });
          }}
          className="h-7 min-w-0 flex-1 rounded-sm bg-surface-sunken px-1.5 text-[14px] text-ink outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="min-w-0 flex-1 cursor-text py-1.5 text-left text-[14px] leading-snug break-words"
        >
          <TaskTitle checked={done}>{subtask.title}</TaskTitle>
        </button>
      )}
      <button
        type="button"
        aria-label={`Delete “${subtask.title}”`}
        onClick={() => actions.remove(subtask.id)}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-faint opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:text-ink [@media(hover:none)]:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </motion.li>
  );
}

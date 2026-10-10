"use client";

import {
  CalendarClock,
  Check,
  ChevronLeft,
  List,
  MoreHorizontal,
  Orbit,
  Palette,
  Smile,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useOptimistic, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { MenuGap, MenuItem, Popover } from "@/components/ui/popover";
import {
  colorOf,
  DateMenu,
  deleteProject,
  KeywordChip,
  PROJECT_COLORS,
  PROJECT_STATUSES,
  projectColors,
  updateProject,
  type UpdateProjectInput,
} from "@/features/tasks";
import { cn } from "@/lib/cn";
import type { IsoDate } from "@/lib/dates";

import { describeTarget, HEALTH_META, type Health, STATUS_META } from "../board";
import type { OrbitProject } from "../schema";
import { OrbitRing } from "./orbit-ring";

type Patch = Omit<UpdateProjectInput, "id">;

export function BoardHeader({
  project: serverProject,
  open,
  done,
  health,
  today,
}: {
  project: OrbitProject;
  open: number;
  done: number;
  health: Health | null;
  today: IsoDate;
}) {
  const router = useRouter();
  const [project, apply] = useOptimistic(
    serverProject,
    (p: OrbitProject, change: Patch) =>
      ({
        ...p,
        ...change,
      }) as OrbitProject,
  );
  const [editing, setEditing] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<"menu" | "color" | "confirm">("menu");
  const [brief, setBrief] = useState(serverProject.description);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(serverProject.description);
  if (synced !== serverProject.description) {
    setSynced(serverProject.description);
    setBrief(serverProject.description);
  }

  function save(change: Patch) {
    setError(null);
    startTransition(async () => {
      apply(change);
      const result = await updateProject({ id: project.id, ...change });
      if (!result.ok) setError(result.error);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteProject(project.id);
      if (!result.ok) return setError(result.error);
      router.replace("/orbit");
      router.refresh();
    });
  }

  const color = colorOf(project.color);
  const status = STATUS_META[project.status];
  const total = open + done;
  const progress = total ? done / total : 0;
  const percent = Math.round(progress * 100);
  const late = project.targetDate && project.targetDate < today && open > 0;

  return (
    <header className="@container mb-6">
      <Link
        href="/orbit"
        className="mb-3 -ml-1.5 inline-flex h-7 items-center gap-1 rounded-md pr-2 pl-1 text-[13px] font-medium text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink"
      >
        <ChevronLeft className="size-4" />
        <Orbit className="size-3.5 text-room-orbit" />
        Orbit
      </Link>

      <div className="flex flex-col gap-5 @3xl:flex-row @3xl:items-start @3xl:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          <Popover
            open={iconOpen}
            onOpenChange={setIconOpen}
            label="Project icon"
            align="start"
            className="w-auto p-0"
            trigger={
              <button
                type="button"
                aria-label={project.icon ? "Change icon" : "Add icon"}
                aria-expanded={iconOpen}
                onClick={() => setIconOpen((o) => !o)}
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-xl text-[26px] leading-none transition-transform active:scale-90",
                  color.soft,
                )}
              >
                {project.icon ?? <Smile className={cn("size-5", color.text)} />}
              </button>
            }
          >
            <EmojiPicker
              value={project.icon}
              onPick={(icon) => {
                setIconOpen(false);
                if (icon !== project.icon) save({ icon });
              }}
            />
          </Popover>

          <div className="min-w-0 flex-1">
            {editing ? (
              <input
                autoFocus
                defaultValue={project.name}
                maxLength={80}
                aria-label="Project name"
                onFocus={(e) => e.currentTarget.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") {
                    e.currentTarget.value = project.name;
                    e.currentTarget.blur();
                  }
                }}
                onBlur={(e) => {
                  setEditing(false);
                  const name = e.currentTarget.value.trim();
                  if (name && name !== project.name) save({ name });
                }}
                className="-ml-1.5 w-full rounded-md bg-surface-sunken px-1.5 font-heading text-[28px] leading-tight font-semibold tracking-[-0.025em] text-ink outline-none focus:ring-2 focus:ring-accent/40"
              />
            ) : (
              <h1>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  title="Rename project"
                  className="max-w-full cursor-text truncate text-left font-heading text-[28px] leading-tight font-semibold tracking-[-0.025em] text-ink"
                >
                  {project.name}
                </button>
              </h1>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Popover
                open={statusOpen}
                onOpenChange={setStatusOpen}
                label="Project status"
                align="start"
                trigger={
                  <button
                    type="button"
                    aria-label={`Status: ${status.label}`}
                    aria-expanded={statusOpen}
                    onClick={() => setStatusOpen((o) => !o)}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium transition-transform active:scale-95",
                      status.soft,
                      status.text,
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", status.dot)} />
                    {status.label}
                  </button>
                }
              >
                {PROJECT_STATUSES.map((s) => (
                  <MenuItem
                    key={s}
                    active={s === project.status}
                    icon={<span className={cn("size-2 rounded-full", STATUS_META[s].dot)} />}
                    hint={s === project.status ? <Check className="size-3.5" /> : undefined}
                    onSelect={() => {
                      setStatusOpen(false);
                      if (s !== project.status) save({ status: s });
                    }}
                  >
                    {STATUS_META[s].label}
                  </MenuItem>
                ))}
              </Popover>

              <DateMenu
                value={project.targetDate}
                today={today}
                onChange={(targetDate) => {
                  if (targetDate !== project.targetDate) save({ targetDate });
                }}
                trigger={({ open: dateOpen, toggle }) => (
                  <button
                    type="button"
                    aria-expanded={dateOpen}
                    onClick={toggle}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium transition-colors",
                      project.targetDate
                        ? late
                          ? "bg-warning-soft text-warning"
                          : "bg-surface-sunken text-ink-muted hover:text-ink"
                        : "text-ink-subtle hover:bg-surface-hover hover:text-ink",
                    )}
                  >
                    <CalendarClock className="size-3.5" />
                    {project.targetDate ? describeTarget(project.targetDate, today) : "Target date"}
                  </button>
                )}
              />

              <KeywordChip keyword={project.keyword} onChange={(keyword) => save({ keyword })} />

              {health && (
                <span className={cn("px-1.5 text-[12.5px] font-medium", HEALTH_META[health].text)}>
                  {HEALTH_META[health].label}
                </span>
              )}

              <span className="flex-1" />
            </div>

            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              onBlur={() => {
                const next = brief.trim();
                if (next !== project.description) save({ description: next });
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setBrief(project.description);
                  e.currentTarget.blur();
                }
              }}
              rows={1}
              maxLength={2000}
              aria-label="Project brief"
              placeholder="Write a brief: what does landing this look like?"
              className="mt-3 -ml-1.5 field-sizing-content max-h-40 min-h-9 w-full max-w-2xl resize-none rounded-md bg-transparent px-1.5 py-1.5 text-[14px] leading-relaxed text-ink-muted outline-none placeholder:text-ink-faint hover:bg-surface-hover/50 focus:bg-surface-sunken focus:text-ink"
            />
            {error && <p className="mt-1 text-[12.5px] text-danger">{error}</p>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4 @3xl:pt-6">
          <OrbitRing
            progress={progress}
            size={72}
            stroke={4.5}
            tone={color.text}
            label={`${percent}% complete`}
          >
            <span className="font-heading text-[16px] font-semibold text-ink tabular-nums">
              {percent}%
            </span>
          </OrbitRing>
          <div className="text-[13px] leading-snug">
            <p className="font-medium text-ink tabular-nums">
              {done} of {total} done
            </p>
            <p className="text-ink-subtle tabular-nums">{open} still open</p>
          </div>

          <div className="flex items-center gap-1">
            <Link
              href={`/tasks/projects/${project.id}`}
              aria-label="Open as list"
              title="Open as list"
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            >
              <List />
            </Link>
            <Popover
              open={menuOpen}
              onOpenChange={(o) => {
                setMenuOpen(o);
                if (!o) setMenuView("menu");
              }}
              label="Project actions"
              trigger={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Project actions"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((o) => !o)}
                >
                  <MoreHorizontal />
                </Button>
              }
            >
              {menuView === "confirm" ? (
                <div className="flex w-64 flex-col gap-2 p-1.5">
                  <p className="text-[13px] leading-relaxed text-ink-muted">
                    Delete <span className="font-medium text-ink">{project.name}</span>? Its stages
                    go with it and its tasks move to your Inbox.
                  </p>
                  <div className="flex justify-end gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => setMenuView("menu")}>
                      Cancel
                    </Button>
                    <Button variant="danger" size="sm" onClick={remove}>
                      Delete
                    </Button>
                  </div>
                </div>
              ) : menuView === "color" ? (
                <div className="grid grid-cols-7 gap-1 p-0.5">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={projectColors[c].label}
                      aria-pressed={c === project.color}
                      onClick={() => {
                        setMenuOpen(false);
                        setMenuView("menu");
                        if (c !== project.color) save({ color: c });
                      }}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-md transition-transform hover:scale-110",
                        projectColors[c].soft,
                      )}
                    >
                      {c === project.color ? (
                        <Check className={cn("size-4", projectColors[c].text)} strokeWidth={2.5} />
                      ) : (
                        <span className={cn("size-2.5 rounded-full", projectColors[c].dot)} />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <MenuItem icon={<Palette />} onSelect={() => setMenuView("color")}>
                    Color
                  </MenuItem>
                  <MenuGap />
                  <MenuItem icon={<Trash2 />} tone="danger" onSelect={() => setMenuView("confirm")}>
                    Delete project
                  </MenuItem>
                </>
              )}
            </Popover>
          </div>
        </div>
      </div>
    </header>
  );
}

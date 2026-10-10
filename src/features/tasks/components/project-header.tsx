"use client";

import { Check, MoreHorizontal, Orbit, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useOptimistic, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { MenuItem, Popover } from "@/components/ui/popover";
import { cn } from "@/lib/cn";

import { colorOf, PROJECT_COLORS, projectColors, type ProjectColor } from "../projects";
import type { ProjectItem } from "../schema";
import { deleteProject, updateProject } from "../server/project-actions";
import { KeywordChip } from "./keyword-chip";

export function ProjectHeader({ project: serverProject }: { project: ProjectItem }) {
  const router = useRouter();
  const [project, patch] = useOptimistic(
    serverProject,
    (p: ProjectItem, change: Partial<ProjectItem>) => ({ ...p, ...change }),
  );
  const [editing, setEditing] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save(change: { name?: string; keyword?: string; color?: ProjectColor }) {
    setError(null);
    startTransition(async () => {
      patch(change);
      const result = await updateProject({ id: project.id, ...change });
      if (!result.ok) setError(result.error);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteProject(project.id);
      if (!result.ok) return setError(result.error);
      router.replace("/tasks");
      router.refresh();
    });
  }

  const color = colorOf(project.color);

  return (
    <div className="mb-5">
      <div className="flex items-center gap-3">
        <Popover
          open={colorOpen}
          onOpenChange={setColorOpen}
          label="Project color"
          align="start"
          className="min-w-0"
          trigger={
            <button
              type="button"
              aria-label="Change color"
              onClick={() => setColorOpen((o) => !o)}
              className={cn(
                "flex size-9 items-center justify-center rounded-lg transition-transform active:scale-90",
                color.soft,
              )}
            >
              <span className={cn("size-3 rounded-full", color.dot)} />
            </button>
          }
        >
          <div className="grid grid-cols-7 gap-1 p-0.5">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={projectColors[c].label}
                onClick={() => {
                  setColorOpen(false);
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
        </Popover>

        <div className="flex min-w-0 flex-1 items-center gap-1.5">
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
              className="w-full rounded-md bg-surface-sunken px-2 font-heading text-[22px] font-semibold tracking-[-0.02em] text-ink outline-none focus:ring-2 focus:ring-accent/40"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="Rename project"
              className="max-w-full cursor-text truncate px-2 text-left font-heading text-[22px] font-semibold tracking-[-0.02em] text-ink"
            >
              {project.name}
            </button>
          )}
          {!editing && (
            <KeywordChip
              keyword={project.keyword}
              onChange={(keyword) => save({ keyword })}
              className="shrink-0"
            />
          )}
        </div>

        <Link
          href={`/orbit/${project.id}`}
          title="Open the project board in Orbit"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-2.5")}
        >
          <Orbit />
          Board
        </Link>

        <Popover
          open={menuOpen}
          onOpenChange={(o) => {
            setMenuOpen(o);
            if (!o) setConfirming(false);
          }}
          label="Project actions"
          trigger={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Project actions"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MoreHorizontal />
            </Button>
          }
        >
          {confirming ? (
            <div className="flex w-60 flex-col gap-2 p-1.5">
              <p className="text-[13px] leading-relaxed text-ink-muted">
                Delete <span className="font-medium text-ink">{project.name}</span>? Its tasks move
                to your Inbox.
              </p>
              <div className="flex justify-end gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" onClick={remove}>
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <MenuItem icon={<Trash2 />} onSelect={() => setConfirming(true)}>
              Delete project
            </MenuItem>
          )}
        </Popover>
      </div>
      {error && <p className="mt-2 px-1 text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}

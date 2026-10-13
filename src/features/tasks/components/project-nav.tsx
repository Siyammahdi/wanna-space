"use client";

import { Inbox, Layers, Plus } from "lucide-react";
import { motion } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useOptimistic, useState, type ReactNode } from "react";

import { SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { uuidv7 } from "@/lib/id";
import { spring } from "@/lib/motion";

import { suggestKeyword } from "../keywords";
import { colorOf, nextProjectColor } from "../projects";
import type { ProjectItem } from "../schema";
import { createProject } from "../server/project-actions";
import { useShellProjects } from "./shell-projects";

type Props = { projects: ProjectItem[]; inboxCount: number };

export function ProjectNav({ projects: serverProjects, inboxCount }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [projects, addOptimistic] = useOptimistic(
    serverProjects,
    (list: ProjectItem[], p: ProjectItem) => [...list, p],
  );
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function create(name: string) {
    setCreating(false);
    if (!name) return;
    const project: ProjectItem = {
      id: uuidv7(),
      name,
      keyword: suggestKeyword(
        name,
        projects.map((p) => p.keyword),
      ),
      color: nextProjectColor(projects.length),
      openCount: 0,
    };
    setError(null);
    startTransition(async () => {
      addOptimistic(project);
      const { id, keyword, color } = project;
      const result = await createProject({ id, name, keyword, color });
      if (result.ok) router.push(`/tasks/projects/${project.id}`);
      else setError(result.error);
    });
  }

  return (
    <div className="mb-6">
      <nav
        aria-label="Task lists"
        className="-mx-1 flex [scrollbar-width:none] items-center gap-1 overflow-x-auto px-1 pb-1"
      >
        <NavPill href="/tasks" active={pathname === "/tasks"} icon={<Layers />}>
          All
        </NavPill>
        <NavPill
          href="/tasks/inbox"
          active={pathname === "/tasks/inbox"}
          icon={<Inbox />}
          count={inboxCount}
        >
          Inbox
        </NavPill>

        {projects.length > 0 && <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-line" />}

        {projects.map((p) => (
          <NavPill
            key={p.id}
            href={`/tasks/projects/${p.id}` as Route}
            active={pathname === `/tasks/projects/${p.id}`}
            icon={<span className={cn("size-2 rounded-full", colorOf(p.color).dot)} />}
            count={p.openCount}
          >
            {p.name}
          </NavPill>
        ))}

        {creating ? (
          <NewProjectInput onDone={create} />
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <Plus className="size-3.5" />
            New project
          </button>
        )}
      </nav>
      {error && <p className="mt-2 px-1 text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}

/**
 * The nav while the lists load. The shell already knows the projects (with their counts),
 * so only the Inbox count waits.
 */
export function ProjectNavSkeleton() {
  const pathname = usePathname();
  const projects = useShellProjects();
  return (
    <div className="mb-6">
      <nav
        aria-label="Task lists"
        className="-mx-1 flex [scrollbar-width:none] items-center gap-1 overflow-x-auto px-1 pb-1"
      >
        <NavPill href="/tasks" active={pathname === "/tasks"} icon={<Layers />}>
          All
        </NavPill>
        <NavPill
          href="/tasks/inbox"
          active={pathname === "/tasks/inbox"}
          icon={<Inbox />}
          count={<SkeletonText className="relative h-2.5 w-2" />}
        >
          Inbox
        </NavPill>
        {projects.length > 0 && <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-line" />}
        {projects.map((p) => (
          <NavPill
            key={p.id}
            href={`/tasks/projects/${p.id}` as Route}
            active={pathname === `/tasks/projects/${p.id}`}
            icon={<span className={cn("size-2 rounded-full", colorOf(p.color).dot)} />}
            count={p.openCount}
          >
            {p.name}
          </NavPill>
        ))}
        <span
          aria-hidden
          className="flex h-8 shrink-0 items-center gap-1.5 px-3 text-[13px] font-medium text-ink-subtle"
        >
          <Plus className="size-3.5" />
          New project
        </span>
      </nav>
    </div>
  );
}

function NavPill({
  href,
  active,
  icon,
  count,
  children,
}: {
  href: Route;
  active: boolean;
  icon: ReactNode;
  /** A number, or a placeholder while it loads. */
  count?: number | ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-[13px] font-medium transition-colors [&_svg]:size-3.5",
        active ? "text-ink" : "text-ink-muted hover:text-ink",
      )}
    >
      {active && (
        <motion.span
          layoutId="tasks-nav-active"
          transition={spring.glide}
          className="absolute inset-0 rounded-full bg-surface-raised"
        />
      )}
      <span className="relative flex items-center">{icon}</span>
      <span className="relative max-w-40 truncate">{children}</span>
      {typeof count === "number"
        ? count > 0 && (
            <span className="relative text-[11.5px] text-ink-faint tabular-nums">{count}</span>
          )
        : count}
    </Link>
  );
}

function NewProjectInput({ onDone }: { onDone: (name: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <input
      autoFocus
      value={value}
      maxLength={80}
      aria-label="New project name"
      placeholder="Project name"
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onDone(value.trim());
        if (e.key === "Escape") onDone("");
      }}
      onBlur={() => onDone(value.trim())}
      className="h-8 w-44 shrink-0 rounded-full bg-surface-raised px-3 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-accent/40"
    />
  );
}

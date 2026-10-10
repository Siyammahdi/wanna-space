"use client";

import { Inbox } from "lucide-react";
import { startTransition, useOptimistic } from "react";

import { useSettings } from "@/components/shell/settings-context";
import { toast } from "@/components/ui/toast";
import { colorOf, KeywordChip, updateProject, type ProjectItem } from "@/features/tasks";
import { cn } from "@/lib/cn";
import { setDevicePref } from "@/lib/settings";
import { useDevicePref } from "@/lib/use-device-pref";

import { useSaveSettings } from "../hooks/use-save-settings";
import { Group, PaneHeader, RadioCards, RadioDot, SwitchRow } from "./parts";

export function TasksPane({
  projects,
}: {
  projects: Pick<ProjectItem, "id" | "name" | "keyword" | "color">[];
}) {
  const { captureProjectId } = useSettings();
  const save = useSaveSettings();
  const showCompleted = useDevicePref("showCompleted");
  const current = projects.some((p) => p.id === captureProjectId) ? captureProjectId : null;
  const options = ["inbox", ...projects.map((p) => p.id)];

  return (
    <>
      <PaneHeader title="Tasks" description="How tasks are captured and how lists open." />

      <Group label="Quick capture files new tasks in" note="Synced to your account">
        <p className="-mt-1 mb-1 text-[12.5px] leading-snug text-ink-subtle">
          Typing a project’s keyword or #name while capturing still wins.
        </p>
        <RadioCards
          label="Quick capture files new tasks in"
          value={current ?? "inbox"}
          options={options}
          onChange={(id) => {
            const next = id === "inbox" ? null : id;
            if (next !== current) save({ captureProjectId: next });
          }}
          className="grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto p-0.5 sm:grid-cols-2"
          optionClassName={(checked) =>
            cn(
              "flex h-11 items-center gap-2.5 rounded-lg bg-surface px-3 text-left transition-[background-color,box-shadow,transform] duration-200 active:scale-[0.985]",
              checked ? "ring-2 ring-accent" : "hover:bg-surface-hover",
            )
          }
        >
          {(id, checked) => {
            const project = projects.find((p) => p.id === id);
            return (
              <>
                {project ? (
                  <span
                    className={cn("size-2.5 shrink-0 rounded-full", colorOf(project.color).dot)}
                  />
                ) : (
                  <Inbox className="size-4 shrink-0 text-ink-subtle" />
                )}
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">
                  {project?.name ?? "Inbox"}
                </span>
                <RadioDot checked={checked} />
              </>
            );
          }}
        </RadioCards>
      </Group>

      {projects.length > 0 && <KeywordList projects={projects} />}

      <Group label="Lists" note="This device">
        <SwitchRow
          title="Show completed tasks"
          description="Lists open with their Completed section expanded."
          checked={showCompleted}
          onCheckedChange={(on) => setDevicePref("showCompleted", on)}
        />
      </Group>
    </>
  );
}

type KeywordProject = Pick<ProjectItem, "id" | "name" | "keyword" | "color">;

function KeywordList({ projects: serverProjects }: { projects: KeywordProject[] }) {
  const [projects, rename] = useOptimistic(
    serverProjects,
    (list: KeywordProject[], change: { id: string; keyword: string }) =>
      list.map((p) => (p.id === change.id ? { ...p, keyword: change.keyword } : p)),
  );

  function save(id: string, keyword: string) {
    startTransition(async () => {
      rename({ id, keyword });
      const result = await updateProject({ id, keyword });
      if (!result.ok) toast({ id: "keyword", message: result.error });
    });
  }

  return (
    <Group label="Project keywords" note="Synced to your account">
      <p className="-mt-1 mb-1 text-[12.5px] leading-snug text-ink-subtle">
        Type a keyword anywhere in a new task (“Fix the header {projects[0]!.keyword}”) to file it
        in that project. Dates and priorities can’t be keywords.
      </p>
      <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto p-0.5">
        {projects.map((p) => (
          <li
            key={p.id}
            className="flex min-h-12 items-center gap-3 rounded-lg bg-surface py-2 pr-2.5 pl-3.5"
          >
            <span className={cn("size-2.5 shrink-0 rounded-full", colorOf(p.color).dot)} />
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">
              {p.name}
            </span>
            <KeywordChip keyword={p.keyword} onChange={(keyword) => save(p.id, keyword)} />
          </li>
        ))}
      </ul>
    </Group>
  );
}

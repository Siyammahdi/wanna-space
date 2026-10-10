"use client";

import { ArrowDown, ArrowUp, Plus, RotateCcw, X } from "lucide-react";
import { useState } from "react";

import { useSettings } from "@/components/shell/settings-context";
import { Button } from "@/components/ui/button";
import { DEFAULT_STAGES, STAGE_LIMITS } from "@/lib/settings";

import { useSaveSettings } from "../hooks/use-save-settings";
import { Group, PaneHeader } from "./parts";

type Draft = { key: number; name: string };

let nextKey = 0;
const toDraft = (names: string[]): Draft[] => names.map((name) => ({ key: nextKey++, name }));

export function OrbitPane() {
  const { defaultStages } = useSettings();
  const save = useSaveSettings();
  const [draft, setDraft] = useState(() => toDraft(defaultStages));
  const [focusKey, setFocusKey] = useState<number | null>(null);
  const [synced, setSynced] = useState(defaultStages);
  if (synced.join("\u0000") !== defaultStages.join("\u0000")) {
    setSynced(defaultStages);
    setDraft(toDraft(defaultStages));
  }

  const names = draft.map((d) => d.name.trim());
  const valid = names.length > 0 && names.every(Boolean);
  const changed = names.join("\u0000") !== defaultStages.join("\u0000");
  const isDefault = defaultStages.join("\u0000") === DEFAULT_STAGES.join("\u0000");

  function edit(key: number, name: string) {
    setDraft((d) => d.map((s) => (s.key === key ? { ...s, name } : s)));
  }

  function move(index: number, delta: -1 | 1) {
    setDraft((d) => {
      const next = [...d];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item!);
      return next;
    });
  }

  return (
    <>
      <PaneHeader
        title="Orbit"
        description="How new project boards start out. Every board can still reshape its own stages."
      />

      <Group label="Stages for new projects" note="Synced to your account">
        <div className="rounded-xl bg-surface p-1.5">
          <ol className="flex flex-col gap-0.5">
            {draft.map((stage, i) => (
              <li
                key={stage.key}
                className="group flex h-11 items-center gap-2 rounded-lg pr-1 pl-2.5 transition-colors focus-within:bg-surface-hover/50 hover:bg-surface-hover/50"
              >
                <span className="w-4 text-[12px] font-medium text-ink-faint tabular-nums">
                  {i + 1}
                </span>
                <input
                  autoFocus={stage.key === focusKey}
                  value={stage.name}
                  maxLength={STAGE_LIMITS.nameLength}
                  aria-label={`Stage ${i + 1} name`}
                  placeholder="Stage name"
                  onChange={(e) => edit(stage.key, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && valid && changed) save({ defaultStages: names });
                  }}
                  className="h-8 min-w-0 flex-1 rounded-md bg-transparent px-2 text-[13.5px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-faint focus:bg-surface-raised focus:ring-2 focus:ring-accent/40"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${stage.name || "stage"} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${stage.name || "stage"} down`}
                  disabled={i === draft.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${stage.name || "stage"}`}
                  disabled={draft.length === 1}
                  onClick={() => setDraft((d) => d.filter((s) => s.key !== stage.key))}
                >
                  <X />
                </Button>
              </li>
            ))}
            <li className="flex h-11 items-center gap-2 rounded-lg px-2.5 text-[13.5px] text-ink-subtle">
              <span className="w-4 text-[12px] font-medium text-ink-faint tabular-nums">
                {draft.length + 1}
              </span>
              <span className="px-2 font-medium text-success">Done</span>
              <span className="text-[12px] text-ink-faint">
                Built in: dropping a card here completes it
              </span>
            </li>
          </ol>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={draft.length >= STAGE_LIMITS.count}
              onClick={() => {
                const [added] = toDraft([""]);
                setFocusKey(added!.key);
                setDraft((d) => [...d, added!]);
              }}
            >
              <Plus />
              Add stage
            </Button>
            {!isDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => save({ defaultStages: DEFAULT_STAGES })}
              >
                <RotateCcw />
                Reset
              </Button>
            )}
          </div>
          {changed && (
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => setDraft(toDraft(defaultStages))}>
                Cancel
              </Button>
              <Button
                variant="accent"
                size="sm"
                disabled={!valid}
                onClick={() => save({ defaultStages: names })}
              >
                Save stages
              </Button>
            </div>
          )}
        </div>
      </Group>
    </>
  );
}

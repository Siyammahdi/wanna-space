"use client";

import { startTransition, useOptimistic, useState } from "react";

import { recordUndo } from "@/components/shell/undo";

import { bySortKey } from "../board";
import type { ActionResult, DeletedStage, StageItem, UpdateStageInput } from "../schema";
import { createStage, deleteStage, restoreStage, updateStage } from "../server/actions";

type Op =
  | { type: "add"; stage: StageItem }
  | { type: "update"; id: string; patch: Partial<StageItem> }
  | { type: "remove"; id: string };

function reducer(stages: StageItem[], op: Op): StageItem[] {
  switch (op.type) {
    case "add":
      return stages.some((s) => s.id === op.stage.id)
        ? stages
        : [...stages, op.stage].sort(bySortKey);
    case "update":
      return stages.map((s) => (s.id === op.id ? { ...s, ...op.patch } : s)).sort(bySortKey);
    case "remove":
      return stages.filter((s) => s.id !== op.id);
  }
}

type Deletion = Promise<ActionResult<DeletedStage>>;

const quote = (name: string) => `“${name}”`;

/** Optimistic, undoable board stages; the Server Action's refresh() brings back the truth. */
export function useStages(serverStages: StageItem[], projectId: string) {
  const [stages, apply] = useOptimistic(serverStages, reducer);
  const [error, setError] = useState<string | null>(null);

  function run(op: Op, action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      apply(op);
      try {
        const result = await action();
        if (!result.ok) setError(result.error);
      } catch {
        setError("Couldn’t save that change. Check your connection and try again.");
      }
    });
  }

  function erase(id: string): Deletion {
    const deletion = deleteStage(id);
    run({ type: "remove", id }, () => deletion);
    return deletion;
  }

  function restore(stage: StageItem, deletion: Deletion) {
    run({ type: "add", stage }, async () => {
      const result = await deletion;
      return result.ok ? restoreStage(result.data) : result;
    });
  }

  function add(stage: StageItem) {
    run({ type: "add", stage }, () => createStage({ ...stage, projectId }));
    let deletion: Deletion | null = null;
    recordUndo({
      label: `Added stage ${quote(stage.name)}`,
      undo: () => (deletion = erase(stage.id)),
      redo: () => deletion && restore(stage, deletion),
    });
  }

  function update(input: UpdateStageInput, record = true) {
    const { id, ...patch } = input;
    const prev = stages.find((s) => s.id === id);
    if (!prev) return;
    run({ type: "update", id, patch }, () => updateStage(input));
    if (!record) return;
    const inverse: UpdateStageInput = { id };
    for (const key of Object.keys(patch) as (keyof typeof patch)[]) {
      (inverse as Record<string, unknown>)[key] = prev[key];
    }
    const label =
      patch.name !== undefined
        ? `Renamed ${quote(prev.name)}`
        : patch.wipLimit !== undefined
          ? `Limit of ${quote(prev.name)}`
          : `Moved ${quote(prev.name)}`;
    recordUndo({
      label,
      undo: () => update(inverse, false),
      redo: () => update(input, false),
    });
  }

  function remove(id: string) {
    const prev = stages.find((s) => s.id === id);
    if (!prev || stages.length <= 1) return;
    let deletion = erase(id);
    recordUndo(
      {
        label: `Stage ${quote(prev.name)}`,
        undo: () => restore(prev, deletion),
        redo: () => (deletion = erase(id)),
      },
      "Stage deleted",
    );
  }

  return { stages, error, dismissError: () => setError(null), add, update, remove };
}

export type StageActions = Pick<ReturnType<typeof useStages>, "add" | "update" | "remove">;

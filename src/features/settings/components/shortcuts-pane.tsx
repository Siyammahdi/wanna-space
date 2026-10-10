"use client";

import { Search } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Kbd } from "@/components/ui/kbd";
import { isMac } from "@/lib/keyboard";

import { Group, PaneHeader } from "./parts";

type Shortcut = [label: string, keys: string[]];

const noSubscribe = () => () => {};

function shortcutGroups(mac: boolean): [group: string, shortcuts: Shortcut[]][] {
  const mod = mac ? "⌘" : "Ctrl";
  const alt = mac ? "⌥" : "Alt";
  const shift = mac ? "⇧" : "Shift";
  return [
    [
      "Everywhere",
      [
        ["Search and jump", [mod, "K"]],
        ["Quick capture", ["C"]],
        ["Open settings", [mod, ","]],
        ["Undo", [mod, "Z"]],
        ["Redo", mac ? [shift, mod, "Z"] : [mod, shift, "Z"]],
        ["Close a panel or menu", ["Esc"]],
      ],
    ],
    [
      "Task lists",
      [
        ["Move between tasks", ["J", "K"]],
        ["Open task", ["↵"]],
        ["Complete", ["X"]],
        ["Rename", ["E"]],
        ["Set priority (0 clears it)", ["1", "2", "3"]],
        ["Move up or down", [alt, "↑", "↓"]],
        ["Delete", ["⌫"]],
        ["Task menu", [shift, "F10"]],
        ["Leave the list", ["Esc"]],
      ],
    ],
    [
      "Orbit boards",
      [
        ["Move between cards and stages", ["↑", "↓", "←", "→"]],
        ["Move to the next or previous stage", [alt, "←", "→"]],
        ["Move up or down the stage", [alt, "↑", "↓"]],
        ["Open card", ["↵"]],
        ["Complete (moves to Done)", ["X"]],
        ["Set priority", ["1", "2", "3"]],
        ["Delete", ["⌫"]],
        ["Card menu", [shift, "F10"]],
      ],
    ],
    [
      "Planner",
      [
        ["Move to the day before or after", [alt, "←", "→"]],
        ["Move up or down the day", [alt, "↑", "↓"]],
        ["Complete", ["X"]],
        ["Set priority", ["1", "2", "3"]],
        ["Delete", ["⌫"]],
      ],
    ],
    ["Time", [["Start or pause the timer", ["Space"]]]],
  ];
}

export function ShortcutsPane() {
  const mac = useSyncExternalStore(noSubscribe, isMac, () => true);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const groups = shortcutGroups(mac)
    .map(([group, shortcuts]) => {
      const matches = group.toLowerCase().includes(q)
        ? shortcuts
        : shortcuts.filter(([label]) => label.toLowerCase().includes(q));
      return [group, matches] as const;
    })
    .filter(([, shortcuts]) => shortcuts.length > 0);

  return (
    <>
      <PaneHeader
        title="Shortcuts"
        description="Everything you can do with a click, you can also do from the keyboard."
      />
      <label className="mb-6 flex h-10 items-center gap-2.5 rounded-xl bg-surface px-3.5 focus-within:ring-2 focus-within:ring-accent/40">
        <Search className="size-4 shrink-0 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a shortcut"
          aria-label="Find a shortcut"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-faint"
        />
      </label>
      {groups.length === 0 && (
        <p className="text-[13px] text-ink-subtle">No shortcut matches “{query.trim()}”.</p>
      )}
      {groups.map(([group, shortcuts]) => (
        <Group key={group} label={group}>
          <dl className="rounded-xl bg-surface p-1.5">
            {shortcuts.map(([label, keys]) => (
              <div
                key={label}
                className="flex h-10 items-center justify-between gap-4 rounded-lg px-2.5 transition-colors hover:bg-surface-hover/60"
              >
                <dt className="text-[13px] text-ink-muted">{label}</dt>
                <dd className="flex shrink-0 gap-1">
                  {keys.map((k) => (
                    <Kbd key={k} className="h-6 min-w-6 rounded-sm px-1.5 text-[11.5px]">
                      {k}
                    </Kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </Group>
      ))}
    </>
  );
}

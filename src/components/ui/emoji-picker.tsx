"use client";

import { Search, Shuffle, Trash2 } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/cn";

/** A curated set (emoji + search words); enough to mark pages without a 3,000-item grid. */
const GROUPS: { label: string; items: [string, string][] }[] = [
  {
    label: "Work",
    items: [
      ["📝", "memo note write"],
      ["📄", "page document"],
      ["📚", "books library study"],
      ["📖", "book read"],
      ["🗂️", "folders index"],
      ["📁", "folder"],
      ["📌", "pin"],
      ["📎", "clip attachment"],
      ["✏️", "pencil edit"],
      ["🖋️", "pen sign"],
      ["📊", "chart bar stats"],
      ["📈", "chart growth up"],
      ["🗓️", "calendar plan"],
      ["⏰", "alarm clock time"],
      ["✅", "check done"],
      ["📋", "clipboard list"],
      ["💼", "briefcase work"],
      ["🧾", "receipt invoice"],
      ["🔖", "bookmark"],
      ["🗃️", "card box archive"],
      ["🔑", "key password"],
      ["🔒", "lock private"],
      ["💡", "idea bulb light"],
      ["🧠", "brain think"],
    ],
  },
  {
    label: "Make",
    items: [
      ["🚀", "rocket launch ship"],
      ["🎯", "target goal"],
      ["🛠️", "tools build"],
      ["⚙️", "gear settings"],
      ["🧪", "test lab experiment"],
      ["🧩", "puzzle piece"],
      ["💻", "laptop code computer"],
      ["🎨", "palette art design"],
      ["📷", "camera photo"],
      ["🎬", "film movie"],
      ["🎧", "headphones music"],
      ["🎸", "guitar music"],
      ["🏗️", "construction build"],
      ["🧭", "compass direction"],
      ["🗺️", "map travel"],
      ["🔭", "telescope research"],
    ],
  },
  {
    label: "Life",
    items: [
      ["🏠", "home house"],
      ["🌱", "seedling grow plant"],
      ["🌿", "herb fern leaf"],
      ["🍃", "leaves"],
      ["🌸", "blossom flower"],
      ["🌻", "sunflower"],
      ["☀️", "sun day"],
      ["🌙", "moon night"],
      ["⭐", "star"],
      ["✨", "sparkles"],
      ["🔥", "fire hot"],
      ["💧", "water drop"],
      ["☕", "coffee"],
      ["🍵", "tea"],
      ["🍳", "cooking recipe"],
      ["🥗", "salad food health"],
      ["🏃", "run exercise"],
      ["🧘", "meditate calm yoga"],
      ["💪", "strong fitness"],
      ["😴", "sleep"],
      ["✈️", "plane travel trip"],
      ["🏖️", "beach holiday"],
      ["🎁", "gift present"],
      ["🎉", "party celebrate"],
    ],
  },
  {
    label: "People",
    items: [
      ["🙂", "smile happy"],
      ["😊", "blush happy"],
      ["🤔", "thinking question"],
      ["😎", "cool"],
      ["🥳", "party"],
      ["😌", "relieved calm"],
      ["🙌", "hands celebrate"],
      ["👋", "wave hello"],
      ["🤝", "handshake meeting"],
      ["👀", "eyes look review"],
      ["❤️", "heart love"],
      ["💚", "green heart"],
      ["💙", "blue heart"],
      ["💛", "yellow heart"],
      ["👥", "people team"],
      ["🧑‍💻", "developer coder"],
    ],
  },
  {
    label: "Symbols",
    items: [
      ["❗", "important exclamation"],
      ["❓", "question"],
      ["⚠️", "warning"],
      ["🚧", "wip construction"],
      ["🔔", "bell reminder"],
      ["💬", "speech chat comment"],
      ["🔗", "link"],
      ["♻️", "recycle"],
      ["🟢", "green circle"],
      ["🟡", "yellow circle"],
      ["🔵", "blue circle"],
      ["🟣", "purple circle"],
      ["⚡", "lightning fast"],
      ["🌀", "cyclone"],
      ["🏁", "finish flag"],
      ["🏆", "trophy win"],
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);
const COLS = 8;

export function EmojiPicker({
  value,
  onPick,
}: {
  value: string | null;
  onPick: (emoji: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const groups = q
    ? [{ label: "Results", items: ALL.filter(([e, words]) => words.includes(q) || e === q) }]
    : GROUPS;

  function onGridKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const cells = [...(gridRef.current?.querySelectorAll<HTMLButtonElement>("[data-emoji]") ?? [])];
    const at = cells.indexOf(e.target as HTMLButtonElement);
    if (at === -1) return;
    const step =
      e.key === "ArrowRight"
        ? 1
        : e.key === "ArrowLeft"
          ? -1
          : e.key === "ArrowDown"
            ? COLS
            : e.key === "ArrowUp"
              ? -COLS
              : 0;
    if (!step) return;
    e.preventDefault();
    e.stopPropagation();
    const next = at + step;
    if (next < 0)
      gridRef.current?.closest("[role=dialog]")?.querySelector<HTMLInputElement>("input")?.focus();
    else cells[Math.min(next, cells.length - 1)]?.focus();
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      gridRef.current?.querySelector<HTMLButtonElement>("[data-emoji]")?.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const first = groups[0]?.items[0];
      if (first) onPick(first[0]);
    }
  }

  return (
    <div className="w-[19.5rem]">
      <div className="flex items-center gap-1 pb-1.5">
        <label className="flex h-8 flex-1 items-center gap-2 rounded-md bg-surface-sunken px-2.5 text-ink-subtle focus-within:ring-2 focus-within:ring-accent">
          <Search className="size-3.5 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search icons"
            aria-label="Search icons"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
          />
        </label>
        <button
          type="button"
          onClick={() => onPick(ALL[Math.floor(Math.random() * ALL.length)]![0])}
          aria-label="Random icon"
          title="Random"
          className="flex size-8 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink"
        >
          <Shuffle className="size-3.5" />
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onPick(null)}
            aria-label="Remove icon"
            title="Remove"
            className="flex size-8 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      <div
        ref={gridRef}
        onKeyDown={onGridKeyDown}
        className="-mr-1.5 max-h-64 [scrollbar-width:thin] [scrollbar-color:var(--color-surface-hover)_transparent] overflow-y-auto overscroll-contain pr-1.5"
      >
        {groups.map((group) => (
          <div key={group.label} role="group" aria-label={group.label}>
            <p className="px-1 pt-1.5 pb-1 text-[11px] font-medium tracking-[0.08em] text-ink-faint uppercase">
              {group.label}
            </p>
            <div className="grid grid-cols-8">
              {group.items.map(([emoji, words]) => (
                <button
                  key={emoji}
                  type="button"
                  data-emoji
                  tabIndex={-1}
                  onClick={() => onPick(emoji)}
                  aria-label={words.split(" ")[0]}
                  aria-pressed={emoji === value}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-md text-[19px] leading-none transition-[background-color,transform] hover:bg-surface-hover focus-visible:bg-surface-hover active:scale-90",
                    emoji === value && "bg-accent-soft",
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
        {groups[0]?.items.length === 0 && (
          <p className="px-1 py-6 text-center text-[13px] text-ink-subtle">
            Nothing matches “{query}”.
          </p>
        )}
      </div>
    </div>
  );
}

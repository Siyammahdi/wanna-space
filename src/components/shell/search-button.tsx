"use client";

import { Search } from "lucide-react";

import { requestCommandPalette } from "@/lib/command-palette";

/** Opens the command palette on touch screens, where there is no ⌘K. */
export function SearchButton() {
  return (
    <button
      type="button"
      aria-label="Search"
      onClick={requestCommandPalette}
      className="flex size-9 items-center justify-center rounded-full text-ink-muted transition-[color,background-color,transform] hover:bg-surface-hover hover:text-ink active:scale-90"
    >
      <Search className="size-[18px]" />
    </button>
  );
}

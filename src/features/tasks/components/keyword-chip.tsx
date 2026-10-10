"use client";

import { Hash } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/cn";

import { KEYWORD_LIMITS, keywordProblem, normalizeKeyword } from "../keywords";

/** A project's keyword as a pill; click to change it. */
export function KeywordChip({
  keyword,
  onChange,
  className,
}: {
  keyword: string;
  onChange: (keyword: string) => void;
  className?: string;
}) {
  const problemId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft === null ? null : normalizeKeyword(draft);
  const problem = value && value !== keyword ? keywordProblem(value) : null;

  function commit() {
    if (value === null) return;
    if (!problem && value && value !== keyword) onChange(value);
    setDraft(null);
  }

  if (draft === null) {
    return (
      <button
        type="button"
        onClick={() => setDraft(keyword)}
        title={`Type “${keyword}” in any task to file it here. Click to change.`}
        aria-label={`Keyword: ${keyword}. Change keyword`}
        className={cn(
          "inline-flex h-7 items-center gap-0.5 rounded-full bg-surface-sunken pr-2.5 pl-2 font-mono text-[12px] text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink",
          className,
        )}
      >
        <Hash className="size-3.5 text-ink-faint" strokeWidth={2.25} />
        {keyword}
      </button>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex h-7 items-center gap-0.5 rounded-full bg-surface-sunken pr-2.5 pl-2 ring-2",
          problem ? "ring-danger/40" : "ring-accent/40",
        )}
      >
        <Hash className="size-3.5 text-ink-faint" strokeWidth={2.25} />
        <input
          autoFocus
          value={draft}
          maxLength={KEYWORD_LIMITS.max + 1}
          aria-label="Project keyword"
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? problemId : undefined}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setDraft(e.target.value.replace(/\s/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!problem) commit();
            }
            if (e.key === "Escape") {
              e.stopPropagation();
              setDraft(null);
            }
          }}
          onBlur={commit}
          className="field-sizing-content min-w-[3ch] bg-transparent font-mono text-[12px] text-ink outline-none"
        />
      </span>
      {problem && (
        <span id={problemId} role="status" className="text-[12px] text-danger">
          {problem}
        </span>
      )}
    </span>
  );
}

# 0016 — Project keywords

- Status: Accepted
- Date: 2026-10-09

## Context

Quick add already understood `#project` (by name or a prefix of it), but long or similar
names are slow to type, and people think of their projects by short codes ("twp" for
TechWitPro). We want a task typed anywhere to land in the right project from a word or
two.

## Decision

- **Every project has a keyword** (`project.keyword`, migration `0010`): lowercase letters
  and digits, 2–12 characters, at least one letter, unique per space (unique index on
  `space_id, keyword`).
- **A default is assigned on creation** from the name (`features/tasks/keywords.ts`):
  - several words, including camelCase, give their initials: "Tech Wit Pro",
    "TechWitPro" → `twp`;
  - one word of three or more syllables gives the syllables' first letters, using a
    small list of English onsets to split them: "Techwitpro" → tech·wit·pro → `twp`,
    "Marketing" → `mkt`;
  - shorter words give a consonant code: "Home" → `hm`, "Vault" → `vlt`;
  - a taken keyword gets a number: `twp2`.
    Codes are preferred over words so a default rarely matches ordinary title text. The
    migration backfills existing projects with the same rules in SQL.
- **Quick add matches it two ways**, in every add bar (Tasks, Today, quick capture,
  Planner lanes, Orbit columns), since they share `parseTaskInput`:
  - `#twp`: a `#` token checks keywords first, then exact names, then name prefixes;
  - `twp` on its own: the last standalone word that equals a keyword (case-insensitive).
    It's matched after dates, times, repeats and priorities, so it never takes their
    words, and a keyword typed alone stays the title.
    The matched word is removed from the title and shown as the project chip, as `#name`
    always was.
- **Keywords can't mean something else to the parser.** A candidate is rejected if
  `parseTaskInput` finds a date, time, repeat or priority in it (`fri`, `p1`, `5pm`,
  `daily`).
- **Editing**: a `#keyword` chip in the Tasks project header and the Orbit board header
  (click to change, validated as you type), and a list of every project's keyword in
  Settings → Tasks. The server re-validates and checks uniqueness.

## Consequences

- A project whose keyword is a common word will catch that word in titles. The defaults
  avoid this; a user who picks a word gets what they asked for, and the chip shows the
  match before the task is added.
- The command palette also finds projects and boards by keyword.
- Keywords are in the JSON export.

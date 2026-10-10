/** Queries shorter than this aren't sent to the server. */
export const SEARCH_MIN = 2;

const MAX_WORDS = 6;

/** The query's distinct words, lowercased; a result has to contain every one. */
export function searchWords(query: string): string[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return [...new Set(words)].slice(0, MAX_WORDS);
}

/** An `ILIKE` pattern that finds `word` anywhere, with the pattern characters escaped. */
export const containsPattern = (word: string) => `%${word.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export const hasAll = (text: string, words: string[]) => {
  const t = text.toLowerCase();
  return words.every((w) => t.includes(w));
};

/**
 * A line of `text` around the first word it contains, with ellipses where it was cut;
 * undefined when none of the words is there.
 */
export function snippet(text: string | null | undefined, words: string[], width = 96) {
  if (!text) return undefined;
  const flat = text.replace(/\s+/g, " ").trim();
  const lower = flat.toLowerCase();
  const at = Math.min(...words.map((w) => lower.indexOf(w)).filter((i) => i >= 0));
  if (!Number.isFinite(at)) return undefined;
  let start = Math.max(0, at - Math.round(width / 3));
  if (start > 0) {
    const space = flat.indexOf(" ", start - 1);
    if (space >= 0 && space < at) start = space + 1;
  }
  const end = Math.min(flat.length, start + width);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end).trim()}${end < flat.length ? "…" : ""}`;
}

/** `text` split into runs, marking where any of the words appears (case-insensitive). */
export function highlight(text: string, words: string[]): { text: string; hit: boolean }[] {
  const lower = text.toLowerCase();
  const marks = new Array<boolean>(text.length).fill(false);
  for (const w of words) {
    for (let i = lower.indexOf(w); i >= 0 && w; i = lower.indexOf(w, i + w.length)) {
      marks.fill(true, i, i + w.length);
    }
  }
  const runs: { text: string; hit: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = runs.at(-1);
    if (last && last.hit === marks[i]) last.text += text[i];
    else runs.push({ text: text[i]!, hit: marks[i]! });
  }
  return runs;
}

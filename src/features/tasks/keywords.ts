import { parseTaskInput } from "./parse";

/**
 * A project's keyword: a short code ("twp" for TechWitPro) that files a task into the
 * project when it appears in quick add, on its own or as `#twp` (ADR 0016).
 */
export const KEYWORD_LIMITS = { min: 2, max: 12 } as const;

const KEYWORD_RE = /^(?=.*\p{L})[\p{L}\p{M}\p{N}]+$/u;
const VOWELS = /[aeiou]/;

export const normalizeKeyword = (value: string) =>
  value.trim().replace(/^#/, "").toLocaleLowerCase();

/** Why a keyword can't be used, or null when it can. `taken` holds other projects' keywords. */
export function keywordProblem(keyword: string, taken: Iterable<string> = []): string | null {
  if (keyword.length < KEYWORD_LIMITS.min) return "Use at least 2 characters";
  if (keyword.length > KEYWORD_LIMITS.max) return "Keep it to 12 characters or fewer";
  if (!KEYWORD_RE.test(keyword)) {
    return /^[\p{L}\p{M}\p{N}]+$/u.test(keyword)
      ? "Include at least one letter"
      : "Use letters and numbers only";
  }
  // Dates, times, repeats and priorities always win in quick add, so they can't be keywords.
  if (parseTaskInput(keyword, "2026-01-01").matches.length > 0) {
    return `“${keyword}” already means a date or priority`;
  }
  for (const k of taken) if (k === keyword) return `“${keyword}” is used by another project`;
  return null;
}

function words(name: string) {
  return name
    .replace(/(\p{Ll})(\p{Lu})/gu, "$1 $2")
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean)
    .map((w) => w.toLocaleLowerCase());
}

/** Consonant clusters that can start an English syllable ("pro", "str"). */
const ONSETS = new Set(
  "bl br ch cl cr dr fl fr gl gr kn ph pl pr sc sh sk sl sm sn sp st sw th tr tw wh wr sch scr shr spl spr str thr".split(
    " ",
  ),
);

/** First letter of each syllable: "techwitpro" → tech·wit·pro → "twp". */
function syllableInitials(word: string) {
  let initials = word.charAt(0);
  for (const m of word.matchAll(/[aeiou]+([^aeiou]+)(?=[aeiou])/g)) {
    const cluster = m[1]!;
    const onset = [cluster.slice(-3), cluster.slice(-2)].find((s) => ONSETS.has(s));
    initials += (onset ?? cluster.slice(-1)).charAt(0);
  }
  return initials;
}

/**
 * Initials for several words ("Tech Wit Pro", "TechWitPro" → "twp"); for one word, its
 * syllables when there are three or more ("Techwitpro" → "twp", "Marketing" → "mkt"),
 * otherwise a consonant code ("Home" → "hm").
 */
function baseKeyword(name: string) {
  const parts = words(name);
  if (parts.length > 1) {
    return parts
      .slice(0, 5)
      .map((w) => [...w][0])
      .join("");
  }
  const word = parts[0] ?? "";
  const letters = [...word];
  if (letters.length <= 3) return word;
  const syllables = syllableInitials(word);
  if (syllables.length >= 3) return syllables.slice(0, 4);
  const consonants = letters.slice(1).filter((c) => /\p{L}/u.test(c) && !VOWELS.test(c));
  return consonants.length >= 1
    ? letters[0]! + consonants.slice(0, 2).join("")
    : letters.slice(0, 3).join("");
}

/** The default keyword for a project name, unique among `taken`. */
export function suggestKeyword(name: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  let base = baseKeyword(name)
    .slice(0, KEYWORD_LIMITS.max - 1)
    .padEnd(KEYWORD_LIMITS.min, "x");
  if (keywordProblem(base)) base = "proj";
  if (!used.has(base) && !keywordProblem(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base.slice(0, KEYWORD_LIMITS.max - String(n).length)}${n}`;
    if (!used.has(candidate) && !keywordProblem(candidate)) return candidate;
  }
}

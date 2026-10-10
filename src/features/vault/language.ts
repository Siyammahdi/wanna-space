/** Languages a snippet can be labelled with: id → display name. */
export const LANGUAGES = {
  ts: "TypeScript",
  tsx: "TSX",
  js: "JavaScript",
  jsx: "JSX",
  html: "HTML",
  css: "CSS",
  json: "JSON",
  py: "Python",
  go: "Go",
  rust: "Rust",
  java: "Java",
  kotlin: "Kotlin",
  swift: "Swift",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  php: "PHP",
  ruby: "Ruby",
  sql: "SQL",
  sh: "Shell",
  yaml: "YAML",
  md: "Markdown",
  text: "Plain text",
} as const;

export type LanguageId = keyof typeof LANGUAGES;

export const languageName = (id: string | null) =>
  id && id in LANGUAGES ? LANGUAGES[id as LanguageId] : null;

/** First match wins, so the more specific patterns come first. */
const RULES: [LanguageId, RegExp][] = [
  ["html", /^\s*<(!doctype|html|head|body|div|span|section|p|a|ul|svg|template)\b/i],
  ["sh", /^\s*(#!\/|\$ |(sudo|npm|pnpm|yarn|npx|git|cd|ls|curl|brew|apt|docker) )/m],
  [
    "sql",
    /^\s*(select|insert into|update|delete from|create (table|index|view)|alter table|with)\b/im,
  ],
  ["py", /^\s*(def \w+\(.*\):|class \w+(\(.*\))?:|from [\w.]+ import|import \w+$|if __name__)/m],
  ["go", /^\s*(package \w+|func (\(\w+ \*?\w+\) )?\w+\(|import \()/m],
  ["rust", /^\s*(fn \w+|let mut |impl\b|use \w+::|pub (fn|struct|enum)|#\[derive)/m],
  ["php", /^\s*<\?php/],
  ["csharp", /^\s*(using System|namespace \w+|public (class|static|async) )/m],
  ["java", /^\s*(public (class|interface|static void main)|import java\.)/m],
  ["kotlin", /^\s*(fun \w+\(|val \w+ =|data class )/m],
  ["swift", /^\s*(import (SwiftUI|UIKit|Foundation)|func \w+\(.*\) ->|struct \w+: View)/m],
  ["cpp", /^\s*(#include <\w+>|std::|template ?<)/m],
  ["c", /^\s*#include [<"]/m],
  ["ruby", /^\s*(def \w+|require ['"]|end$|puts )/m],
  ["yaml", /^[\w-]+:( |$)[\s\S]*\n[\w-]+:( |$)/m],
  ["css", /^\s*([.#]?[\w-]+(\s*[>,+~]?\s*[.#]?[\w-]+)*|:root|@media[^{]*)\s*\{[^}]*:[^}]*;?\s*\}/m],
  [
    "tsx",
    /(:\s*(React\.)?\w+(<[^>]*>)?\s*[=)]|interface \w+|type \w+ =)[\s\S]*<\/?[A-Z]?\w+[\s>/]/,
  ],
  [
    "ts",
    /(interface \w+\s*\{|type \w+(<[^>]*>)? =|: (string|number|boolean)\b|as const\b|import type )/,
  ],
  ["jsx", /return\s*\(?\s*<[\w.]+[\s>]|<\/[\w.]+>\s*\)?;?\s*$/m],
  [
    "js",
    /(const|let|var) \w+ = |function \w*\(|=> \{|console\.log|import .* from ['"]|export (default|const|function)/,
  ],
  ["md", /^(#{1,6} \S|[-*] \[[ x]\] |```)/m],
];

/** A best guess from the code itself; null when nothing fits. */
export function guessLanguage(code: string): LanguageId | null {
  if (/^\s*[[{]/.test(code) && code.length < 200_000) {
    try {
      JSON.parse(code);
      return "json";
    } catch {}
  }
  const sample = code.slice(0, 4000);
  for (const [id, pattern] of RULES) if (pattern.test(sample)) return id;
  return null;
}

/** Whether pasted text looks like code rather than prose. */
export function looksLikeCode(text: string) {
  const lines = text.split("\n");
  if (lines.length < 2) return /[{};]\s*$|^\s*(const|let|import|def|func|SELECT)\b/.test(text);
  const codeish = lines.filter((l) => /[{}();=<>]|^\s{2,}\S|^\t/.test(l)).length;
  return codeish / lines.length > 0.4 && guessLanguage(text) !== null;
}

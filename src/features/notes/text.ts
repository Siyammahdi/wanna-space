const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "listItem",
  "taskItem",
  "callout",
]);

type Node = { type?: unknown; text?: unknown; content?: unknown };

/** Plain text of a Tiptap document, blocks separated by spaces, cut to `max` characters. */
export function extractText(doc: unknown, max = 280): string {
  let out = "";
  const walk = (node: unknown) => {
    if (out.length >= max || !node || typeof node !== "object") return;
    const n = node as Node;
    if (typeof n.text === "string") out += n.text;
    if (Array.isArray(n.content)) n.content.forEach(walk);
    if (typeof n.type === "string" && BLOCK_TYPES.has(n.type)) out += " ";
  };
  walk(doc);
  return out.replace(/\s+/g, " ").trim().slice(0, max);
}

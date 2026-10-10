/** True while focus is in a text field, where single-key shortcuts and ⌘Z belong to the field. */
export const isTypingTarget = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

export const isMac = () =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);

/** "⌘Z" / "⇧⌘Z" on Apple devices, "Ctrl Z" / "Ctrl Shift Z" elsewhere. */
export const modKey = (key: string, { shift = false } = {}) =>
  isMac() ? `${shift ? "⇧" : ""}⌘${key}` : `Ctrl ${shift ? "Shift " : ""}${key}`;

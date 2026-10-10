/**
 * App-wide undo/redo history (client only). Features push each change with its
 * inverse; ⌘Z / ⇧⌘Z (components/shell/undo.tsx) or a toast's button replays it.
 */

export type UndoEntry = { id: string; label: string; undo: () => void; redo: () => void };

const LIMIT = 30;
const undoStack: UndoEntry[] = [];
const redoStack: UndoEntry[] = [];
let seq = 0;

/** Records a new change. Like every editor, a fresh change clears the redo history. */
export function pushUndo(entry: Omit<UndoEntry, "id">): string {
  const id = `undo-${++seq}`;
  undoStack.push({ id, ...entry });
  if (undoStack.length > LIMIT) undoStack.shift();
  redoStack.length = 0;
  return id;
}

function take(stack: UndoEntry[], id?: string) {
  const index = id === undefined ? stack.length - 1 : stack.findIndex((e) => e.id === id);
  return index < 0 ? undefined : stack.splice(index, 1)[0];
}

/** Undoes a specific entry, or the most recent one. */
export function runUndo(id?: string): UndoEntry | undefined {
  const entry = take(undoStack, id);
  if (!entry) return;
  entry.undo();
  redoStack.push(entry);
  return entry;
}

/** Re-applies a specific undone entry, or the most recently undone one. */
export function runRedo(id?: string): UndoEntry | undefined {
  const entry = take(redoStack, id);
  if (!entry) return;
  entry.redo();
  undoStack.push(entry);
  return entry;
}

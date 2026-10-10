"use client";

import { useEffect } from "react";

import { dismissToast, toast } from "@/components/ui/toast";
import { isTypingTarget, modKey } from "@/lib/keyboard";
import { pushUndo, runRedo, runUndo, type UndoEntry } from "@/lib/undo";

const FEEDBACK_ID = "undo-feedback";

/** Records a change; with a message, also offers Undo in a toast. */
export function recordUndo(entry: Omit<UndoEntry, "id">, announce?: string) {
  const id = pushUndo(entry);
  if (announce) {
    toast({
      id,
      message: announce,
      detail: entry.label,
      duration: 6000,
      action: { label: "Undo", hint: modKey("Z"), onAction: () => undo(id) },
    });
  }
}

export function undo(id?: string) {
  const entry = runUndo(id);
  if (!entry) return false;
  dismissToast(entry.id);
  toast({
    id: FEEDBACK_ID,
    message: "Undone",
    detail: entry.label,
    duration: 5000,
    action: { label: "Redo", hint: modKey("Z", { shift: true }), onAction: () => redo(entry.id) },
  });
  return true;
}

export function redo(id?: string) {
  const entry = runRedo(id);
  if (!entry) return false;
  toast({
    id: FEEDBACK_ID,
    message: "Redone",
    detail: entry.label,
    duration: 5000,
    action: { label: "Undo", hint: modKey("Z"), onAction: () => undo(entry.id) },
  });
  return true;
}

/**
 * ⌘Z / Ctrl+Z undoes, ⇧⌘Z / Ctrl+Shift+Z / Ctrl+Y redoes, anywhere in the app.
 * Text fields keep their own native undo.
 */
export function UndoShortcut() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      const handled =
        key === "z" ? (e.shiftKey ? redo() : undo()) : key === "y" && !e.metaKey ? redo() : false;
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}

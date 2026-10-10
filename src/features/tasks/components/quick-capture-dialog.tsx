"use client";

import { AnimatePresence, motion } from "motion/react";
import { startTransition, useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Kbd } from "@/components/ui/kbd";
import { useSettings } from "@/components/shell/settings-context";
import { recordUndo } from "@/components/shell/undo";
import type { IsoDate } from "@/lib/dates";
import { isTypingTarget } from "@/lib/keyboard";
import { spring } from "@/lib/motion";
import { QUICK_CAPTURE_EVENT, requestQuickCapture } from "@/lib/quick-capture";

import type { CreateTaskInput, ProjectItem } from "../schema";
import { createTask, deleteTask, restoreTasks } from "../server/actions";
import { QuickAdd } from "./quick-add";

/**
 * App-wide capture: "C" anywhere (or the sidebar button) opens this dialog unless the
 * current page has its own inline add bar that claims the request.
 */
export function QuickCaptureDialog({
  today,
  projects,
}: {
  today: IsoDate;
  projects: ProjectItem[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { captureProjectId } = useSettings();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        requestQuickCapture();
      }
    };
    const onCapture = (e: Event) => {
      // Let every listener run first; an inline add bar may have claimed it.
      queueMicrotask(() => {
        if (!e.defaultPrevented) setOpen(true);
      });
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(QUICK_CAPTURE_EVENT, onCapture);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(QUICK_CAPTURE_EVENT, onCapture);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function add(input: CreateTaskInput) {
    setOpen(false);
    setError(null);
    startTransition(async () => {
      const result = await createTask(input);
      if (!result.ok) {
        setError(result.error);
        setOpen(true);
        return;
      }
      const where = projects.find((p) => p.id === input.projectId)?.name ?? "Inbox";
      let deletion: ReturnType<typeof deleteTask> | null = null;
      recordUndo(
        {
          label: `“${input.title}”`,
          undo: () => {
            deletion = deleteTask(input.id);
          },
          redo: () =>
            startTransition(async () => {
              const result = await deletion;
              if (result?.ok) await restoreTasks(result.data);
            }),
        },
        `Added to ${where}`,
      );
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[16vh]">
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/25 backdrop-blur-[3px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Quick capture"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.14 } }}
            transition={spring.gentle}
            className="relative w-full max-w-xl rounded-2xl bg-canvas p-3 shadow-xl"
          >
            <div className="flex items-center justify-between px-2 pt-1 pb-3">
              <p className="font-heading text-[15px] font-semibold tracking-[-0.01em] text-ink">
                Quick capture
              </p>
              <p className="flex items-center gap-1.5 text-[12px] text-ink-faint">
                <Kbd>Esc</Kbd> to close
              </p>
            </div>
            {error && (
              <div className="mb-3">
                <Alert tone="danger">{error}</Alert>
              </div>
            )}
            <QuickAdd
              today={today}
              projects={projects}
              onAdd={add}
              defaultProjectId={
                projects.some((p) => p.id === captureProjectId) ? captureProjectId : null
              }
              autoFocus
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

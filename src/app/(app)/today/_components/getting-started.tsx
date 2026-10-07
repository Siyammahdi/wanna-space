"use client";

import { motion } from "motion/react";
import { useState } from "react";

import { Card } from "@/components/ui/card";
import { TaskCheck, TaskTitle } from "@/features/tasks/components/task-check";
import { spring } from "@/lib/motion";

const steps = [
  "Walk through your rooms in the sidebar",
  "Pick the theme that feels like home",
  "Tick this off — it should feel good",
];

/** Local-only onboarding checklist; real tasks arrive with the Tasks module. */
export function GettingStarted() {
  const [done, setDone] = useState<boolean[]>(() => steps.map(() => false));
  const completed = done.filter(Boolean).length;

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-ink">Getting started</h2>
        <span className="font-mono text-xs text-ink-subtle tabular-nums">
          {completed}/{steps.length}
        </span>
      </div>
      <div className="mb-5 h-1 overflow-hidden rounded-full bg-surface-sunken">
        <motion.div
          className="h-full rounded-full bg-room-tasks"
          initial={false}
          animate={{ width: `${(completed / steps.length) * 100}%` }}
          transition={spring.gentle}
        />
      </div>
      <ul className="flex flex-col gap-3.5">
        {steps.map((step, i) => (
          <li key={step} className="flex items-center gap-3 text-[15px]">
            <TaskCheck
              label={step}
              checked={done[i]}
              onCheckedChange={(value) =>
                setDone((prev) => prev.map((d, j) => (j === i ? value : d)))
              }
            />
            <TaskTitle checked={done[i]}>{step}</TaskTitle>
          </li>
        ))}
      </ul>
    </Card>
  );
}

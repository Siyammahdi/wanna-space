"use client";

import { motion } from "motion/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { TaskCheck, TaskTitle } from "@/features/tasks/components/task-check";
import { spring } from "@/lib/motion";

const presets = [
  { name: "snappy", use: "Press, toggle, check" },
  { name: "gentle", use: "Panels, sheets, layout" },
  { name: "bouncy", use: "Moments of delight" },
  { name: "glide", use: "Shared highlights" },
] as const;

export function MotionLab() {
  const [on, setOn] = useState(false);
  const [checked, setChecked] = useState(false);

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_280px]">
      <div className="rounded-xl bg-surface-raised p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-ink">Spring presets</p>
          <Button size="sm" variant="secondary" onClick={() => setOn((v) => !v)}>
            Play
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          {presets.map(({ name, use }) => (
            <div key={name} className="flex items-center gap-4">
              <div className="w-28 shrink-0">
                <p className="font-mono text-xs text-ink">spring.{name}</p>
                <p className="text-[11px] text-ink-subtle">{use}</p>
              </div>
              <div className="relative h-8 flex-1 rounded-md bg-surface-sunken">
                <motion.span
                  className="absolute top-1 left-1 size-6 rounded-sm bg-accent"
                  animate={{ left: on ? "calc(100% - 28px)" : "4px" }}
                  transition={spring[name]}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col justify-center gap-3 rounded-xl bg-surface-raised p-5">
        <p className="text-sm font-medium text-ink">Signature interaction</p>
        <div className="flex items-center gap-3 text-[15px]">
          <TaskCheck label="Ship the foundation" checked={checked} onCheckedChange={setChecked} />
          <TaskTitle checked={checked}>Ship the foundation</TaskTitle>
        </div>
        <p className="text-[12px] text-ink-subtle">
          Completing a task should feel like a small reward.
        </p>
      </div>
    </div>
  );
}

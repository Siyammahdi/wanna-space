"use client";

import { Bell, BellRing, Check, Pause, Play, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useEffectEvent, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/cn";
import { isTypingTarget } from "@/lib/keyboard";
import { spring } from "@/lib/motion";
import { setDevicePref } from "@/lib/settings";
import { useDevicePref } from "@/lib/use-device-pref";

import type { TaskChoice } from "../schema";
import { isBreak, isIdle, isRunning, phaseLabel, roundsInCycle, type TimerMode } from "../timer";
import { ProgressRing } from "./progress-ring";
import { TaskPicker } from "./task-picker";
import { useTimer, useTimerClock } from "./timer-provider";

const MODES: { id: TimerMode; label: string }[] = [
  { id: "pomodoro", label: "Pomodoro" },
  { id: "stopwatch", label: "Stopwatch" },
];

/** The Time room's centerpiece: one timer, linked to a task, that survives reloads. */
export function FocusTimer({ choices }: { choices: TaskChoice[] }) {
  const { timer, durations, send } = useTimer();
  const { clock, progress } = useTimerClock();
  const running = isRunning(timer);
  const idle = isIdle(timer);
  const onBreak = isBreak(timer);
  const stopwatch = timer.mode === "stopwatch";
  const completed = roundsInCycle(timer, durations);

  const toggle = () => void send({ type: running ? "pause" : "start" });
  const onSpace = useEffectEvent(toggle);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (isTypingTarget(target) || target?.closest("button, a, [role=dialog]")) return;
      e.preventDefault();
      onSpace();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const status = onBreak
    ? phaseLabel[timer.phase]
    : stopwatch
      ? idle
        ? "Stopwatch"
        : running
          ? "Tracking"
          : "Paused"
      : idle
        ? "Ready to focus"
        : running
          ? "Focus"
          : "Paused";

  return (
    <Card className="flex flex-col items-center gap-6 px-5 pt-5 pb-7 md:px-8">
      <div className="flex w-full items-center justify-between gap-3">
        <ModeSwitch
          mode={timer.mode}
          disabled={!idle || onBreak}
          onChange={(mode) => void send({ type: "mode", mode })}
        />
        <div className="flex items-center gap-0.5">
          <NotifyButton />
          <SoundButton />
        </div>
      </div>

      <div className="relative grid place-items-center">
        <div
          aria-hidden
          className={cn(
            "absolute inset-6 rounded-full blur-2xl transition-[background-color,opacity] duration-700",
            onBreak ? "bg-accent-soft" : "bg-room-time-soft",
            running ? "opacity-100" : "opacity-0",
          )}
        />
        <div className="relative">
          <ProgressRing
            key={`${timer.phase}-${timer.sessionStartedAt ?? "idle"}`}
            progress={idle && !onBreak ? 0 : progress}
            size={248}
            stroke={7}
            className={cn("transition-colors", onBreak ? "text-accent" : "text-room-time")}
            trackClassName="text-surface-sunken"
          />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            role="timer"
            aria-live="off"
            className={cn(
              "font-heading text-[56px] leading-none font-semibold tracking-[-0.035em] tabular-nums transition-colors",
              running || idle ? "text-ink" : "text-ink-muted",
            )}
          >
            {clock}
          </span>
          <span className="mt-2.5 text-[13px] font-medium text-ink-subtle">{status}</span>
          {!stopwatch && (
            <span
              className="mt-2.5 flex items-center gap-1.5"
              aria-label={`${completed} of ${durations.longBreakEvery} rounds before a long break`}
            >
              {Array.from({ length: durations.longBreakEvery }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-1.5 rounded-full transition-colors duration-500",
                    i < completed ? "bg-room-time" : "bg-ink-faint/40",
                  )}
                />
              ))}
            </span>
          )}
        </div>
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-1">
        <TaskPicker
          choices={choices}
          value={timer.task}
          onChange={(task) => void send({ type: "task", taskId: task?.id ?? null }, { task })}
          align="start"
          className="justify-center"
        />
        <NoteField
          note={timer.note}
          onSave={(note) => void send({ type: "note", note })}
          disabled={onBreak}
        />
      </div>

      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex justify-end">
          {!idle && !onBreak && (
            <Button
              variant="ghost"
              onClick={() => void send({ type: "discard" })}
              title="Discard this session without logging it"
              className="max-sm:px-2.5"
            >
              <X /> <span className="max-sm:sr-only">Discard</span>
            </Button>
          )}
        </div>
        <Button
          variant="accent"
          size="lg"
          onClick={toggle}
          className="min-w-32 sm:min-w-36"
          aria-keyshortcuts="Space"
        >
          {running ? <Pause /> : <Play />}
          {running ? "Pause" : idle && !onBreak ? "Start" : "Resume"}
          <Kbd
            data-kbd-hints
            className="ml-1 bg-accent-contrast/15 text-accent-contrast/80 [@media(hover:none)]:hidden"
          >
            Space
          </Kbd>
        </Button>
        <div className="flex">
          {onBreak ? (
            <Button
              variant="ghost"
              onClick={() => void send({ type: "finish" })}
              title="Skip the break"
              className="max-sm:px-2.5"
            >
              <SkipForward /> <span className="max-sm:sr-only">Skip</span>
            </Button>
          ) : (
            !idle && (
              <Button
                variant="ghost"
                onClick={() => void send({ type: "finish" })}
                title="Stop and log the time so far"
                className="max-sm:px-2.5"
              >
                <Check /> <span className="max-sm:sr-only">Finish</span>
              </Button>
            )
          )}
        </div>
      </div>
    </Card>
  );
}

function ModeSwitch({
  mode,
  disabled,
  onChange,
}: {
  mode: TimerMode;
  disabled: boolean;
  onChange: (mode: TimerMode) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Timer mode"
      title={disabled ? "Finish or discard the session to switch" : undefined}
      className={cn("flex rounded-md bg-surface-sunken p-0.5", disabled && "opacity-60")}
    >
      {MODES.map((m) => {
        const active = m.id === mode;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled && !active}
            onClick={() => !active && onChange(m.id)}
            className={cn(
              "relative h-7 rounded-sm px-3 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed",
              active ? "text-ink" : "text-ink-subtle hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="timer-mode"
                transition={spring.glide}
                className="absolute inset-0 rounded-sm bg-surface-raised"
              />
            )}
            <span className="relative">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function NoteField({
  note,
  onSave,
  disabled,
}: {
  note: string;
  onSave: (note: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState(note);
  const [synced, setSynced] = useState(note);
  if (note !== synced) {
    setSynced(note);
    setValue(note);
  }
  const commit = () => {
    const next = value.trim();
    if (next !== note) onSave(next);
  };
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setValue(note);
          requestAnimationFrame(() => (e.target as HTMLInputElement).blur());
        }
      }}
      disabled={disabled}
      maxLength={500}
      placeholder={disabled ? "Enjoy the break" : "Add a note"}
      aria-label="Session note"
      className="h-9 w-full rounded-md bg-transparent px-3 text-center text-[13.5px] text-ink-muted transition-colors outline-none placeholder:text-ink-faint hover:bg-surface-hover focus:bg-surface-sunken focus:text-ink disabled:pointer-events-none"
    />
  );
}

function SoundButton() {
  const on = useDevicePref("timerSound");
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setDevicePref("timerSound", !on)}
      aria-pressed={on}
      aria-label="Chime when a phase ends"
      title={on ? "Chime is on" : "Chime is off"}
    >
      {on ? <Volume2 /> : <VolumeX />}
    </Button>
  );
}

const noSubscribe = () => () => {};
const readPermission = () =>
  typeof Notification === "undefined" ? "unsupported" : Notification.permission;

function NotifyButton() {
  const initial = useSyncExternalStore(noSubscribe, readPermission, () => "unsupported");
  const [asked, setAsked] = useState<NotificationPermission | null>(null);
  const permission = asked ?? initial;
  if (permission === "unsupported") return null;
  const granted = permission === "granted";
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={async () => {
        if (permission === "default") setAsked(await Notification.requestPermission());
      }}
      aria-pressed={granted}
      aria-label="Notify me when a phase ends"
      title={
        granted
          ? "You’ll get a notification when a phase ends in the background"
          : permission === "denied"
            ? "Notifications are blocked in your browser settings"
            : "Notify me when a phase ends"
      }
      className={cn(granted && "text-room-time hover:text-room-time")}
    >
      {granted ? <BellRing /> : <Bell />}
    </Button>
  );
}

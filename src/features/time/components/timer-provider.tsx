"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { useSettings } from "@/components/shell/settings-context";
import { recordUndo } from "@/components/shell/undo";
import { toast } from "@/components/ui/toast";

import { notify, playChime } from "../chime";
import { clockSnapshot, serverClock, setSkew, subscribeClock } from "../clock";
import type { TimerResult, TimerSnapshot } from "../schema";
import { deleteEntries, restoreEntries, syncTimer, timerCommand } from "../server/actions";
import {
  apply,
  elapsedAt,
  endsAt,
  formatClock,
  formatDuration,
  isRunning,
  phaseLabel,
  targetMs,
  type TimerCommand,
  type TimerDurations,
} from "../timer";

type SendMeta = { task?: TimerSnapshot["task"] };

type TimerContextValue = {
  timer: TimerSnapshot;
  /** Server-aligned time; ticks only while the timer runs. */
  now: number;
  durations: TimerDurations;
  send: (command: TimerCommand, meta?: SendMeta) => Promise<TimerResult | null>;
};

const TimerContext = createContext<TimerContextValue | null>(null);

export function useTimer() {
  const value = use(TimerContext);
  if (!value) throw new Error("useTimer must be used inside <TimerProvider>");
  return value;
}

/** Shown time for any timer view: a countdown, or the stopwatch counting up. */
export function useTimerClock() {
  const { timer, now, durations } = useTimer();
  const target = targetMs(timer, durations);
  const elapsed = elapsedAt(timer, now);
  return {
    target,
    elapsed,
    progress: target === null ? (elapsed % 3_600_000) / 3_600_000 : Math.min(1, elapsed / target),
    clock: formatClock(target === null ? elapsed : target - elapsed, { countUp: target === null }),
  };
}

const noSubscribe = () => () => {};
const TITLE_PREFIX = /^[\d:]+ · [^—]+ — /;
const CHIMED_KEY = "ws-timer-chimed";

/** Only one tab chimes for a given phase end. */
function claimChime(end: number) {
  try {
    if (localStorage.getItem(CHIMED_KEY) === String(end)) return false;
    localStorage.setItem(CHIMED_KEY, String(end));
  } catch {
    // Private mode: chime anyway.
  }
  return true;
}

/**
 * Holds the focus timer for the whole app: optimistic changes, the server round-trip,
 * catching up when a phase ends, other tabs, and the countdown in the tab title.
 */
export function TimerProvider({
  initial,
  serverNow,
  children,
}: {
  initial: TimerSnapshot;
  serverNow: number;
  children: React.ReactNode;
}) {
  const settings = useSettings();
  const durations = useMemo<TimerDurations>(
    () => ({
      focusMinutes: settings.focusMinutes,
      shortBreakMinutes: settings.shortBreakMinutes,
      longBreakMinutes: settings.longBreakMinutes,
      longBreakEvery: settings.longBreakEvery,
      autoStartFocus: settings.autoStartFocus,
    }),
    [
      settings.focusMinutes,
      settings.shortBreakMinutes,
      settings.longBreakMinutes,
      settings.longBreakEvery,
      settings.autoStartFocus,
    ],
  );

  const [timer, setTimer] = useState(initial);
  const [synced, setSynced] = useState(initial);
  // A newer server render wins; an older one would undo a change still in flight.
  if (initial !== synced) {
    setSynced(initial);
    if (initial.version > timer.version) setTimer(initial);
  }

  const latest = useRef(timer);
  useEffect(() => {
    latest.current = timer;
  }, [timer]);

  const channel = useRef<BroadcastChannel | null>(null);
  const seq = useRef(0);

  const adopt = useEffectEvent((next: TimerSnapshot) => {
    if (next.version <= latest.current.version) return;
    latest.current = next;
    setTimer(next);
  });

  const send = useCallback(
    async (command: TimerCommand, meta?: SendMeta): Promise<TimerResult | null> => {
      const prev = latest.current;
      const { state } = apply(prev, command, durations, serverClock());
      const task =
        command.type === "task"
          ? (meta?.task ?? null)
          : state.taskId === prev.taskId
            ? prev.task
            : null;
      const optimistic: TimerSnapshot = { ...state, task, version: prev.version };
      latest.current = optimistic;
      setTimer(optimistic);

      const id = ++seq.current;
      const sentAt = Date.now();
      const rollback = (message: string) => {
        toast({ id: "timer-error", message });
        if (id === seq.current) {
          latest.current = prev;
          setTimer(prev);
        }
      };
      try {
        const result = await timerCommand(command);
        if (!result.ok) {
          rollback(result.error);
          return result;
        }
        setSkew(result.serverNow - (sentAt + Date.now()) / 2);
        if (id === seq.current) {
          latest.current = result.timer;
          setTimer(result.timer);
        }
        channel.current?.postMessage(result.timer);
        return result;
      } catch {
        rollback("Couldn’t reach Wanna Space. Try again.");
        return null;
      }
    },
    [durations],
  );

  const running = isRunning(timer);
  const now = useSyncExternalStore(
    running ? subscribeClock : noSubscribe,
    clockSnapshot,
    () => serverNow,
  );

  /* A phase ran out: settle it on the server, then say so. */
  const end = endsAt(timer, durations);
  const due = end !== null && now >= end;
  const settled = useRef<number | null>(null);
  const onDue = useEffectEvent(async () => {
    if (end === null || settled.current === end) return;
    settled.current = end;
    const before = latest.current;
    const result = await send({ type: "advance" });
    if (!result?.ok) return;
    const seconds = result.logged.reduce((sum, e) => sum + e.seconds, 0);
    const recent = serverClock() - end < 90_000;
    if (!recent) {
      if (seconds)
        toast({ message: `Logged ${formatDuration(seconds)}`, detail: "while you were away" });
      return;
    }
    if (before.mode === "stopwatch") {
      toast({ message: "Stopwatch stopped", detail: "Sessions are capped at 24 hours." });
      return;
    }
    const focusDone = before.phase === "focus";
    const next = phaseLabel[result.timer.phase].toLowerCase();
    const message = focusDone ? "Focus done" : "Break’s over";
    const detail = focusDone
      ? `Time for a ${next}.`
      : isRunning(result.timer)
        ? "The next focus round has started."
        : "Ready for the next round?";
    toast({ id: "timer-phase", message, detail, duration: 8000 });
    if (claimChime(end)) {
      playChime(focusDone ? "focus-done" : "break-done");
      notify(message, detail);
    }
  });
  useEffect(() => {
    if (due) void onDue();
  }, [due]);

  /* Manual finishes can be taken back. */
  const sendWithFeedback = useCallback(
    async (command: TimerCommand, meta?: SendMeta) => {
      const wasFocus = latest.current.phase === "focus";
      const result = await send(command, meta);
      if (command.type !== "finish" || !result?.ok) return result;
      const seconds = result.logged.reduce((sum, e) => sum + e.seconds, 0);
      if (seconds) {
        const logged = result.logged;
        recordUndo(
          {
            label: "Focus session",
            undo: () => void deleteEntries(logged.map((e) => e.id)),
            redo: () => void restoreEntries(logged),
          },
          `Logged ${formatDuration(seconds)}`,
        );
      } else if (wasFocus) {
        toast({ message: "Not logged", detail: "Sessions under a minute aren’t kept." });
      }
      return result;
    },
    [send],
  );

  /* Other tabs, and coming back to this one. */
  useEffect(() => {
    let lastSync = 0;
    const sync = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastSync < 10_000) return;
      lastSync = Date.now();
      const sentAt = Date.now();
      syncTimer()
        .then(({ timer: fresh, serverNow: at }) => {
          setSkew(at - (sentAt + Date.now()) / 2);
          adopt(fresh);
        })
        .catch(() => {});
    };
    if (isRunning(latest.current)) sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);

    const ch = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("ws-timer");
    if (ch) ch.onmessage = (e: MessageEvent<TimerSnapshot>) => adopt(e.data);
    channel.current = ch;
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
      ch?.close();
      channel.current = null;
    };
  }, []);

  /* "18:42 · Focus — Time · Wanna Space" while running. */
  const target = targetMs(timer, durations);
  const elapsed = elapsedAt(timer, now);
  const clock = formatClock(target === null ? elapsed : target - elapsed, {
    countUp: target === null,
  });
  const label = timer.mode === "stopwatch" ? "Stopwatch" : phaseLabel[timer.phase];
  useEffect(() => {
    const base = document.title.replace(TITLE_PREFIX, "");
    document.title = running ? `${clock} · ${label} — ${base}` : base;
  }, [running, clock, label]);
  useEffect(() => () => void (document.title = document.title.replace(TITLE_PREFIX, "")), []);

  const value = useMemo(
    () => ({ timer, now, durations, send: sendWithFeedback }),
    [timer, now, durations, sendWithFeedback],
  );
  return <TimerContext value={value}>{children}</TimerContext>;
}

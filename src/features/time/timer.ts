/**
 * The focus timer as a pure state machine, shared by the server (authoritative, see
 * server/actions.ts) and the client (optimistic). All times are epoch milliseconds.
 * See ADR 0012.
 */

export type TimerMode = "pomodoro" | "stopwatch";
export type TimerPhase = "focus" | "short_break" | "long_break";

export type TimerState = {
  mode: TimerMode;
  phase: TimerPhase;
  taskId: string | null;
  note: string;
  /** Set while running: when the current run began. */
  runStartedAt: number | null;
  /** Time counted before the current run (pauses split runs). */
  elapsedMs: number;
  /** When this focus session first started; the logged entry's start. */
  sessionStartedAt: number | null;
  /** Focus rounds completed since the last long break. */
  rounds: number;
};

export type TimerDurations = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  /** A break that ends while someone's here rolls straight into the next focus round. */
  autoStartFocus?: boolean;
};

/**
 * Auto-start only applies to a break that ended this recently: an open tab catches up
 * within seconds, while a timer left alone overnight shouldn't log focus nobody did.
 */
export const AUTO_START_WINDOW_MS = 60_000;

/** A finished focus session, ready to become a time entry. */
export type LoggedSession = {
  source: TimerMode;
  taskId: string | null;
  note: string;
  startedAt: number;
  endedAt: number;
  seconds: number;
};

export type Transition = { state: TimerState; logged: LoggedSession[] };

/** Shorter sessions aren't worth a row; longer ones are capped (a forgotten stopwatch). */
export const MIN_LOG_MS = 60_000;
export const MAX_SESSION_MS = 86_400_000;

export const IDLE: TimerState = {
  mode: "pomodoro",
  phase: "focus",
  taskId: null,
  note: "",
  runStartedAt: null,
  elapsedMs: 0,
  sessionStartedAt: null,
  rounds: 0,
};

export const isRunning = (s: TimerState) => s.runStartedAt !== null;
export const isIdle = (s: TimerState) => s.runStartedAt === null && s.elapsedMs === 0;
export const isBreak = (s: TimerState) => s.phase !== "focus";

export function elapsedAt(s: TimerState, now: number): number {
  return s.elapsedMs + (s.runStartedAt === null ? 0 : Math.max(0, now - s.runStartedAt));
}

/** The phase's length, or null for the open-ended stopwatch. */
export function targetMs(s: TimerState, d: TimerDurations): number | null {
  if (s.mode === "stopwatch") return null;
  const minutes =
    s.phase === "focus"
      ? d.focusMinutes
      : s.phase === "short_break"
        ? d.shortBreakMinutes
        : d.longBreakMinutes;
  return minutes * 60_000;
}

/** When the running phase ends on its own (pomodoro phases, or the stopwatch's cap). */
export function endsAt(s: TimerState, d: TimerDurations): number | null {
  if (s.runStartedAt === null) return null;
  const limit = targetMs(s, d) ?? MAX_SESSION_MS;
  return s.runStartedAt + Math.max(0, limit - s.elapsedMs);
}

const none = (state: TimerState): Transition => ({ state, logged: [] });

function sessionFor(s: TimerState, endedAt: number, focusMs: number): LoggedSession[] {
  if (s.phase !== "focus" || focusMs < MIN_LOG_MS) return [];
  const seconds = Math.round(Math.min(focusMs, MAX_SESSION_MS) / 1000);
  return [
    {
      source: s.mode,
      taskId: s.taskId,
      note: s.note.trim(),
      startedAt: Math.min(s.sessionStartedAt ?? endedAt - focusMs, endedAt),
      endedAt,
      seconds,
    },
  ];
}

/** Back to a fresh focus session, keeping the mode, task and round count. */
const resetFocus = (s: TimerState, rounds = s.rounds): TimerState => ({
  ...s,
  phase: "focus",
  runStartedAt: null,
  elapsedMs: 0,
  sessionStartedAt: null,
  rounds,
});

/**
 * Ends the current phase at `at` (`now` is the clock). A full pomodoro earns a round and
 * starts a break; a break ends into focus, running if auto-start applies.
 */
function complete(s: TimerState, d: TimerDurations, at: number, now: number): Transition {
  if (isBreak(s)) {
    const focus = resetFocus(s, s.phase === "long_break" ? 0 : s.rounds);
    const autoStart = d.autoStartFocus && now - at <= AUTO_START_WINDOW_MS;
    return none(autoStart ? { ...focus, runStartedAt: at, sessionStartedAt: at } : focus);
  }
  const focusMs = elapsedAt(s, at);
  const logged = sessionFor(s, at, focusMs);
  const target = targetMs(s, d);
  if (target === null || focusMs < target) return { state: { ...resetFocus(s), note: "" }, logged };
  const rounds = s.rounds + 1;
  const phase: TimerPhase = rounds % d.longBreakEvery === 0 ? "long_break" : "short_break";
  return {
    state: {
      ...s,
      phase,
      note: "",
      rounds,
      runStartedAt: at,
      elapsedMs: 0,
      sessionStartedAt: at,
    },
    logged,
  };
}

/**
 * Catches up with the clock: completes every phase that ended by `now`, at its exact
 * end. Breaks end into a paused focus session (or a running one, only if it ended just
 * now), so this settles after a few steps.
 */
export function advance(s: TimerState, d: TimerDurations, now: number): Transition {
  let state = s;
  const logged: LoggedSession[] = [];
  for (let step = 0; step < 4; step++) {
    const end = endsAt(state, d);
    if (end === null || end > now) break;
    const next = complete(state, d, end, now);
    state = next.state;
    logged.push(...next.logged);
  }
  return { state, logged };
}

export function start(s: TimerState, now: number): TimerState {
  if (isRunning(s)) return s;
  return { ...s, runStartedAt: now, sessionStartedAt: s.sessionStartedAt ?? now };
}

export function pause(s: TimerState, now: number): TimerState {
  if (!isRunning(s)) return s;
  return { ...s, elapsedMs: elapsedAt(s, now), runStartedAt: null };
}

/** "Finish" logs the focus so far; on a break it means "skip the break". */
export function finish(s: TimerState, d: TimerDurations, now: number): Transition {
  if (isIdle(s) && !isBreak(s)) return none(s);
  return complete(s, d, now, now);
}

/** Throws the current session away without logging it. */
export function discard(s: TimerState): TimerState {
  return resetFocus(s, s.phase === "long_break" ? 0 : s.rounds);
}

/** Switching between pomodoro and stopwatch only happens between sessions. */
export function setMode(s: TimerState, mode: TimerMode): TimerState {
  if (!isIdle(s) || isBreak(s)) return s;
  return { ...s, mode };
}

/** Clamps the number of rounds shown when the setting shrinks mid-cycle. */
export const roundsInCycle = (s: TimerState, d: TimerDurations) =>
  s.rounds === 0 ? 0 : ((s.rounds - 1) % d.longBreakEvery) + 1;

export type TimerCommand =
  | { type: "start" }
  | { type: "pause" }
  | { type: "finish" }
  | { type: "discard" }
  | { type: "advance" }
  | { type: "mode"; mode: TimerMode }
  | { type: "task"; taskId: string | null }
  | { type: "note"; note: string };

/** Applies a command after catching up with the clock. */
export function apply(
  s: TimerState,
  command: TimerCommand,
  d: TimerDurations,
  now: number,
): Transition {
  const caught = advance(s, d, now);
  const next = (state: TimerState): Transition => ({ state, logged: caught.logged });
  const base = caught.state;
  switch (command.type) {
    case "advance":
      return caught;
    case "start":
      return next(start(base, now));
    case "pause":
      return next(pause(base, now));
    case "discard":
      return next(discard(base));
    case "mode":
      return next(setMode(base, command.mode));
    case "task":
      return next({ ...base, taskId: command.taskId });
    case "note":
      return next({ ...base, note: command.note });
    case "finish": {
      const done = finish(base, d, now);
      return { state: done.state, logged: [...caught.logged, ...done.logged] };
    }
  }
}

/** "25:00", "1:04:09". Countdowns round up so they never show 00:00 early. */
export function formatClock(ms: number, { countUp = false } = {}): string {
  const total = Math.max(0, countUp ? Math.floor(ms / 1000) : Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** "45m", "1h 30m", "2h". */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export const phaseLabel: Record<TimerPhase, string> = {
  focus: "Focus",
  short_break: "Short break",
  long_break: "Long break",
};

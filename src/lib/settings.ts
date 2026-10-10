import type { RoomId } from "@/config/rooms";

/**
 * Preferences, in two kinds:
 * - Account settings follow the user to every device (stored in `user_settings`).
 * - Device preferences belong to this browser (localStorage, applied before paint).
 */

export type WeekStart = 0 | 1 | 6;
export type TimeFormat = "12h" | "24h";

export type AccountSettings = {
  weekStartsOn: WeekStart;
  timeFormat: TimeFormat;
  /** Focus timer lengths, in minutes, and how many focus rounds earn a long break. */
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  /** A break that ends while you're here starts the next focus round. */
  autoStartFocus: boolean;
  /** Minutes of focus to aim for each day; 0 = no goal. */
  dailyFocusGoal: number;
  /** The room the app opens on. */
  startRoom: RoomId;
  /** Rooms left out of the sidebar and the mobile bar. */
  hiddenRooms: RoomId[];
  /** Where quick capture files a task without a #project; null = the Inbox. */
  captureProjectId: string | null;
  /** The stages a new project's Orbit board starts with. */
  defaultStages: string[];
};

export const DEFAULT_STAGES = ["To do", "In progress", "Review"];

export const DEFAULT_SETTINGS: AccountSettings = {
  weekStartsOn: 6,
  timeFormat: "12h",
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  autoStartFocus: false,
  dailyFocusGoal: 0,
  startRoom: "today",
  hiddenRooms: [],
  captureProjectId: null,
  defaultStages: DEFAULT_STAGES,
};

export const WEEK_STARTS: WeekStart[] = [6, 0, 1];

/** The choices offered in Settings (the server accepts any value in range). */
export const TIMER_CHOICES = {
  focusMinutes: [15, 25, 30, 45, 50, 60, 90],
  shortBreakMinutes: [3, 5, 10, 15],
  longBreakMinutes: [10, 15, 20, 30],
  longBreakEvery: [2, 3, 4, 5, 6],
} as const;

export const FOCUS_GOAL_CHOICES = [0, 60, 120, 180, 240, 300, 360];

/** Allowed ranges, shared by the database checks and the settings action. */
export const TIMER_LIMITS = {
  focusMinutes: [5, 180],
  shortBreakMinutes: [1, 60],
  longBreakMinutes: [1, 90],
  longBreakEvery: [2, 12],
  dailyFocusGoal: [0, 720],
} as const;

export const STAGE_LIMITS = { count: 8, nameLength: 40 } as const;

export type SettingsSection =
  | "general"
  | "appearance"
  | "notifications"
  | "tasks"
  | "orbit"
  | "time"
  | "profile"
  | "security"
  | "data"
  | "shortcuts";

/** App-wide "open settings" request (⌘, / Ctrl+,, the sidebar, menus, the palette). */
export const SETTINGS_EVENT = "ws:settings";

export function requestSettings(section?: SettingsSection) {
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: section }));
}

/* Device preferences ------------------------------------------------------------------ */

export type DevicePrefs = {
  reduceMotion: boolean;
  keyboardHints: boolean;
  /** The chime when a focus phase ends. */
  timerSound: boolean;
  /** A soft tick when a task is completed. */
  completionSound: boolean;
  /** Task lists open with Completed expanded. */
  showCompleted: boolean;
};

type StoredPref = { key: string; on: string | null; fallback: boolean };

/** How each preference is stored: the value written when it differs from the default. */
const STORED: Record<"timerSound" | "completionSound" | "showCompleted", StoredPref> = {
  timerSound: { key: "ws-timer-sound", on: null, fallback: true },
  completionSound: { key: "ws-done-sound", on: "on", fallback: false },
  showCompleted: { key: "ws-show-completed", on: "on", fallback: false },
};

const MOTION_KEY = "ws-motion";
const HINTS_KEY = "ws-hints";
export const DEVICE_PREFS_EVENT = "ws-device-prefs";

/** Inlined in <head> next to the theme script, so the first paint is already right. */
export const devicePrefsInitScript = `(function(){try{var d=document.documentElement.dataset;if(localStorage.getItem("${MOTION_KEY}")==="reduced")d.motion="reduced";if(localStorage.getItem("${HINTS_KEY}")==="off")d.hints="off";}catch(e){}})();`;

function readStored({ key, on, fallback }: StoredPref) {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return on === null ? value !== "off" : value === on;
  } catch {
    return fallback;
  }
}

export function readDevicePrefs(): DevicePrefs {
  const d = document.documentElement.dataset;
  return {
    reduceMotion: d.motion === "reduced",
    keyboardHints: d.hints !== "off",
    timerSound: readStored(STORED.timerSound),
    completionSound: readStored(STORED.completionSound),
    showCompleted: readStored(STORED.showCompleted),
  };
}

export const SERVER_DEVICE_PREFS: DevicePrefs = {
  reduceMotion: false,
  keyboardHints: true,
  timerSound: true,
  completionSound: false,
  showCompleted: false,
};

export function setDevicePref<K extends keyof DevicePrefs>(key: K, value: DevicePrefs[K]) {
  const d = document.documentElement.dataset;
  if (key === "reduceMotion") {
    if (value) {
      localStorage.setItem(MOTION_KEY, "reduced");
      d.motion = "reduced";
    } else {
      localStorage.removeItem(MOTION_KEY);
      delete d.motion;
    }
  } else if (key === "keyboardHints") {
    if (value) {
      localStorage.removeItem(HINTS_KEY);
      delete d.hints;
    } else {
      localStorage.setItem(HINTS_KEY, "off");
      d.hints = "off";
    }
  } else {
    const pref = STORED[key as keyof typeof STORED];
    if (value === pref.fallback) localStorage.removeItem(pref.key);
    else localStorage.setItem(pref.key, pref.on ?? "off");
  }
  window.dispatchEvent(new Event(DEVICE_PREFS_EVENT));
}

export function subscribeDevicePrefs(onChange: () => void) {
  window.addEventListener(DEVICE_PREFS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(DEVICE_PREFS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

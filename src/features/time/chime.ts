/** The end-of-phase chime (its on/off switch is a device preference in lib/settings). */

import { readDevicePrefs } from "@/lib/settings";
import { playTones, SOUNDS } from "@/lib/sound";

/** Two soft bell tones; focus ending rises, a break ending falls back. */
export function playChime(kind: "focus-done" | "break-done") {
  if (readDevicePrefs().timerSound) playTones(SOUNDS[kind]);
}

/** Shows a system notification when the tab is in the background and it's allowed. */
export function notify(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  if (!document.hidden) return;
  try {
    new Notification(title, { body, tag: "ws-timer" });
  } catch {
    // Some mobile browsers only allow notifications from a service worker.
  }
}

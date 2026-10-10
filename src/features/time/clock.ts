/**
 * A client clock aligned with the server's (the timer's times are server times), shared
 * by every timer view. It only ticks while something subscribes, i.e. while running.
 */

let skew = 0;
let current = 0;
let interval: number | undefined;
const listeners = new Set<() => void>();

/** Server time ≈ local time + skew, measured around each timer request. */
export function setSkew(ms: number) {
  skew = Math.abs(ms) < 1500 ? 0 : ms;
}

export const serverClock = () => Date.now() + skew;

export function subscribeClock(listener: () => void) {
  listeners.add(listener);
  if (interval === undefined) {
    current = serverClock();
    interval = window.setInterval(() => {
      current = serverClock();
      listeners.forEach((l) => l());
    }, 250);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.clearInterval(interval);
      interval = undefined;
    }
  };
}

export const clockSnapshot = () => (current ||= serverClock());

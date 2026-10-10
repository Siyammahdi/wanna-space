import { useSyncExternalStore } from "react";

/**
 * Split view: on wide screens an open side panel takes the right half of the content
 * area and the page slides into the left half (`html[data-split]`, see globals.css).
 */
export const SPLIT_QUERY = "(min-width: 64rem)";

let claims = 0;

/** Marks the page as split until the returned release is called. */
export function claimSplitView() {
  claims += 1;
  document.documentElement.dataset.split = "";
  let released = false;
  return () => {
    if (released) return;
    released = true;
    claims = Math.max(0, claims - 1);
    if (claims === 0) delete document.documentElement.dataset.split;
  };
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(SPLIT_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** True where panels split the screen instead of covering it. */
export function useSplitScreen() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(SPLIT_QUERY).matches,
    () => false,
  );
}

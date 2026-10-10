/**
 * App-wide "capture a task" request. An inline capture surface on the current page
 * (e.g. the Tasks add bar) can claim it with preventDefault(); otherwise the global
 * capture dialog opens.
 */
export const QUICK_CAPTURE_EVENT = "ws:quick-capture";

export function requestQuickCapture() {
  window.dispatchEvent(new CustomEvent(QUICK_CAPTURE_EVENT, { cancelable: true }));
}

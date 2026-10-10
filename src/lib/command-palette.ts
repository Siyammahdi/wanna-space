/** App-wide "open the command palette" request (⌘K / Ctrl+K, or the sidebar's Search). */
export const COMMAND_PALETTE_EVENT = "ws:command-palette";

export function requestCommandPalette() {
  window.dispatchEvent(new Event(COMMAND_PALETTE_EVENT));
}

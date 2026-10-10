"use client";

import { useSyncExternalStore } from "react";

import {
  readDevicePrefs,
  SERVER_DEVICE_PREFS,
  subscribeDevicePrefs,
  type DevicePrefs,
} from "./settings";

/** One device preference, live (the server render assumes the defaults). */
export function useDevicePref<K extends keyof DevicePrefs>(key: K): DevicePrefs[K] {
  return useSyncExternalStore(
    subscribeDevicePrefs,
    () => readDevicePrefs()[key],
    () => SERVER_DEVICE_PREFS[key],
  );
}

"use client";

import { createContext, use, useState } from "react";

import { DEFAULT_SETTINGS, type AccountSettings } from "@/lib/settings";

type SettingsState = {
  settings: AccountSettings;
  /** Optimistic: the settings dialog applies a change here before the server confirms it. */
  setSettings: (next: AccountSettings) => void;
};

const SettingsContext = createContext<SettingsState>({
  settings: DEFAULT_SETTINGS,
  setSettings: () => {},
});

export function SettingsProvider({
  initial,
  children,
}: {
  initial: AccountSettings;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState(initial);
  const [synced, setSynced] = useState(initial);
  // A fresh server render is the source of truth again.
  const keys = Object.keys(initial) as (keyof AccountSettings)[];
  const same = (a: unknown, b: unknown) =>
    Array.isArray(a) && Array.isArray(b) ? a.join("\u0000") === b.join("\u0000") : a === b;
  if (keys.some((key) => !same(initial[key], synced[key]))) {
    setSynced(initial);
    setSettings(initial);
  }
  return <SettingsContext value={{ settings, setSettings }}>{children}</SettingsContext>;
}

export const useSettings = () => use(SettingsContext).settings;
export const useSettingsState = () => use(SettingsContext);

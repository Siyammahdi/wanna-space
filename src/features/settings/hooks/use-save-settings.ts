"use client";

import { startTransition } from "react";

import { useSettingsState } from "@/components/shell/settings-context";
import { toast } from "@/components/ui/toast";
import type { AccountSettings } from "@/lib/settings";

import { updateSettings } from "../server/actions";

/** Applies a change at once and rolls it back if the server says no. */
export function useSaveSettings() {
  const { settings, setSettings } = useSettingsState();
  return (patch: Partial<AccountSettings>) => {
    const prev = settings;
    setSettings({ ...prev, ...patch });
    startTransition(async () => {
      const result = await updateSettings(patch).catch(() => ({
        ok: false as const,
        error: "Couldn’t save that. Check your connection and try again.",
      }));
      if (!result.ok) {
        setSettings(prev);
        toast({ id: "settings", message: result.error });
      }
    });
  };
}

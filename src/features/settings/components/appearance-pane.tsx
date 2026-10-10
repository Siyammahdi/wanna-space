"use client";

import { useSyncExternalStore } from "react";

import { useSettings } from "@/components/shell/settings-context";
import { setThemePreference, useThemePreference } from "@/components/theme/theme-switcher";
import { Switch } from "@/components/ui/switch";
import { rooms } from "@/config/rooms";
import { cn } from "@/lib/cn";
import { setDevicePref } from "@/lib/settings";
import type { ThemePreference } from "@/lib/theme";
import { useDevicePref } from "@/lib/use-device-pref";

import { useSaveSettings } from "../hooks/use-save-settings";
import { Group, PaneHeader, RadioCards, RadioDot, SwitchRow } from "./parts";

const THEMES: ThemePreference[] = ["light", "dark", "system"];
const themeLabel: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia(REDUCED_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function AppearancePane() {
  const theme = useThemePreference();
  const reduceMotion = useDevicePref("reduceMotion");
  const keyboardHints = useDevicePref("keyboardHints");
  const systemReduces = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );

  return (
    <>
      <PaneHeader
        title="Appearance"
        description="Make your space look and feel the way you like."
      />

      <Group label="Theme" note="This device">
        <RadioCards
          label="Theme"
          value={theme}
          options={THEMES}
          onChange={setThemePreference}
          className="grid grid-cols-3 gap-2"
        >
          {(option, checked) => (
            <>
              <span className="relative block aspect-[16/10] w-full overflow-hidden rounded-lg">
                {option === "system" ? (
                  <>
                    <ThemePreview theme="light" />
                    <ThemePreview theme="dark" split />
                  </>
                ) : (
                  <ThemePreview theme={option} />
                )}
              </span>
              <span className="mt-2.5 flex items-center gap-2 px-0.5">
                <RadioDot checked={checked} />
                <span className="text-[13px] font-medium text-ink">{themeLabel[option]}</span>
              </span>
            </>
          )}
        </RadioCards>
      </Group>

      <Group label="Motion and hints" note="This device">
        <SwitchRow
          title="Reduce motion"
          description={
            systemReduces
              ? "Your system already asks for less motion, so animations are calmed everywhere."
              : "Calms springs, slides and transitions across the app."
          }
          checked={reduceMotion || systemReduces}
          disabled={systemReduces}
          onCheckedChange={(on) => setDevicePref("reduceMotion", on)}
        />
        <SwitchRow
          title="Show keyboard hints"
          description="Shortcut badges in the sidebar, in menus and under task lists."
          checked={keyboardHints}
          onCheckedChange={(on) => setDevicePref("keyboardHints", on)}
        />
      </Group>

      <SidebarRooms />
    </>
  );
}

/** Which rooms the sidebar and the mobile bar show. The start page always stays. */
function SidebarRooms() {
  const { startRoom, hiddenRooms } = useSettings();
  const save = useSaveSettings();

  return (
    <Group label="Rooms in the sidebar" note="Synced to your account">
      <div className="rounded-xl bg-surface p-1.5">
        {rooms.map((room) => {
          const Icon = room.icon;
          const isStart = room.id === startRoom;
          const shown = !hiddenRooms.includes(room.id);
          const labelId = `sidebar-room-${room.id}`;
          return (
            <div
              key={room.id}
              className="flex h-11 items-center gap-3 rounded-lg px-2.5 transition-colors hover:bg-surface-hover/50"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md transition-opacity",
                  room.tone.soft,
                  !shown && "opacity-45",
                )}
              >
                <Icon className={cn("size-4", room.tone.text)} strokeWidth={1.9} />
              </span>
              <span
                id={labelId}
                className={cn(
                  "flex-1 text-[13.5px] font-medium",
                  shown ? "text-ink" : "text-ink-subtle",
                )}
              >
                {room.label}
              </span>
              {isStart && <span className="text-[12px] text-ink-faint">Start page</span>}
              <Switch
                aria-labelledby={labelId}
                checked={shown}
                disabled={isStart}
                onCheckedChange={(on) =>
                  save({
                    hiddenRooms: on
                      ? hiddenRooms.filter((r) => r !== room.id)
                      : [...hiddenRooms, room.id],
                  })
                }
              />
            </div>
          );
        })}
      </div>
    </Group>
  );
}

/** A miniature of the app drawn with the real tokens of that theme. */
function ThemePreview({ theme, split = false }: { theme: "light" | "dark"; split?: boolean }) {
  return (
    <span
      aria-hidden
      data-theme={theme}
      style={split ? { clipPath: "polygon(100% 0, 100% 100%, 0 100%)" } : undefined}
      className="absolute inset-0 flex gap-1 bg-canvas p-1.5"
    >
      <span className="flex w-[30%] flex-col gap-1 rounded-[5px] bg-surface-sunken p-1.5">
        <span className="h-1 w-4/5 rounded-full bg-accent" />
        <span className="h-1 w-3/5 rounded-full bg-ink-faint/70" />
        <span className="h-1 w-2/3 rounded-full bg-ink-faint/70" />
      </span>
      <span className="flex flex-1 flex-col gap-1 rounded-[5px] bg-surface p-1.5">
        <span className="h-1.5 w-1/2 rounded-full bg-ink/75" />
        <span className="h-1 w-4/5 rounded-full bg-ink-faint/60" />
        <span className="h-1 w-3/5 rounded-full bg-ink-faint/60" />
        <span className="mt-auto ml-auto h-2 w-5 rounded-full bg-accent" />
      </span>
    </span>
  );
}

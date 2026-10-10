"use client";

import { useSyncExternalStore } from "react";

import { useSettings } from "@/components/shell/settings-context";
import { getRoom, ROOM_IDS } from "@/config/rooms";
import { cn } from "@/lib/cn";
import { WEEK_STARTS, type TimeFormat, type WeekStart } from "@/lib/settings";

import { useSaveSettings } from "../hooks/use-save-settings";
import { Group, PaneHeader, RadioCards, RadioDot, Row } from "./parts";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_FORMATS: TimeFormat[] = ["12h", "24h"];
const timeSample: Record<TimeFormat, { label: string; sample: string }> = {
  "12h": { label: "12-hour", sample: "5:30pm" },
  "24h": { label: "24-hour", sample: "17:30" },
};

const noSubscribe = () => () => {};

export function GeneralPane() {
  const settings = useSettings();
  const save = useSaveSettings();
  const timeZone = useSyncExternalStore(
    noSubscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "",
  );

  return (
    <>
      <PaneHeader
        title="General"
        description="Where your space opens, and how days, weeks and times read."
      />

      <Group label="Start page" note="Synced to your account">
        <RadioCards
          label="Start page"
          value={settings.startRoom}
          options={ROOM_IDS}
          onChange={(startRoom) =>
            startRoom !== settings.startRoom &&
            save({ startRoom, hiddenRooms: settings.hiddenRooms.filter((r) => r !== startRoom) })
          }
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          optionClassName={(checked) =>
            cn(
              "flex items-center gap-2.5 rounded-xl bg-surface p-3 text-left transition-[background-color,box-shadow,transform] duration-200 active:scale-[0.985]",
              checked ? "ring-2 ring-accent" : "hover:bg-surface-hover",
            )
          }
        >
          {(id) => {
            const room = getRoom(id);
            const Icon = room.icon;
            return (
              <>
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md",
                    room.tone.soft,
                  )}
                >
                  <Icon className={cn("size-4", room.tone.text)} strokeWidth={1.9} />
                </span>
                <span className="text-[13px] font-medium text-ink">{room.label}</span>
              </>
            );
          }}
        </RadioCards>
      </Group>

      <Group label="Week starts on" note="Synced to your account">
        <RadioCards
          label="Week starts on"
          value={settings.weekStartsOn}
          options={WEEK_STARTS}
          onChange={(weekStartsOn) =>
            weekStartsOn !== settings.weekStartsOn && save({ weekStartsOn })
          }
          className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          {(start, checked) => (
            <>
              <span className="flex w-full items-center justify-between gap-2">
                <WeekStrip start={start} checked={checked} />
                <RadioDot checked={checked} />
              </span>
              <span className="mt-3 text-[13.5px] font-medium text-ink">{DAY_NAMES[start]}</span>
              <span className="mt-0.5 text-[12px] text-ink-subtle">
                {DAY_NAMES[start]} to {DAY_NAMES[(start + 6) % 7]}
              </span>
            </>
          )}
        </RadioCards>
      </Group>

      <Group label="Time format" note="Synced to your account">
        <RadioCards
          label="Time format"
          value={settings.timeFormat}
          options={TIME_FORMATS}
          onChange={(timeFormat) => timeFormat !== settings.timeFormat && save({ timeFormat })}
          className="grid grid-cols-2 gap-2"
        >
          {(format, checked) => (
            <>
              <span className="flex w-full items-start justify-between gap-2">
                <span className="font-heading text-[22px] leading-none font-semibold tracking-[-0.02em] text-ink tabular-nums">
                  {timeSample[format].sample}
                </span>
                <RadioDot checked={checked} />
              </span>
              <span className="mt-3 text-[12.5px] text-ink-subtle">{timeSample[format].label}</span>
            </>
          )}
        </RadioCards>
      </Group>

      <Group label="Time zone">
        <Row
          title="Follows this device"
          description="So “today” and “tomorrow” always mean your today and tomorrow."
          control={
            <span className="max-w-[45%] truncate text-right text-[13px] font-medium text-ink-muted">
              {timeZone.replaceAll("_", " ")}
            </span>
          }
        />
      </Group>
    </>
  );
}

/** Seven day initials with the first one marked: a tiny picture of the week. */
function WeekStrip({ start, checked }: { start: WeekStart; checked: boolean }) {
  return (
    <span aria-hidden className="flex gap-0.5">
      {Array.from({ length: 7 }, (_, i) => (start + i) % 7).map((day, i) => (
        <span
          key={day}
          className={cn(
            "flex size-4 items-center justify-center rounded-[4px] text-[9.5px] font-semibold transition-colors duration-200",
            i === 0
              ? checked
                ? "bg-accent text-accent-contrast"
                : "bg-accent-soft text-accent-ink"
              : "bg-surface-sunken text-ink-subtle",
          )}
        >
          {DAY_NAMES[day]![0]}
        </span>
      ))}
    </span>
  );
}

"use client";

import { useSettings } from "@/components/shell/settings-context";
import { FOCUS_GOAL_CHOICES, TIMER_CHOICES } from "@/lib/settings";

import { useSaveSettings } from "../hooks/use-save-settings";
import { ChoiceRow, Group, PaneHeader, SwitchRow } from "./parts";

const minutes = (m: number) => `${m} min`;
const hours = (m: number) =>
  m === 0 ? "None" : m % 60 ? `${(m / 60).toFixed(1)} h` : `${m / 60} h`;

export function TimePane() {
  const settings = useSettings();
  const save = useSaveSettings();

  return (
    <>
      <PaneHeader title="Time" description="Your focus rhythm and what a good day looks like." />

      <Group label="Focus timer" note="Synced to your account">
        <ChoiceRow
          title="Focus"
          description="How long one pomodoro lasts."
          value={settings.focusMinutes}
          choices={TIMER_CHOICES.focusMinutes}
          format={minutes}
          onChange={(focusMinutes) => save({ focusMinutes })}
        />
        <ChoiceRow
          title="Short break"
          description="Starts on its own after each focus round."
          value={settings.shortBreakMinutes}
          choices={TIMER_CHOICES.shortBreakMinutes}
          format={minutes}
          onChange={(shortBreakMinutes) => save({ shortBreakMinutes })}
        />
        <ChoiceRow
          title="Long break"
          description="A longer rest once a full set of rounds is done."
          value={settings.longBreakMinutes}
          choices={TIMER_CHOICES.longBreakMinutes}
          format={minutes}
          onChange={(longBreakMinutes) => save({ longBreakMinutes })}
        />
        <ChoiceRow
          title="Rounds before a long break"
          value={settings.longBreakEvery}
          choices={TIMER_CHOICES.longBreakEvery}
          format={String}
          onChange={(longBreakEvery) => save({ longBreakEvery })}
        />
        <SwitchRow
          title="Start the next focus round on its own"
          description="When a break ends, focus picks up again. Only if the break ended in the last minute, so a forgotten timer never logs time you weren’t there for."
          checked={settings.autoStartFocus}
          onCheckedChange={(autoStartFocus) => save({ autoStartFocus })}
        />
      </Group>

      <Group label="Daily goal" note="Synced to your account">
        <ChoiceRow
          title="Focus each day"
          description="Shown as a progress bar on today’s summary in Time."
          value={settings.dailyFocusGoal}
          choices={FOCUS_GOAL_CHOICES}
          format={hours}
          onChange={(dailyFocusGoal) => save({ dailyFocusGoal })}
        />
      </Group>
    </>
  );
}

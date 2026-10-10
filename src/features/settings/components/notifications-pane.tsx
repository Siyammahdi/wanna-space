"use client";

import { Play } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { setDevicePref } from "@/lib/settings";
import { playTones, SOUNDS } from "@/lib/sound";
import { useDevicePref } from "@/lib/use-device-pref";

import { Group, PaneHeader, Row, SwitchRow } from "./parts";

const noSubscribe = () => () => {};
const readPermission = () =>
  typeof Notification === "undefined" ? "unsupported" : Notification.permission;

export function NotificationsPane() {
  const timerSound = useDevicePref("timerSound");
  const completionSound = useDevicePref("completionSound");

  return (
    <>
      <PaneHeader
        title="Notifications"
        description="How your space gets your attention, and when it stays quiet."
      />

      <Group label="Sounds" note="This device">
        <SwitchRow
          title={<SoundTitle label="Timer chime" sound="focus-done" />}
          description="Two soft bells when a focus round or a break ends."
          checked={timerSound}
          onCheckedChange={(on) => setDevicePref("timerSound", on)}
        />
        <SwitchRow
          title={<SoundTitle label="Completion tick" sound="complete" />}
          description="A light tick each time you finish a task."
          checked={completionSound}
          onCheckedChange={(on) => setDevicePref("completionSound", on)}
        />
      </Group>

      <Group label="System notifications" note="This browser">
        <PermissionRow />
      </Group>
    </>
  );
}

function SoundTitle({ label, sound }: { label: string; sound: keyof typeof SOUNDS }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <button
        type="button"
        onClick={() => playTones(SOUNDS[sound])}
        aria-label={`Play the ${label.toLowerCase()}`}
        title="Play"
        className="flex size-6 items-center justify-center rounded-full text-ink-subtle transition-[color,background-color,transform] hover:bg-surface-hover hover:text-ink active:scale-90"
      >
        <Play className="size-3" fill="currentColor" />
      </button>
    </span>
  );
}

function PermissionRow() {
  const initial = useSyncExternalStore(noSubscribe, readPermission, () => "unsupported");
  const [asked, setAsked] = useState<NotificationPermission | null>(null);
  const permission = asked ?? initial;

  const description = {
    unsupported: "This browser can’t show system notifications.",
    granted: "When the timer ends while this tab is in the background, you’ll get a notification.",
    denied: "Blocked in your browser’s site settings. Allow notifications there to turn them on.",
    default: "Get a notification when the timer ends while this tab is in the background.",
  }[permission];

  return (
    <Row
      title="Timer alerts"
      description={description}
      control={
        permission === "default" ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => setAsked(await Notification.requestPermission())}
          >
            Allow
          </Button>
        ) : permission === "granted" ? (
          <span className="text-[13px] font-medium text-success">On</span>
        ) : permission === "denied" ? (
          <span className="text-[13px] font-medium text-ink-subtle">Blocked</span>
        ) : null
      }
    />
  );
}

"use client";

import { Plus, Search, Settings } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { Logo } from "@/components/brand/logo";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Kbd } from "@/components/ui/kbd";
import { useSettings } from "@/components/shell/settings-context";
import { rooms, type RoomId } from "@/config/rooms";
import { cn } from "@/lib/cn";
import { requestCommandPalette } from "@/lib/command-palette";
import { modKey } from "@/lib/keyboard";
import { spring } from "@/lib/motion";
import { requestQuickCapture } from "@/lib/quick-capture";
import { requestSettings } from "@/lib/settings";

const noSubscribe = () => () => {};

export const isActive = (href: string, pathname: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

/** Rooms in the nav: hidden ones are left out, unless you're in one right now. */
export const shownRooms = (hidden: RoomId[], pathname: string) =>
  rooms.filter((room) => !hidden.includes(room.id) || isActive(room.href, pathname));

/**
 * Where the nav should point: the room a click is heading to, from the moment of
 * the click, so the highlight never waits on the network. Falls back to the URL
 * once it changes (or if the navigation goes somewhere else).
 */
export function useNavTarget() {
  const pathname = usePathname();
  const [pending, setPending] = useState<{ from: string; to: string } | null>(null);
  const target = pending?.from === pathname ? pending.to : pathname;
  const navigate = (to: string) => setPending({ from: pathname, to });
  return { pathname, target, navigate };
}

export function Sidebar({
  account,
  timer,
}: {
  account: React.ReactNode;
  /** The running focus timer (from the Time feature). */
  timer?: React.ReactNode;
}) {
  const { pathname, target, navigate } = useNavTarget();
  const { hiddenRooms } = useSettings();
  const modKeyLabel = useSyncExternalStore(
    noSubscribe,
    () => modKey("K"),
    () => "⌘K",
  );
  const settingsKeyLabel = useSyncExternalStore(
    noSubscribe,
    () => modKey(","),
    () => "⌘,",
  );

  return (
    <aside className="sticky top-0 hidden h-dvh w-(--sidebar-width) shrink-0 flex-col bg-surface-sunken/70 px-3 pt-4 pb-3 md:flex">
      <Link href="/start" className="mb-5 flex items-center rounded-md px-2 py-1">
        <Logo />
      </Link>

      <div className="mb-4 flex flex-col gap-1">
        <ShellAction
          icon={<Plus />}
          label="Quick capture"
          shortcut="C"
          onClick={requestQuickCapture}
        />
        <ShellAction
          icon={<Search />}
          label="Search"
          shortcut={modKeyLabel}
          onClick={requestCommandPalette}
        />
        <ShellAction
          icon={<Settings />}
          label="Settings"
          shortcut={settingsKeyLabel}
          onClick={() => requestSettings()}
        />
      </div>

      <p className="mb-1.5 px-2.5 text-[11px] font-medium tracking-[0.08em] text-ink-faint uppercase">
        Rooms
      </p>

      <nav className="flex flex-col gap-0.5">
        {shownRooms(hiddenRooms, pathname).map((room) => {
          const active = isActive(room.href, target);
          const Icon = room.icon;
          return (
            <Link
              key={room.id}
              href={room.href}
              onNavigate={() => navigate(room.href)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-9 items-center gap-3 rounded-md px-2.5 text-sm transition-colors",
                active ? "text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  transition={spring.glide}
                  className="absolute inset-0 rounded-md bg-surface-raised"
                />
              )}
              <span
                className={cn(
                  "relative flex size-6 items-center justify-center rounded-sm transition-[background-color,transform] duration-300 ease-spring group-hover:scale-110 group-active:scale-95",
                  active ? room.tone.soft : "group-hover:bg-surface-hover",
                )}
              >
                <Icon
                  className={cn(
                    "size-[15px] transition-colors",
                    active ? room.tone.text : "text-ink-subtle group-hover:text-ink-muted",
                  )}
                />
              </span>
              <span className="relative font-medium">{room.label}</span>
              {room.status === "planned" && (
                <span className="relative ml-auto size-1.5 rounded-full bg-ink-faint/50" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        {timer}
        <ThemeSwitcher />
        {account}
      </div>
    </aside>
  );
}

function ShellAction({
  icon,
  label,
  shortcut,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={!onClick || undefined}
      title={onClick ? label : `${label} — coming soon`}
      className="flex h-8 items-center gap-3 rounded-md px-2.5 text-[13px] text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink [&_svg]:size-[15px]"
    >
      <span className="flex size-6 items-center justify-center">{icon}</span>
      {label}
      <Kbd data-kbd-hints className="ml-auto">
        {shortcut}
      </Kbd>
    </button>
  );
}

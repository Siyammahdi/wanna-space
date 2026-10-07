"use client";

import { Plus, Search } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { Kbd } from "@/components/ui/kbd";
import { rooms } from "@/config/rooms";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-(--sidebar-width) shrink-0 flex-col border-r border-line bg-surface/60 px-3 pt-4 pb-3 md:flex">
      <Link href="/" className="mb-5 flex items-center rounded-md px-2 py-1">
        <Logo />
      </Link>

      <div className="mb-4 flex flex-col gap-1">
        <ShellAction icon={<Plus />} label="Quick capture" shortcut="C" />
        <ShellAction icon={<Search />} label="Search" shortcut="⌘K" />
      </div>

      <p className="mb-1.5 px-2.5 text-[11px] font-medium tracking-[0.08em] text-ink-faint uppercase">
        Rooms
      </p>

      <nav className="flex flex-col gap-0.5">
        {rooms.map((room) => {
          const active = pathname === room.href || pathname.startsWith(`${room.href}/`);
          const Icon = room.icon;
          return (
            <Link
              key={room.id}
              href={room.href}
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
                  className="absolute inset-0 rounded-md border border-line bg-surface-raised shadow-sm"
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
        <ThemeSwitcher />
        <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-accent-soft font-display text-[13px] font-semibold text-accent-ink">
            G
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-medium text-ink">Guest</p>
            <p className="truncate text-[11px] text-ink-subtle">Sign-in arrives in Phase 1</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function ShellAction({
  icon,
  label,
  shortcut,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut: string;
}) {
  return (
    <button
      type="button"
      aria-disabled
      title={`${label} — coming soon`}
      className="flex h-8 items-center gap-3 rounded-md px-2.5 text-[13px] text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink [&_svg]:size-[15px]"
    >
      <span className="flex size-6 items-center justify-center">{icon}</span>
      {label}
      <Kbd className="ml-auto">{shortcut}</Kbd>
    </button>
  );
}

"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useSyncExternalStore } from "react";

import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";
import { applyTheme, readThemePreference, type ThemePreference } from "@/lib/theme";

const THEME_EVENT = "ws-theme-change";

const options: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
];

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setThemePreference(value: ThemePreference) {
  applyTheme(value);
  window.dispatchEvent(new Event(THEME_EVENT));
}

export const useThemePreference = () =>
  useSyncExternalStore(subscribe, readThemePreference, () => "system" as const);

export function ThemeSwitcher({ className }: { className?: string }) {
  const preference = useThemePreference();

  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => applyTheme("system");
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [preference]);

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn("flex items-center gap-0.5 rounded-md bg-surface-hover/70 p-0.5", className)}
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setThemePreference(value)}
            className={cn(
              "relative flex h-7 flex-1 items-center justify-center rounded-sm transition-colors",
              active ? "text-ink" : "text-ink-subtle hover:text-ink-muted",
            )}
          >
            {active && (
              <motion.span
                layoutId="theme-switcher-pill"
                transition={spring.glide}
                className="absolute inset-0 rounded-sm bg-surface-raised"
              />
            )}
            <Icon className="relative size-3.5" />
          </button>
        );
      })}
    </div>
  );
}

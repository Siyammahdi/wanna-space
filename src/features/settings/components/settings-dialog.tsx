"use client";

import {
  Bell,
  CircleUserRound,
  Database,
  Keyboard,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  Fragment,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { getRoom } from "@/config/rooms";
import type { ProjectItem } from "@/features/tasks";
import { cn } from "@/lib/cn";
import { spring } from "@/lib/motion";
import { SETTINGS_EVENT, type SettingsSection } from "@/lib/settings";

import { AppearancePane } from "./appearance-pane";
import { DataPane } from "./data-pane";
import { GeneralPane } from "./general-pane";
import { NotificationsPane } from "./notifications-pane";
import { OrbitPane } from "./orbit-pane";
import { ProfilePane, type SettingsUser } from "./profile-pane";
import { SecurityPane } from "./security-pane";
import { ShortcutsPane } from "./shortcuts-pane";
import { TasksPane } from "./tasks-pane";
import { TimePane } from "./time-pane";

type Section = { id: SettingsSection; label: string; icon: LucideIcon };

const NAV: { heading: string; sections: Section[] }[] = [
  {
    heading: "Preferences",
    sections: [
      { id: "general", label: "General", icon: SlidersHorizontal },
      { id: "appearance", label: "Appearance", icon: Palette },
      { id: "notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    heading: "Rooms",
    sections: [
      { id: "tasks", label: "Tasks", icon: getRoom("tasks").icon },
      { id: "orbit", label: "Orbit", icon: getRoom("orbit").icon },
      { id: "time", label: "Time", icon: getRoom("time").icon },
    ],
  },
  {
    heading: "Account",
    sections: [
      { id: "profile", label: "Profile", icon: CircleUserRound },
      { id: "security", label: "Security", icon: ShieldCheck },
      { id: "data", label: "Data", icon: Database },
    ],
  },
  { heading: "Help", sections: [{ id: "shortcuts", label: "Shortcuts", icon: Keyboard }] },
];

const SECTIONS = NAV.flatMap((g) => g.sections);

type SettingsProject = Pick<ProjectItem, "id" | "name" | "keyword" | "color">;

const FOCUSABLE = "button, [href], input, textarea, select, [tabindex]";

/** App-wide settings: ⌘, / Ctrl+, anywhere, or `requestSettings()` from the shell. */
export function SettingsDialog({
  user,
  projects,
}: {
  user: SettingsUser;
  projects: SettingsProject[];
}) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<SettingsSection>("general");
  const returnFocus = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<Partial<Record<SettingsSection, HTMLButtonElement | null>>>({});
  const id = useId();
  const tabId = (s: SettingsSection) => `${id}-tab-${s}`;

  function show(next?: SettingsSection) {
    returnFocus.current = document.activeElement as HTMLElement | null;
    if (next) setSection(next);
    setOpen(true);
  }

  function hide() {
    setOpen(false);
    const el = returnFocus.current;
    requestAnimationFrame(() => el?.isConnected && el.focus());
  }

  const onGlobalKey = useEffectEvent((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key === ",") {
      e.preventDefault();
      if (open) hide();
      else show();
    }
  });
  const onRequest = useEffectEvent((e: Event) => {
    const next = (e as CustomEvent<SettingsSection | undefined>).detail;
    if (!open) show(next);
    else if (next) setSection(next);
  });

  useEffect(() => {
    const key = (e: KeyboardEvent) => onGlobalKey(e);
    const request = (e: Event) => onRequest(e);
    window.addEventListener("keydown", key);
    window.addEventListener(SETTINGS_EVENT, request);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener(SETTINGS_EVENT, request);
    };
  }, []);

  function onDialogKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    // The page behind (task shortcuts, undo, search) stays still while settings are open.
    e.stopPropagation();
    const closeKey = (e.metaKey || e.ctrlKey) && e.key === ",";
    if (e.key === "Escape" || closeKey) {
      e.preventDefault();
      hide();
    } else if (e.key === "Tab") {
      keepFocusInside(e, e.currentTarget);
    }
  }

  function onTabKeyDown(e: ReactKeyboardEvent, index: number) {
    const last = SECTIONS.length - 1;
    const next = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: last,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const target = SECTIONS[(next + SECTIONS.length) % SECTIONS.length]!.id;
    setSection(target);
    tabRefs.current[target]?.focus();
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center md:p-6">
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={hide}
            className="absolute inset-0 bg-ink/25 backdrop-blur-[3px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-title`}
            tabIndex={-1}
            onKeyDown={onDialogKeyDown}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.14 } }}
            transition={spring.gentle}
            className="relative flex h-dvh w-full flex-col overflow-hidden bg-canvas outline-none md:h-[min(44rem,calc(100dvh-3rem))] md:max-w-[58rem] md:flex-row md:rounded-2xl md:shadow-xl"
          >
            <nav className="shrink-0 bg-surface-sunken/70 px-3 pt-4 pb-2.5 md:w-56 md:overflow-y-auto md:pb-4">
              <h2
                id={`${id}-title`}
                className="mb-3 px-2.5 font-heading text-[15px] font-semibold tracking-[-0.01em] text-ink"
              >
                Settings
              </h2>
              <div
                role="tablist"
                aria-orientation="vertical"
                aria-label="Settings sections"
                className="-mx-3 flex [scrollbar-width:none] gap-0.5 overflow-x-auto px-3 md:mx-0 md:flex-col md:overflow-x-visible md:px-0"
              >
                {NAV.map(({ heading, sections }, g) => (
                  <Fragment key={heading}>
                    <p
                      aria-hidden
                      className={cn(
                        "hidden px-2.5 pb-1 text-[11px] font-semibold tracking-[0.06em] text-ink-faint uppercase md:block",
                        g > 0 && "md:pt-4",
                      )}
                    >
                      {heading}
                    </p>
                    {sections.map(({ id: sectionId, label, icon: Icon }) => {
                      const i = SECTIONS.findIndex((s) => s.id === sectionId);
                      const active = sectionId === section;
                      return (
                        <button
                          key={sectionId}
                          ref={(el) => {
                            tabRefs.current[sectionId] = el;
                          }}
                          id={tabId(sectionId)}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          aria-controls={`${id}-panel`}
                          tabIndex={active ? 0 : -1}
                          autoFocus={active}
                          onClick={() => setSection(sectionId)}
                          onKeyDown={(e) => onTabKeyDown(e, i)}
                          className={cn(
                            "group relative flex h-9 shrink-0 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] font-medium transition-colors",
                            active
                              ? "text-ink"
                              : "text-ink-muted hover:bg-surface-hover/70 hover:text-ink",
                          )}
                        >
                          {active && (
                            <motion.span
                              layoutId="settings-tab"
                              transition={spring.glide}
                              className="absolute inset-0 rounded-md bg-surface-raised"
                            />
                          )}
                          <Icon
                            className={cn(
                              "relative size-[15px] transition-[color,transform] duration-300 ease-spring group-active:scale-90",
                              active
                                ? "text-accent-ink"
                                : "text-ink-subtle group-hover:text-ink-muted",
                            )}
                          />
                          <span className="relative">{label}</span>
                        </button>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </nav>

            <motion.div
              key={section}
              id={`${id}-panel`}
              role="tabpanel"
              aria-labelledby={tabId(section)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring.gentle}
              className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:var(--color-surface-hover)_transparent] [scrollbar-gutter:stable] overflow-y-auto overscroll-contain px-5 pt-6 pb-12 md:pt-8 md:pr-6 md:pl-9"
            >
              {section === "general" && <GeneralPane />}
              {section === "appearance" && <AppearancePane />}
              {section === "notifications" && <NotificationsPane />}
              {section === "tasks" && <TasksPane projects={projects} />}
              {section === "orbit" && <OrbitPane />}
              {section === "time" && <TimePane />}
              {section === "profile" && <ProfilePane user={user} />}
              {section === "security" && <SecurityPane email={user.email} />}
              {section === "data" && <DataPane />}
              {section === "shortcuts" && <ShortcutsPane />}
            </motion.div>

            <button
              type="button"
              onClick={hide}
              aria-label="Close settings"
              title="Close (Esc)"
              className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Tab and Shift+Tab wrap around inside the dialog instead of escaping to the page. */
function keepFocusInside(e: ReactKeyboardEvent, root: HTMLElement) {
  const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.tabIndex >= 0 && !el.hasAttribute("disabled") && el.getClientRects().length > 0,
  );
  const first = items[0];
  const last = items.at(-1);
  if (!first || !last) return;
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === root)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

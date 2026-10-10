import type { Route } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { CapabilitiesProvider } from "@/components/shell/capabilities";
import { CommandPalette, type PalettePlace } from "@/components/shell/command-palette";
import { MobileNav } from "@/components/shell/mobile-nav";
import { SearchButton } from "@/components/shell/search-button";
import { SettingsProvider } from "@/components/shell/settings-context";
import { Sidebar } from "@/components/shell/sidebar";
import { UndoShortcut } from "@/components/shell/undo";
import { UserMenu } from "@/components/shell/user-menu";
import { Toaster } from "@/components/ui/toast";
import { newPage } from "@/features/notes/server/actions";
import { SettingsDialog } from "@/features/settings/components/settings-dialog";
import { QuickCaptureDialog } from "@/features/tasks/components/quick-capture-dialog";
import { colorOf } from "@/features/tasks/projects";
import { listProjects } from "@/features/tasks/server/queries";
import { TimerPill } from "@/features/time/components/timer-pill";
import { TimerProvider } from "@/features/time/components/timer-provider";
import { loadTimer } from "@/features/time/server/queries";
import { requireUser } from "@/server/dal";
import { features } from "@/server/env";
import { getSettings } from "@/server/settings";
import { getUserToday } from "@/server/today";

import { searchSpace } from "./_actions/search";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [user, projects, today, settings, { timer, serverNow }] = await Promise.all([
    requireUser(),
    listProjects(),
    getUserToday(),
    getSettings(),
    loadTimer(),
  ]);

  const places: PalettePlace[] = [
    { id: "inbox", label: "Inbox", hint: "Tasks", href: "/tasks/inbox" },
    ...projects.map((p) => ({
      id: p.id,
      label: p.name,
      hint: "Project",
      href: `/tasks/projects/${p.id}` as Route,
      dot: colorOf(p.color).dot,
      keywords: p.keyword,
    })),
    ...projects.map((p) => ({
      id: `board-${p.id}`,
      label: p.name,
      hint: "Board",
      href: `/orbit/${p.id}` as Route,
      dot: colorOf(p.color).dot,
      keywords: p.keyword,
      searchOnly: true,
    })),
  ];

  return (
    <CapabilitiesProvider value={{ uploads: features.uploads }}>
      <SettingsProvider initial={settings}>
        <TimerProvider initial={timer} serverNow={serverNow}>
          <div className="flex min-h-dvh">
            <Sidebar account={<UserMenu user={user} />} timer={<TimerPill />} />
            <main data-split-shell className="min-w-0 flex-1">
              <header className="flex items-center justify-between gap-3 px-5 pt-4 md:hidden">
                <Link href="/start" className="shrink-0">
                  <Logo />
                </Link>
                <div className="flex items-center gap-1">
                  <TimerPill compact />
                  <SearchButton />
                  <UserMenu user={user} compact />
                </div>
              </header>
              <div className="mx-auto w-full max-w-5xl px-5 pt-8 pb-28 has-[[data-wide]]:max-w-[110rem] md:px-10 md:pt-14 md:pb-16">
                {children}
              </div>
            </main>
            <MobileNav />
            <QuickCaptureDialog today={today} projects={projects} />
            <CommandPalette places={places} search={searchSpace} newPage={newPage} />
            <SettingsDialog user={user} projects={projects} />
            <UndoShortcut />
            <Toaster />
          </div>
        </TimerProvider>
      </SettingsProvider>
    </CapabilitiesProvider>
  );
}

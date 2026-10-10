import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { rooms } from "@/config/rooms";
import { cn } from "@/lib/cn";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <Link href="/" className="self-start">
          <Logo />
        </Link>
        <main className="mx-auto flex w-full max-w-[380px] flex-1 animate-rise flex-col justify-center py-12">
          {children}
        </main>
        <p className="text-[12px] text-ink-faint">Private by default. Your space is yours.</p>
      </div>

      <aside className="paper-grain relative hidden overflow-hidden bg-surface-sunken lg:block">
        <div
          aria-hidden
          className="absolute -top-32 -right-24 size-[520px] rounded-full bg-mint/50 blur-[110px]"
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-20 size-[480px] rounded-full bg-cream blur-[110px] dark:opacity-40"
        />

        <div className="relative flex h-full flex-col justify-between p-14">
          <div className="grid w-fit grid-cols-3 gap-4">
            {rooms.map((room, i) => {
              const Icon = room.icon;
              return (
                <div
                  key={room.id}
                  className="animate-rise"
                  style={{ animationDelay: `${200 + i * 80}ms` }}
                >
                  <div
                    className={cn(
                      "flex size-24 animate-float flex-col items-start justify-between rounded-xl p-4",
                      room.tone.soft,
                    )}
                    style={{ animationDelay: `${i * -1.1}s` }}
                  >
                    <Icon className={cn("size-5", room.tone.text)} strokeWidth={1.75} />
                    <span className="text-[12px] font-medium text-ink-muted">{room.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="max-w-md">
            <p className="font-heading text-[40px] leading-[1.05] font-medium tracking-[-0.04em] text-ink">
              Everything you’re making, in one quiet room.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
              Plan the day, keep what inspires you, and finish what matters — without six tabs
              fighting for attention.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

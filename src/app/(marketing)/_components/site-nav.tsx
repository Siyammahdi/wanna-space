import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";

const LINKS = [
  { href: "#tour", label: "How it works" },
  { href: "#calm", label: "Principles" },
  { href: "#rooms", label: "Rooms" },
] as const;

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 nav-glass">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
        <Link
          href="/"
          aria-label="Wanna Space home"
          className="shrink-0 rounded-lg whitespace-nowrap"
        >
          <Logo />
        </Link>
        <nav aria-label="Page sections" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-1.5 text-[14px] text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Link href="/sign-in" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Sign in
          </Link>
          <Link href="/sign-up" className={buttonVariants({ size: "sm" })}>
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

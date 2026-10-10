import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { site } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-6xl px-6 pt-4 pb-12">
      <div className="flex flex-col gap-8 rounded-[28px] bg-surface-sunken/60 p-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{site.description}</p>
        </div>
        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-ink-muted"
        >
          <a href="#tour" className="hover:text-ink">
            How it works
          </a>
          <a href="#rooms" className="hover:text-ink">
            Rooms
          </a>
          <Link href="/design" className="hover:text-ink">
            Design language
          </Link>
          <Link href="/sign-in" className="hover:text-ink">
            Sign in
          </Link>
        </nav>
      </div>
      <p className="mt-6 px-2 text-[13px] text-ink-subtle">
        © {new Date().getFullYear()} {site.name}. Made with care, and a lot of undo.
      </p>
    </footer>
  );
}

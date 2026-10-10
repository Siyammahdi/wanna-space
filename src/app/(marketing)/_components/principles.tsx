import { Feather, Lock, MousePointerClick, Undo2, type LucideIcon } from "lucide-react";

const PRINCIPLES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Feather,
    title: "Calm by default",
    body: "Soft surfaces, no shouting badges, no streaks to guilt you. Motion explains what happened, then gets out of the way.",
  },
  {
    icon: Lock,
    title: "Yours alone",
    body: "A private space, not a feed. No followers, no ads, nothing sold. Export everything whenever you like.",
  },
  {
    icon: Undo2,
    title: "Undo for everything",
    body: "Deleted the wrong thing? Moved it to the wrong day? Take it back. Moving fast should never feel risky.",
  },
  {
    icon: MousePointerClick,
    title: "Keys and clicks, equally",
    body: "Every shortcut has a button and every button has a shortcut. It works the way your hands do.",
  },
];

export function Principles() {
  return (
    <section
      id="calm"
      aria-labelledby="calm-title"
      className="scroll-mt-20 bg-surface-sunken/60 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
          <div className="scroll-rise lg:sticky lg:top-28 lg:self-start">
            <p className="text-[12px] font-medium tracking-[0.12em] text-accent uppercase">
              Principles
            </p>
            <h2
              id="calm-title"
              className="mt-3 font-heading text-[34px] leading-[1.05] font-medium tracking-[-0.04em] md:text-[52px]"
            >
              Software that lowers your shoulders.
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-ink-muted">
              Most tools compete for your attention. This one is trying to give it back.
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {PRINCIPLES.map(({ icon: Icon, title, body }, i) => (
              <li
                key={title}
                style={{ "--rise-from": `${i % 2 ? 12 : 0}%` } as React.CSSProperties}
                className="scroll-rise rounded-[24px] bg-surface-raised/90 p-6 sm:even:translate-y-10"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft">
                  <Icon className="size-5 text-accent-ink" strokeWidth={1.8} />
                </span>
                <h3 className="mt-5 font-heading text-[20px] font-semibold tracking-tight">
                  {title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

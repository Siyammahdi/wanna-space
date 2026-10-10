"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";

export function PaneHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-7">
      <h2 className="font-heading text-[19px] font-semibold tracking-[-0.015em] text-ink">
        {title}
      </h2>
      <p className="mt-1 text-[13.5px] text-ink-muted">{description}</p>
    </header>
  );
}

export function Group({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-7 first-of-type:mt-0">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h3 className="text-[12.5px] font-medium text-ink-subtle">{label}</h3>
        {note && <p className="text-[11.5px] text-ink-faint">{note}</p>}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  );
}

/** A setting: title and description on the left, its control on the right. */
export function Row({
  title,
  description,
  control,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  control?: ReactNode;
  /** Labels the control (`aria-labelledby`) when it has no visible label of its own. */
  id?: string;
}) {
  return (
    <div className="flex min-h-15 items-center gap-4 rounded-xl bg-surface px-4 py-3">
      <div className="min-w-0 flex-1">
        <p id={id} className="text-[13.5px] font-medium text-ink">
          {title}
        </p>
        {description && (
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-subtle">{description}</p>
        )}
      </div>
      {control}
    </div>
  );
}

export function RadioDot({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
        checked ? "bg-accent" : "ring-[1.5px] ring-ink-faint ring-inset",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full bg-accent-contrast transition-transform duration-300 ease-spring",
          checked ? "scale-100" : "scale-0",
        )}
      />
    </span>
  );
}

type RadioCardsProps<T extends string | number> = {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  className?: string;
  optionClassName?: (checked: boolean) => string;
  children: (option: T, checked: boolean) => ReactNode;
};

/** A radiogroup of cards: arrow keys move and select, like native radios. */
export function RadioCards<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
  optionClassName = cardClassName,
  children,
}: RadioCardsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent, index: number) {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next]!);
    refs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label={label} className={className}>
      {options.map((option, i) => {
        const checked = option === value;
        return (
          <button
            key={option}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={optionClassName(checked)}
          >
            {children(option, checked)}
          </button>
        );
      })}
    </div>
  );
}

/** A row whose control is an on/off switch. */
export function SwitchRow({
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: ReactNode;
  description?: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <Row
      id={id}
      title={title}
      description={description}
      control={
        <Switch
          aria-labelledby={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
        />
      }
    />
  );
}

/** A setting picked from a row of chips (minutes, counts …). */
export function ChoiceRow({
  title,
  description,
  value,
  choices,
  format,
  onChange,
}: {
  title: string;
  description?: string;
  value: number;
  choices: readonly number[];
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const options = choices.includes(value) ? choices : [...choices, value].sort((a, b) => a - b);
  return (
    <div className="rounded-xl bg-surface px-4 py-3">
      <p className="text-[13.5px] font-medium text-ink">{title}</p>
      {description && (
        <p className="mt-0.5 text-[12.5px] leading-snug text-ink-subtle">{description}</p>
      )}
      <RadioCards
        label={title}
        value={value}
        options={options}
        onChange={(next) => next !== value && onChange(next)}
        className="mt-2.5 flex flex-wrap gap-1.5"
        optionClassName={(checked) =>
          cn(
            "h-8 rounded-md px-3 text-[13px] font-medium tabular-nums transition-[background-color,color,transform] duration-200 active:scale-95",
            checked
              ? "bg-accent text-accent-contrast"
              : "bg-surface-sunken text-ink-muted hover:bg-surface-hover hover:text-ink",
          )
        }
      >
        {(option) => format(option)}
      </RadioCards>
    </div>
  );
}

function cardClassName(checked: boolean) {
  return cn(
    "relative flex flex-col items-start rounded-xl bg-surface p-3.5 text-left transition-[background-color,box-shadow,transform] duration-200 active:scale-[0.985]",
    checked ? "ring-2 ring-accent" : "hover:bg-surface-hover",
  );
}

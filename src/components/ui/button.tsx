import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap select-none",
    "transition-[transform,background-color,color,box-shadow,border-color] duration-200 ease-out",
    "active:scale-[0.97] active:duration-75",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-ink text-ink-inverse shadow-sm hover:bg-ink/90 hover:shadow-md",
        accent: "bg-accent text-accent-contrast shadow-sm hover:bg-accent-hover hover:shadow-md",
        secondary:
          "border border-line bg-surface-raised text-ink shadow-xs hover:border-line-strong hover:bg-surface",
        ghost: "text-ink-muted hover:bg-surface-hover hover:text-ink",
        danger: "bg-danger text-white shadow-sm hover:bg-danger/90",
      },
      size: {
        sm: "h-8 rounded-sm px-3 text-[13px] [&_svg]:size-3.5",
        md: "h-9 rounded-md px-4 text-sm [&_svg]:size-4",
        lg: "h-11 rounded-lg px-5 text-[15px] [&_svg]:size-[18px]",
        icon: "size-9 rounded-md [&_svg]:size-[18px]",
        "icon-sm": "size-8 rounded-sm [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}

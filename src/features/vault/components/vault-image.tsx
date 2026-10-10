"use client";

import { Globe } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Stored previews are resized by the storage CDN and share images come from any host,
 * so a plain <img>: lazy, no referrer, and a fallback when the source is gone.
 */
export function VaultImage({
  src,
  alt = "",
  ratio,
  fallback = null,
  eager = false,
  className,
}: {
  src: string;
  alt?: string;
  /** Width ÷ height; reserves the space before the image loads. */
  ratio?: number;
  fallback?: ReactNode;
  eager?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === src) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- resized by the storage CDN or hotlinked
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => setFailed(src)}
      style={ratio ? { aspectRatio: ratio } : undefined}
      className={cn("block w-full bg-surface-sunken object-cover", className)}
    />
  );
}

export function Favicon({ src, className }: { src: string | null; className?: string }) {
  const fallback = <Globe className={cn("size-3.5 shrink-0 text-ink-faint", className)} />;
  if (!src) return fallback;
  return (
    <VaultImage
      src={src}
      fallback={fallback}
      className={cn("size-3.5 shrink-0 rounded-[3px] bg-transparent object-contain", className)}
    />
  );
}

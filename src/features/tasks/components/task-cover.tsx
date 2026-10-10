"use client";

import { ImagePlus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState, type ClipboardEvent, type DragEvent, type ReactNode } from "react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";

import type { TaskCover } from "../schema";

const ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,image/avif,image/svg+xml,image/bmp,image/heic,image/heif";

/** A task's image, cropped to fill its frame; dims while it uploads. */
export function CoverImage({
  cover,
  className,
  dim = false,
}: {
  cover: TaskCover;
  className?: string;
  /** Done tasks fade theirs. */
  dim?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === cover.url) return null;

  return (
    <div className={cn("relative overflow-hidden bg-surface-sunken", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- resized by the storage CDN */}
      <img
        src={cover.url}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => setFailed(cover.url)}
        className={cn(
          "absolute inset-0 size-full object-cover transition-opacity duration-300",
          (cover.pending || dim) && "opacity-60",
        )}
      />
      {cover.pending && (
        <span className="absolute inset-0 flex items-center justify-center text-ink">
          <span className="flex size-8 items-center justify-center rounded-full bg-surface/85 backdrop-blur-sm">
            <Spinner />
          </span>
          <span className="sr-only">Uploading image</span>
        </span>
      )}
    </div>
  );
}

/** A hidden file input and a way to open it. */
export function useImagePicker(onFile: (file: File) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={ref}
      type="file"
      accept={ACCEPT}
      hidden
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) onFile(file);
      }}
    />
  );
  return { open: () => ref.current?.click(), input };
}

const firstImage = (files: FileList | undefined) =>
  [...(files ?? [])].find((f) => f.type.startsWith("image/"));

/**
 * Paste or drop an image anywhere on the target to make it the cover. Text fields keep
 * their own paste when the clipboard has text.
 */
export function useImageDrop(onFile: (file: File) => void) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");

  const handlers = {
    onPaste(e: ClipboardEvent) {
      const field = (e.target as Element).closest("input, textarea, [contenteditable=true]");
      if (field && e.clipboardData.types.includes("text/plain")) return;
      const file = firstImage(e.clipboardData.files);
      if (!file) return;
      e.preventDefault();
      onFile(file);
    },
    onDragEnter(e: DragEvent) {
      if (!hasFiles(e)) return;
      depth.current += 1;
      setOver(true);
    },
    onDragOver(e: DragEvent) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave(e: DragEvent) {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setOver(false);
    },
    onDrop(e: DragEvent) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setOver(false);
      const file = firstImage(e.dataTransfer.files);
      if (file) onFile(file);
    },
  };

  return { over, handlers };
}

/** Covers the drop target while an image is dragged over it. */
export function DropHint({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none absolute inset-2 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-accent-soft/90 text-[14px] font-medium text-accent-ink backdrop-blur-sm"
        >
          <ImagePlus className="size-6" />
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

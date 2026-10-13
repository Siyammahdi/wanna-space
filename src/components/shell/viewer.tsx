"use client";

import { createContext, use, type ReactNode } from "react";

import type { IsoDate } from "@/lib/dates";

/**
 * The signed-in person and their "today", for client UI that renders before a page's own
 * data arrives (loading states draw the real greeting and the real week from these).
 */
export type Viewer = { name: string; today: IsoDate };

const ViewerContext = createContext<Viewer>({ name: "", today: "1970-01-01" });

export function ViewerProvider({ value, children }: { value: Viewer; children: ReactNode }) {
  return <ViewerContext value={value}>{children}</ViewerContext>;
}

export const useViewer = () => use(ViewerContext);

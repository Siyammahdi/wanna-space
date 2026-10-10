"use server";

import { z } from "zod";

import type { PaletteResult } from "@/components/shell/command-palette";
import { searchPages } from "@/features/notes/server/search";
import { searchTasks } from "@/features/tasks/server/search";
import { searchVault } from "@/features/vault/server/search";
import { SEARCH_MIN, searchWords } from "@/lib/search";

const query = z.string().trim().min(SEARCH_MIN).max(100);

/** The command palette's search: tasks, pages and the Vault in one round trip. */
export async function searchSpace(input: string): Promise<PaletteResult[]> {
  const parsed = query.safeParse(input);
  if (!parsed.success) return [];
  const words = searchWords(parsed.data);
  const groups = await Promise.all([searchTasks(words), searchPages(words), searchVault(words)]);
  return groups.flat();
}

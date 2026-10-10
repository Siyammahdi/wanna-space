"use server";

import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";
import { refresh } from "next/cache";
import { z } from "zod";

import { requireSpace } from "@/server/dal";
import { db } from "@/server/db";
import { project, projectStage } from "@/server/db/schema";
import { getSettings } from "@/server/settings";

import { keywordProblem, normalizeKeyword, suggestKeyword } from "../keywords";
import {
  createProjectInput,
  updateProjectInput,
  type ActionResult,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "../schema";

const invalid = (error = "That didn’t look right. Please try again."): ActionResult => ({
  ok: false,
  error,
});

/** Keywords in use in the space, optionally ignoring one project. */
async function takenKeywords(spaceId: string, except?: string) {
  const rows = await db
    .select({ keyword: project.keyword })
    .from(project)
    .where(and(eq(project.spaceId, spaceId), except ? ne(project.id, except) : undefined));
  return rows.map((r) => r.keyword);
}

const isUniqueViolation = (error: unknown) =>
  (error as { code?: string; cause?: { code?: string } })?.code === "23505" ||
  (error as { cause?: { code?: string } })?.cause?.code === "23505";

export async function createProject(input: CreateProjectInput): Promise<ActionResult> {
  const parsed = createProjectInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const { space } = await requireSpace();

  const [[last], { defaultStages }, taken] = await Promise.all([
    db
      .select({ key: sql<string | null>`max(${project.sortKey} collate "C")` })
      .from(project)
      .where(and(eq(project.spaceId, space.id), isNull(project.archivedAt))),
    getSettings(),
    takenKeywords(space.id),
  ]);
  const wanted = normalizeKeyword(parsed.data.keyword ?? "");
  const keyword =
    wanted && !keywordProblem(wanted, taken) ? wanted : suggestKeyword(parsed.data.name, taken);

  await db.transaction(async (tx) => {
    await tx.insert(project).values({
      ...parsed.data,
      keyword,
      spaceId: space.id,
      sortKey: generateKeyBetween(last?.key ?? null, null),
    });
    // Every board starts with the stages chosen in Settings → Orbit.
    const keys = generateNKeysBetween(null, null, defaultStages.length);
    await tx.insert(projectStage).values(
      defaultStages.map((name, i) => ({
        spaceId: space.id,
        projectId: parsed.data.id,
        name,
        sortKey: keys[i]!,
      })),
    );
  });

  refresh();
  return { ok: true };
}

export async function updateProject(input: UpdateProjectInput): Promise<ActionResult> {
  const parsed = updateProjectInput.safeParse(input);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
  const { id, ...patch } = parsed.data;
  const { space } = await requireSpace();

  if (patch.keyword) {
    const problem = keywordProblem(patch.keyword, await takenKeywords(space.id, id));
    if (problem) return invalid(problem);
  }

  let updated: { id: string }[];
  try {
    updated = await db
      .update(project)
      .set(patch)
      .where(and(eq(project.id, id), eq(project.spaceId, space.id)))
      .returning({ id: project.id });
  } catch (error) {
    if (isUniqueViolation(error)) return invalid(`“${patch.keyword}” is used by another project`);
    throw error;
  }

  if (updated.length === 0) return invalid("That project no longer exists.");
  refresh();
  return { ok: true };
}

/** Deletes the project; its tasks fall back to the Inbox (FK on delete set null). */
export async function deleteProject(id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success) return invalid();
  const { space } = await requireSpace();

  const deleted = await db
    .delete(project)
    .where(and(eq(project.id, id), eq(project.spaceId, space.id)))
    .returning({ id: project.id });

  if (deleted.length === 0) return invalid("That project no longer exists.");
  return { ok: true };
}

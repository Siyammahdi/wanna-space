import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/server/env";

import * as schema from "./schema";

/**
 * node-postgres over Neon's pooled endpoint: works the same on Vercel and on a
 * long-running VPS. The pool is cached on globalThis so dev hot-reloads don't
 * leak connections.
 */
const globalForDb = globalThis as unknown as { pgPool?: Pool };

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 10_000,
  });

if (env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle({ client: pool, schema, casing: "snake_case" });
export type Database = typeof db;

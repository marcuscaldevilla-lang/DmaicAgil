import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Defends against env values accidentally pasted with a "KEY=" prefix or trailing lines
// (e.g. an entire .env file pasted into a single dashboard field).
function sanitizeConnectionString(rawValue: string): string {
  const firstLine = rawValue.split(/\r?\n/)[0]?.trim() ?? "";
  const prefixMatch = /^[A-Z0-9_]+=(.*)$/.exec(firstLine);
  return prefixMatch ? prefixMatch[1] : firstLine;
}

const rawDatabaseUrl = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;

if (!rawDatabaseUrl) {
  throw new Error(
    "NEON_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = sanitizeConnectionString(rawDatabaseUrl);

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });

export * from "./schema";

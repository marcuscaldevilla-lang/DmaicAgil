import { defineConfig } from "drizzle-kit";
import path from "path";

const databaseUrl = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("NEON_DATABASE_URL or DATABASE_URL, ensure the database is configured");
}

export default defineConfig({
  schema: path.resolve(__dirname, "src/schema/index.ts").replace(/\\/g, "/"),
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
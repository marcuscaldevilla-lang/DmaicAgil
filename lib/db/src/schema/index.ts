import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dmaicWorkspaces = pgTable("dmaic_workspaces", {
  projectKey: integer("project_key").generatedAlwaysAsIdentity().primaryKey(),
  problemStatement: text("problem_statement").notNull(),
  projectCharterContext: jsonb("project_charter_context").notNull(),
  aiCharterSuggestions: jsonb("ai_charter_suggestions"),
  revision: integer("revision").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DmaicWorkspace = typeof dmaicWorkspaces.$inferSelect;
export type NewDmaicWorkspace = typeof dmaicWorkspaces.$inferInsert;
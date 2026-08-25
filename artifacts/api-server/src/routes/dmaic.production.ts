import { and, desc, eq, sql } from "drizzle-orm";
import { db, dmaicWorkspaces } from "@workspace/db";
import {
  createDmaicRouter,
  type DmaicWorkspaceRepository,
  type DmaicWorkspaceWriteValues,
} from "./dmaic";

const workspaceRepository: DmaicWorkspaceRepository = {
  async findByProjectKey(projectKey) {
    const [workspace] = await db
      .select()
      .from(dmaicWorkspaces)
      .where(eq(dmaicWorkspaces.projectKey, projectKey));
    return workspace;
  },
  async findMostRecent() {
    const [workspace] = await db
      .select()
      .from(dmaicWorkspaces)
      .orderBy(desc(dmaicWorkspaces.updatedAt))
      .limit(1);
    return workspace;
  },
  async listWorkspaces() {
    return db
      .select()
      .from(dmaicWorkspaces)
      .orderBy(desc(dmaicWorkspaces.updatedAt), desc(dmaicWorkspaces.projectKey));
  },
  async create(values: DmaicWorkspaceWriteValues) {
    const [workspace] = await db
      .insert(dmaicWorkspaces)
      .values(values)
      .returning();
    return workspace;
  },
  async updateIfRevisionMatches(projectKey, expectedRevision, values) {
    const [workspace] = await db
      .update(dmaicWorkspaces)
      .set({
        problemStatement: values.problemStatement,
        projectCharterContext: values.projectCharterContext,
        aiCharterSuggestions: values.aiCharterSuggestions,
        analysisArtifacts: values.analysisArtifacts === undefined
          ? sql`${dmaicWorkspaces.analysisArtifacts}`
          : values.analysisArtifacts,
        revision: sql`${dmaicWorkspaces.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dmaicWorkspaces.projectKey, projectKey),
          eq(dmaicWorkspaces.revision, expectedRevision),
        ),
      )
      .returning();
    return workspace;
  },
};

export default createDmaicRouter(workspaceRepository);
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

const LEGACY_SIPOC_PROCESS_SETS = [[
  "Retirar a senha de atendimento",
  "Cadastrar o cliente",
  "Verificar autorização dos exames",
  "Imprimir guia para realização dos exames",
  "Encaminhar cliente para o exame",
], [
  "Fechamento do Pedido",
  "Planejamento da Separação",
  "Separação e Embalagem",
  "Expedição e Carregamento",
  "Transporte",
  "Entrega ao Cliente",
]];

const REPLACEMENT_SIPOC = [
  { suppliers: "Área de TI\nCliente", inputs: "Portal do cliente\nQtd. de produto\nEspecificações do produto", process: "Implantar pedido", outputs: "Pedido implantado no sistema Voitto Tubes", customers: "Área Comercial" },
  { suppliers: "Área Comercial\nÁrea de TI\nCliente", inputs: "Pedido implantado\nMapa de entregas\nDisponibilidade do produto", process: "Acordar prazo de entrega com cliente", outputs: "Prazo acordado\nPedido liberado para a expedição", customers: "Área de Expedição" },
  { suppliers: "Área de Operação\nPlano de Saúde\nCliente", inputs: "Pedido liberado\nSeparador\nMaterial para embalagem", process: "Separar e embalar produto", outputs: "Produto separado e embalado\nNota Fiscal emitida\nEtiqueta de identificação impressa e colada no produto", customers: "Logística / modal de transporte" },
  { suppliers: "Logística", inputs: "Produto separado e embalado\nNota Fiscal\nDefinição do modal", process: "Transportar produto até o cliente", outputs: "Produto em transporte", customers: "Modal / Transportadora" },
  { suppliers: "Modal / Transportadora", inputs: "Produto transportado\nNota Fiscal", process: "Entregar o produto", outputs: "Produto armazenado no local da entrega", customers: "Cliente" },
];

let legacySipocMigration: Promise<void> | null = null;

function migrateLegacySipocData(): Promise<void> {
  if (legacySipocMigration) return legacySipocMigration;
  legacySipocMigration = (async () => {
    const workspaces = await db.select().from(dmaicWorkspaces);
    for (const workspace of workspaces) {
      const artifacts = workspace.analysisArtifacts;
      if (!artifacts || typeof artifacts !== "object" || Array.isArray(artifacts)) continue;
      const pipeline = (artifacts as Record<string, unknown>).pipeline;
      if (!pipeline || typeof pipeline !== "object" || Array.isArray(pipeline)) continue;
      const sipoc = (pipeline as Record<string, unknown>).sipoc;
      if (!Array.isArray(sipoc)) continue;
      const processes = sipoc.map((row) => row && typeof row === "object" ? String((row as Record<string, unknown>).process ?? "").trim() : "");
      if (!LEGACY_SIPOC_PROCESS_SETS.some((legacyProcesses) => processes.length === legacyProcesses.length && legacyProcesses.every((process, index) => processes[index] === process))) continue;

      const nextArtifacts = {
        ...artifacts,
        pipeline: { ...pipeline, sipoc: REPLACEMENT_SIPOC },
      };
      await db.update(dmaicWorkspaces)
        .set({ analysisArtifacts: nextArtifacts, revision: sql`${dmaicWorkspaces.revision} + 1`, updatedAt: new Date() })
        .where(eq(dmaicWorkspaces.projectKey, workspace.projectKey));
    }
  })().catch((error) => {
    legacySipocMigration = null;
    throw error;
  });
  return legacySipocMigration;
}

const originalFindByProjectKey = workspaceRepository.findByProjectKey;
const originalFindMostRecent = workspaceRepository.findMostRecent;
const originalListWorkspaces = workspaceRepository.listWorkspaces;
workspaceRepository.findByProjectKey = async (projectKey) => { await migrateLegacySipocData(); return originalFindByProjectKey(projectKey); };
workspaceRepository.findMostRecent = async () => { await migrateLegacySipocData(); return originalFindMostRecent(); };
workspaceRepository.listWorkspaces = async () => { await migrateLegacySipocData(); return originalListWorkspaces(); };

export default createDmaicRouter(workspaceRepository);
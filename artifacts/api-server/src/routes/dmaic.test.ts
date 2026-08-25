import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { createApp } from "../appFactory";
import {
  createDmaicRouter,
  type DmaicWorkspaceRepository,
  type DmaicWorkspaceRow,
  type DmaicWorkspaceWriteValues,
} from "./dmaic";

const charterContext = {
  projectName: "Projeto de teste",
  client: "Cliente de teste",
  area: "Operação",
  leader: "Líder",
  sponsor: "Patrocinador",
  date: "2026-08-24",
  objective: "Reduzir a variabilidade do processo",
  history: "Contexto do processo para o teste",
  goalDefinition: "Atingir a meta definida pelo time",
  kpis: "Tempo de ciclo",
  includedScope: "Entrada até aprovação",
  excludedScope: "Processos externos",
  assumptionsAndConstraints: "Dados disponíveis no período",
  team: [
    {
      role: "Líder",
      name: "Líder",
      position: "Black Belt",
      areaCompany: "Qualidade",
    },
  ],
  customerRequirements: "Resposta previsível",
  businessContributions: "Menos retrabalho",
  businessContributionsQuantitative: "Redução proposta de 10% no retrabalho",
  businessContributionsQualitative: "Mais previsibilidade para o cliente",
  financialGainValue: "",
  financialInformation: "",
};

const createInput = (
  problemStatement: string,
  expectedRevision: number,
  projectKey?: number,
) => ({
  problemStatement,
  projectCharterContext: charterContext,
  aiCharterSuggestions: null,
  expectedRevision,
  ...(projectKey === undefined ? {} : { projectKey }),
});

function cloneWorkspace(workspace: DmaicWorkspaceRow): DmaicWorkspaceRow {
  return {
    ...workspace,
    createdAt: new Date(workspace.createdAt),
    updatedAt: new Date(workspace.updatedAt),
  };
}

function createInMemoryWorkspaceRepository(): DmaicWorkspaceRepository {
  let workspace: DmaicWorkspaceRow | undefined;
  let nextProjectKey = 1;

  return {
    async findByProjectKey(projectKey) {
      return workspace?.projectKey === projectKey ? cloneWorkspace(workspace) : undefined;
    },
    async findMostRecent() {
      return workspace ? cloneWorkspace(workspace) : undefined;
    },
    async listWorkspaces() {
      return workspace ? [cloneWorkspace(workspace)] : [];
    },
    async create(values: DmaicWorkspaceWriteValues) {
      if (workspace) return undefined;
      const now = new Date();
      workspace = {
        ...values,
        projectKey: nextProjectKey,
        analysisArtifacts: values.analysisArtifacts ?? null,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      };
      nextProjectKey += 1;
      return cloneWorkspace(workspace);
    },
    async updateIfRevisionMatches(projectKey, expectedRevision, values) {
      if (!workspace || workspace.projectKey !== projectKey || workspace.revision !== expectedRevision) {
        return undefined;
      }
      const { analysisArtifacts, ...workspaceValues } = values;
      workspace = {
        ...workspace,
        ...workspaceValues,
        analysisArtifacts: analysisArtifacts ?? workspace.analysisArtifacts,
        revision: workspace.revision + 1,
        updatedAt: new Date(),
      };
      return cloneWorkspace(workspace);
    },
  };
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

async function requestWorkspace(
  baseUrl: string,
  method: "GET" | "PUT",
  body?: unknown,
): Promise<{ response: Response; payload: Record<string, unknown> }> {
  const response = await fetch(`${baseUrl}/api/dmaic/workspace`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, payload: await readJson(response) };
}

test("preserva revisões monotônicas em uma corrida de salvamentos isolada", async () => {
  const app = createApp(createDmaicRouter(createInMemoryWorkspaceRepository()));
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const initial = await requestWorkspace(baseUrl, "GET");
    assert.equal(initial.response.status, 200);
    assert.equal(initial.payload.hasSavedData, false);
    assert.equal(initial.payload.revision, 0);

    const created = await requestWorkspace(
      baseUrl,
      "PUT",
      createInput("Problema inicial com mais de dez caracteres", 0),
    );
    assert.equal(created.response.status, 200);
    assert.equal(created.payload.revision, 1);
    const projectKey = created.payload.projectKey;
    assert.equal(typeof projectKey, "number");

    const consecutive = await requestWorkspace(
      baseUrl,
      "PUT",
      createInput("Segunda edição consecutiva do workspace", 1, projectKey as number),
    );
    assert.equal(consecutive.response.status, 200);
    assert.equal(consecutive.payload.revision, 2);

    const [firstConcurrentSave, secondConcurrentSave] = await Promise.all([
      requestWorkspace(
        baseUrl,
        "PUT",
        createInput("Primeira edição concorrente", 2, projectKey as number),
      ),
      requestWorkspace(
        baseUrl,
        "PUT",
        createInput("Segunda edição concorrente", 2, projectKey as number),
      ),
    ]);
    const concurrentSaves = [firstConcurrentSave, secondConcurrentSave];
    assert.deepEqual(
      concurrentSaves.map(({ response }) => response.status).sort(),
      [200, 409],
    );

    const winner = concurrentSaves.find(({ response }) => response.status === 200);
    const rejectedSave = concurrentSaves.find(({ response }) => response.status === 409);
    assert.ok(winner);
    assert.ok(rejectedSave);
    assert.equal(winner.payload.revision, 3);
    const concurrentLatest = rejectedSave.payload.latestWorkspace as Record<string, unknown>;
    assert.equal(concurrentLatest.revision, 3);
    assert.equal(concurrentLatest.problemStatement, winner.payload.problemStatement);

    const changedAgain = await requestWorkspace(
      baseUrl,
      "PUT",
      createInput("Terceira edição feita depois do conflito", 3, projectKey as number),
    );
    assert.equal(changedAgain.response.status, 200);
    assert.equal(changedAgain.payload.revision, 4);

    const staleOverwrite = await requestWorkspace(
      baseUrl,
      "PUT",
      createInput("Substituição confirmada, mas já obsoleta", 3, projectKey as number),
    );
    assert.equal(staleOverwrite.response.status, 409);
    const overwriteLatest = staleOverwrite.payload.latestWorkspace as Record<string, unknown>;
    assert.equal(overwriteLatest.revision, 4);
    assert.equal(overwriteLatest.problemStatement, "Terceira edição feita depois do conflito");

    const finalWorkspace = await requestWorkspace(baseUrl, "GET");
    assert.equal(finalWorkspace.response.status, 200);
    assert.equal(finalWorkspace.payload.revision, 4);
    assert.equal(finalWorkspace.payload.problemStatement, "Terceira edição feita depois do conflito");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
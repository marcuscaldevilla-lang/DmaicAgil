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
  analysisArtifacts?: unknown,
) => ({
  problemStatement,
  projectCharterContext: charterContext,
  aiCharterSuggestions: null,
  expectedRevision,
  ...(analysisArtifacts === undefined ? {} : { analysisArtifacts }),
  ...(projectKey === undefined ? {} : { projectKey }),
});

const matrixArtifacts = {
  version: 1,
  dataset: null,
  analysisMonths: 12,
  selectedIndicator: '',
  indicatorAnalysis: null,
  exploratorySummary: null,
  diagnosis: null,
  diagnosisInput: null,
  pipelineAnalysisContext: null,
  pareto: [],
  imr: [],
  pipeline: null,
  causeAndEffectMatrix: {
    outputs: [{ id: 'y1', name: 'Qualidade', weight: 10 }],
    rows: [
      { id: 'c1', cause: 'Primeira causa', scores: { y1: 5 } },
      { id: 'c2', cause: 'Segunda causa', scores: { y1: 3 } },
    ],
  },
  solutionPrioritizationMatrix: {
    criteria: [{ id: 'crit1', name: 'Baixo Custo', weight: 7 }],
    solutions: [
      { id: 's1', description: 'Primeira solução', scores: { crit1: 5 } },
      { id: 's2', description: 'Segunda solução', scores: { crit1: 3 } },
    ],
  },
};

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

test("persiste todas as linhas das matrizes da Sprint 3", async () => {
  const repository = createInMemoryWorkspaceRepository();
  const app = createApp(createDmaicRouter(repository));
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const saved = await requestWorkspace(
      baseUrl,
      "PUT",
      createInput("Problema das matrizes com mais de dez caracteres", 0, undefined, matrixArtifacts),
    );
    assert.equal(saved.response.status, 200);
    assert.deepEqual(
      (saved.payload.analysisArtifacts as Record<string, unknown>).causeAndEffectMatrix,
      matrixArtifacts.causeAndEffectMatrix,
    );
    assert.deepEqual(
      (saved.payload.analysisArtifacts as Record<string, unknown>).solutionPrioritizationMatrix,
      matrixArtifacts.solutionPrioritizationMatrix,
    );

    const loaded = await requestWorkspace(baseUrl, "GET");
    assert.equal(loaded.response.status, 200);
    assert.deepEqual(
      (loaded.payload.analysisArtifacts as Record<string, unknown>).causeAndEffectMatrix,
      matrixArtifacts.causeAndEffectMatrix,
    );
    assert.deepEqual(
      (loaded.payload.analysisArtifacts as Record<string, unknown>).solutionPrioritizationMatrix,
      matrixArtifacts.solutionPrioritizationMatrix,
    );
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("persiste datasets e resultados estatísticos de Medição e Controle", async () => {
  const repository = createInMemoryWorkspaceRepository();
  const app = createApp(createDmaicRouter(repository));
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const dataset = {
    fileName: "medicao.csv",
    headers: ["Periodo", "Unidade", "Valor"],
    rows: [{ Periodo: "2026-01", Unidade: "A", Valor: "10" }],
    dateColumn: "Periodo",
    indicatorColumns: ["Valor"],
  };
  const controlPhase = {
    dataset: { ...dataset, fileName: "controle.csv" },
    months: 12,
    selectedIndicators: ["Valor"],
    statistics: [{
      indicator: "Valor",
      count: 1,
      omitted: 0,
      mean: 10,
      standardDeviation: 0,
      minimum: 10,
      maximum: 10,
      movingRangeMean: 0,
      upperControlLimit: 10,
      lowerControlLimit: 10,
      latestValue: 10,
      baseline: 12,
      target: 10,
      improvementPp: -2,
      values: [10],
    }],
    evaluation: null,
  };
  const analysisArtifacts = {
    version: 1,
    dataset: null,
    measurementDataset: dataset,
    analysisMonths: 12,
    selectedIndicator: "Valor",
    indicatorAnalysis: null,
    exploratorySummary: null,
    diagnosis: "Leitura estatística gerada para a série.",
    diagnosisInput: null,
    pipelineAnalysisContext: null,
    pareto: [],
    imr: [],
    pipeline: null,
    whatIfAnalyses: [],
    ishikawa: null,
    ishikawaInputText: "",
    controlPhase,
  };

  try {
    const saved = await requestWorkspace(baseUrl, "PUT", createInput("Problema com dados estatísticos", 0, undefined, analysisArtifacts));
    assert.equal(saved.response.status, 200);
    const savedArtifacts = saved.payload.analysisArtifacts as Record<string, unknown>;
    assert.deepEqual(savedArtifacts.measurementDataset, dataset);
    assert.deepEqual(savedArtifacts.controlPhase, controlPhase);

    const loaded = await requestWorkspace(baseUrl, "GET");
    assert.equal(loaded.response.status, 200);
    const loadedArtifacts = loaded.payload.analysisArtifacts as Record<string, unknown>;
    assert.deepEqual(loadedArtifacts.measurementDataset, dataset);
    assert.deepEqual(loadedArtifacts.controlPhase, controlPhase);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
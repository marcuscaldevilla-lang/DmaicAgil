import type { DmaicProcessEdge, DmaicProcessMap, DmaicProcessNode, DmaicProcessVariable, DmaicSipoc, DmaicVocCqt, DmaicIndicator } from '@workspace/api-client-react';

export type ProcessMapNode = DmaicProcessNode;
export type ProcessMapEdge = DmaicProcessEdge;
export type ProcessMapVariable = DmaicProcessVariable;

const node = (
  id: string,
  type: DmaicProcessNode['type'],
  label: string,
  x: number,
  y: number,
  processInputs: string[] = [],
  processOutputs: string[] = [],
): DmaicProcessNode => ({ id, type, label, position: { x, y }, processInputs, processOutputs });

const variable = (
  id: string,
  name: string,
  kind: DmaicProcessVariable['kind'],
  classification: DmaicProcessVariable['classification'],
  nodeId: string,
  unit = '',
  measure = '',
  notes = '',
): DmaicProcessVariable => ({ id, name, kind, classification, nodeId, unit, measure, notes });

const edge = (id: string, source: string, target: string, label = '', condition = ''): DmaicProcessEdge => ({
  id,
  source,
  target,
  label,
  condition,
});

export function createInitialProcessMap(): DmaicProcessMap {
  return {
    version: 1,
    nodes: [
      node('start', 'start', 'INÍCIO', 120, 270),
      node('sipoc-pending', 'activity', 'Defina o SIPOC para montar a versão inicial do processo', 390, 270, [], ['SIPOC concluído']),
      node('end', 'end', 'FIM', 720, 270),
    ],
    edges: [
      edge('e-start-sipoc', 'start', 'sipoc-pending'),
      edge('e-sipoc-end', 'sipoc-pending', 'end'),
    ],
    variables: [],
  };
}

function splitText(value: string): string[] {
  return value
    .split(/\r?\n|;|•/)
    .map((item) => item.replace(/^[-–—]\s*/, '').trim())
    .filter(Boolean);
}

function slug(value: string, fallback: string): string {
  const normalized = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return normalized.slice(0, 44) || fallback;
}

function variableKey(value: string, fallback: string): string {
  return `${fallback}-${slug(value, 'variavel')}`.slice(0, 94);
}

function findBestNodeId(nodes: DmaicProcessNode[], text: string): string {
  const words = slug(text, '').split('-').filter((word) => word.length > 3);
  const match = nodes.find((item) => words.some((word) => slug(item.label, '').includes(word)));
  return match?.id ?? nodes[Math.max(0, nodes.length - 1)]?.id ?? '';
}

/**
 * Creates the first editable map from the Define-phase SIPOC and the
 * text-based VOC/CTQ and primary-Y inputs. The generated values are only a
 * starting point; the editor owns the resulting JSON afterwards.
 */
export function createProcessMapFromSipoc(
  sipoc: DmaicSipoc,
  vocCtq: DmaicVocCqt[] = [],
  indicator: DmaicIndicator | null = null,
): DmaicProcessMap {
  const rows = sipoc.filter((row) => splitText(row.process).length > 0);
  if (rows.length === 0) return createInitialProcessMap();

  const nodes: DmaicProcessNode[] = [node('sipoc-start', 'start', 'INÍCIO', 44, 270)];
  const nodeRows: Array<{ row: DmaicSipoc[number]; first: DmaicProcessNode; last: DmaicProcessNode }> = [];
  let sequence = 0;

  rows.forEach((row, rowIndex) => {
    const steps = splitText(row.process);
    const inputs = splitText(row.inputs);
    const outputs = splitText(row.outputs);
    const created = steps.map((step, stepIndex) => {
      const position = { x: 180 + ((rowIndex * 2 + stepIndex) % 5) * 220, y: 150 + Math.floor((rowIndex * 2 + stepIndex) / 5) * 180 };
      const id = `sipoc-${rowIndex + 1}-${stepIndex + 1}-${slug(step, `etapa-${sequence + 1}`)}`.slice(0, 98);
      sequence += 1;
      return node(
        id,
        step.endsWith('?') ? 'decision' : 'activity',
        step,
        position.x,
        position.y,
        stepIndex === 0 ? inputs : [],
        stepIndex === steps.length - 1 ? outputs : [],
      );
    });
    nodes.push(...created);
    nodeRows.push({ row, first: created[0], last: created[created.length - 1] });
  });
  nodes.push(node('sipoc-end', 'end', 'FIM', 1050, 630));

  const edges: DmaicProcessEdge[] = [];
  const first = nodeRows[0]?.first;
  if (first) edges.push(edge('sipoc-edge-start', 'sipoc-start', first.id, 'Entrada do processo'));
  nodeRows.forEach(({ last }, index) => {
    const next = nodeRows[index + 1]?.first;
    const outputLabel = splitText(nodeRows[index].row.outputs)[0];
    if (next) edges.push(edge(`sipoc-edge-${index + 1}`, last.id, next.id, outputLabel ? `PP: ${outputLabel}` : 'Próxima etapa'));
    else edges.push(edge('sipoc-edge-end', last.id, 'sipoc-end', outputLabel ? `PP: ${outputLabel}` : 'Entrega final'));
  });

  const variables: DmaicProcessVariable[] = [];
  nodeRows.forEach(({ row, first, last }, rowIndex) => {
    splitText(row.inputs).forEach((input, index) => variables.push(variable(variableKey(input, `x-${rowIndex + 1}-${index + 1}`), input, 'X', 'referência', first.id, '', 'Texto de entrada do SIPOC', `Fornecedor(es): ${row.suppliers || 'não informado'}`)));
    splitText(row.outputs).forEach((output, index) => variables.push(variable(variableKey(output, `y-${rowIndex + 1}-${index + 1}`), output, 'Y', 'referência', last.id, '', 'Entrega / produto em processo do SIPOC', `Cliente(s): ${row.customers || 'não informado'}`)));
  });

  vocCtq.forEach((item, index) => {
    const name = item.ctqMetric || item.ctq || item.vocNeed;
    if (!name.trim()) return;
    const nodeId = findBestNodeId(nodes.slice(1, -1), `${item.directioner} ${item.ctq} ${item.vocNeed}`);
    variables.push(variable(variableKey(name, `y-voc-${index + 1}`), name, 'Y', 'referência', nodeId, '', item.measure || item.ctp, `VOC: ${item.vocNeed}. Critério: ${item.ctq || 'a definir'}.`));
  });
  if (indicator?.primaryMetricY?.trim()) {
    const nodeId = nodes[nodes.length - 2]?.id ?? '';
    variables.push(variable(variableKey(indicator.primaryMetricY, 'y-primary'), indicator.primaryMetricY, 'Y', 'referência', nodeId, '', indicator.operationalDefinition, 'Y principal informado no Project Charter.'));
  }

  return { version: 1, nodes, edges, variables };
}

export function cloneProcessMap(processMap: DmaicProcessMap): DmaicProcessMap {
  return {
    version: processMap.version,
    nodes: processMap.nodes.map((item) => ({
      ...item,
      position: { ...item.position },
      processInputs: [...item.processInputs],
      processOutputs: [...item.processOutputs],
    })),
    edges: processMap.edges.map((item) => ({ ...item })),
    variables: processMap.variables.map((item) => ({ ...item })),
  };
}
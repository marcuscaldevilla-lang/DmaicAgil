import type { DmaicProcessEdge, DmaicProcessMap, DmaicProcessNode, DmaicProcessVariable } from '@workspace/api-client-react';

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
      node('start', 'start', 'INÍCIO', 44, 252),
      node('senha', 'activity', 'Retirar a senha', 150, 230, ['Cliente chega ao atendimento'], ['Senha impressa']),
      node('documentos', 'decision', 'Cliente possui documentos?', 370, 222, ['Senha impressa'], ['Cliente direcionado']),
      node('dados', 'activity', 'Cadastrar dados pessoais do cliente', 610, 116, ['Documento de identidade', 'Carteirinha do plano'], ['Cadastro do cliente']),
      node('exames', 'activity', 'Cadastrar os exames do pedido médico', 850, 116, ['Pedido médico', 'Computador disponível'], ['Exames cadastrados']),
      node('autorizacao', 'activity', 'Verificar autorização dos exames', 850, 390, ['Indicação dos exames', 'Site do plano'], ['Autorização verificada']),
      node('autorizado', 'decision', 'Exame autorizado pelo plano de saúde?', 610, 402, ['Autorização verificada'], ['Decisão de atendimento']),
      node('guia', 'activity', 'Imprimir guia para realização dos exames', 370, 402, ['Sistema de abertura de guias', 'Impressora'], ['Guia impressa']),
      node('conferir', 'activity', 'Conferir e assinar guia', 150, 402, ['Guia impressa'], ['Guia conferida e assinada']),
      node('encaminhar', 'activity', 'Encaminhar cliente para exame', 150, 600, ['Guia assinada'], ['Cliente na sala de exame']),
      node('end', 'end', 'FIM', 610, 620),
    ],
    edges: [
      edge('e-start-senha', 'start', 'senha'),
      edge('e-senha-docs', 'senha', 'documentos', 'PP: senha impressa'),
      edge('e-docs-dados', 'documentos', 'dados', 'SIM'),
      edge('e-docs-end', 'documentos', 'end', 'NÃO', 'Cliente sem documentos'),
      edge('e-dados-exames', 'dados', 'exames', 'PP: cadastro no sistema'),
      edge('e-exames-autorizacao', 'exames', 'autorizacao', 'PP: cadastro das siglas'),
      edge('e-autorizacao-autorizado', 'autorizacao', 'autorizado', 'PP: verificação concluída'),
      edge('e-autorizado-guia', 'autorizado', 'guia', 'SIM'),
      edge('e-autorizado-end', 'autorizado', 'end', 'NÃO', 'Exame não autorizado'),
      edge('e-guia-conferir', 'guia', 'conferir', 'PP: guia impressa'),
      edge('e-conferir-encaminhar', 'conferir', 'encaminhar', 'PP: guia assinada'),
      edge('e-encaminhar-end', 'encaminhar', 'end', 'PP: cliente na sala de exame'),
    ],
    variables: [
      variable('y1', 'Y1 — Tempo de liberação do cliente', 'Y', 'referência', 'encaminhar', 'min', 'Tempo entre chegada e liberação', 'CTQ principal do fluxo.'),
      variable('y2', 'Y2 — Tempo para cadastrar dados pessoais', 'Y', 'referência', 'dados', 'min', 'Tempo do cadastro', 'Medir do primeiro campo ao cadastro concluído.'),
      variable('y4', 'Y4 — Quantidade de erros ou duplicidade de cadastro', 'Y', 'referência', 'dados', 'ocorrências', 'Erros por atendimento', 'Registrar retrabalho e duplicidade.'),
      variable('y5', 'Y5 — Tempo para cadastrar siglas dos exames', 'Y', 'referência', 'exames', 'min', 'Tempo do cadastro de exames', 'Separar espera de digitação.'),
      variable('y6', 'Y6 — Quantidade de erros de digitação de siglas', 'Y', 'referência', 'exames', 'ocorrências', 'Erros por pedido', 'Validar contra o pedido médico.'),
      variable('y7', 'Y7 — Tempo para verificar a autorização', 'Y', 'referência', 'autorizacao', 'min', 'Tempo da consulta ao retorno', 'Incluir tentativas e espera de retorno.'),
      variable('y9', 'Y9 — Quantidade de guias impressas com erro', 'Y', 'referência', 'conferir', 'ocorrências', 'Guias com erro por período', 'Verificar antes da assinatura.'),
      variable('x1', 'Documento de identidade', 'X', 'ruído', 'dados', 'documento', 'Presença e legibilidade', 'Varia conforme o cliente.'),
      variable('x2', 'Operador de atendimento treinado', 'X', 'controlável', 'dados', 'pessoa', 'Treinamento vigente', 'Controlar por matriz de capacitação.'),
      variable('x3', 'Computador disponível', 'X', 'controlável', 'dados', 'recurso', 'Disponibilidade no posto', 'Monitorar indisponibilidade.'),
      variable('x4', 'Tipo e quantidade de exames solicitados', 'X', 'ruído', 'exames', 'pedido', 'Quantidade de siglas', 'Estratificar na análise.'),
      variable('x5', 'Sistema de cadastro / site do plano', 'X', 'ruído', 'autorizacao', 'sistema', 'Disponibilidade e tempo de resposta', 'Pode ser controlável por contingência.'),
      variable('x6', 'Procedimento de conferência padronizado', 'X', 'controlável', 'conferir', 'procedimento', 'Checklist aplicado', 'Validar adesão do time.'),
      variable('x7', 'Quantidade de documentos apresentados', 'X', 'ruído', 'documentos', 'documentos', 'Documentos por atendimento', 'Registrar sem alterar o processo.'),
      variable('x8', 'Impressora pronta para impressão', 'X', 'controlável', 'guia', 'recurso', 'Disponibilidade e fila', 'Medir falhas e tempo de espera.'),
      variable('x9', 'Indicação do exame e dados do cliente', 'X', 'referência', 'autorizacao', 'informação', 'Completude do pedido', 'Usar para estratificação.'),
    ],
  };
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
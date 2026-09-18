import React, { useState, useEffect } from 'react';

export type OutputY = { id: string; name: string; weight: number };
export type CauseRow = { id: string; cause: string; scores: Record<string, number> };

export type MatrixData = {
  causeAndEffect: {
    outputs: OutputY[];
    rows: CauseRow[];
  };
  solutionPrioritization: {
    criteria: Array<{ id: string; name: string; weight: number }>;
    solutions: Array<{ id: string; description: string; scores: Record<string, number> }>;
  };
};

const CORRELATION_OPTIONS = [
  { value: 0, label: '0 - Ausente' },
  { value: 1, label: '1 - Fraca' },
  { value: 3, label: '3 - Moderada' },
  { value: 5, label: '5 - Forte' },
];

interface Sprint3MatricesProps {
  initialCauseAndEffect?: any;
  initialEffortImpact?: any;
  initialSolutions?: any;
  onChangeCauseAndEffect?: (data: { outputs: OutputY[]; rows: CauseRow[] }) => void;
  onChangeSolutions?: (data: any) => void;
  onSave?: (causeAndEffectData?: any, solutionsData?: any) => void;
}

export const Sprint3Matrices: React.FC<Sprint3MatricesProps> = ({
  initialCauseAndEffect,
  initialEffortImpact,
  initialSolutions,
  onChangeCauseAndEffect,
  onChangeSolutions,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'causeEffect' | 'effortImpact' | 'solutions'>('causeEffect');
  const [isDirty, setIsDirty] = useState(false);

  const [outputs, setOutputs] = useState<OutputY[]>(() => {
    return initialCauseAndEffect?.outputs ?? [
      { id: 'y1', name: 'Qualidade / Satisfação', weight: 10 },
      { id: 'y2', name: 'Tempo de Atendimento', weight: 8 },
      { id: 'y3', name: 'Custo da Operação', weight: 6 },
    ];
  });

  const [causes, setCauses] = useState<CauseRow[]>(() => {
    if (initialCauseAndEffect?.rows) {
      return initialCauseAndEffect.rows.map((r: any, idx: number) => ({
        id: r.id ?? `c_${idx}`,
        cause: r.cause,
        scores: r.scores ?? {},
      }));
    }
    return [
      { id: 'c1', cause: 'Sistema de cadastro lento', scores: { y1: 5, y2: 5, y3: 1 } },
      { id: 'c2', cause: 'Falta de padronização no fluxo de atendimento', scores: { y1: 3, y2: 5, y3: 3 } },
      { id: 'c3', cause: 'Equipe insuficiente no horário de pico', scores: { y1: 3, y2: 5, y3: 5 } },
    ];
  });

  const [effortMap, setEffortMap] = useState<Record<string, 'Baixo' | 'Alto'>>({
    c1: 'Alto',
    c2: 'Baixo',
    c3: 'Alto',
  });

  const [criteria, setCriteria] = useState([
    { id: 'crit1', name: 'Baixo Custo', weight: 7 },
    { id: 'crit2', name: 'Facilidade', weight: 8 },
    { id: 'crit3', name: 'Impacto Positivo sobre a Causa', weight: 10 },
  ]);

  const [solutions, setSolutions] = useState(() => {
    if (initialSolutions?.solutions) {
      return initialSolutions.solutions.map((s: any, idx: number) => ({
        id: s.id ?? `s_${idx}`,
        description: s.description,
        scores: s.scores ?? {},
      }));
    }
    return [
      { id: 's1', description: 'Criar checklist padronizado de atendimento no sistema', scores: { crit1: 5, crit2: 5, crit3: 5 } },
      { id: 's2', description: 'Otimizar consultas do banco de dados de clientes', scores: { crit1: 3, crit2: 1, crit3: 5 } },
      { id: 's3', description: 'Escalonamento flexível de turnos para horários de pico', scores: { crit1: 3, crit2: 3, crit3: 3 } },
    ];
  });

  useEffect(() => {
    if (initialCauseAndEffect?.outputs) setOutputs(initialCauseAndEffect.outputs);
    if (initialCauseAndEffect?.rows) {
      setCauses(
        initialCauseAndEffect.rows.map((r: any, idx: number) => ({
          id: r.id ?? `c_${idx}`,
          cause: r.cause,
          scores: r.scores ?? {},
        }))
      );
    }
    if (initialSolutions?.solutions) {
      setSolutions(
        initialSolutions.solutions.map((s: any, idx: number) => ({
          id: s.id ?? `s_${idx}`,
          description: s.description,
          scores: s.scores ?? {},
        }))
      );
    }
  }, [initialCauseAndEffect, initialSolutions]);

  const updateCauses = (newCauses: CauseRow[]) => {
    setCauses(newCauses);
    setIsDirty(true);
    onChangeCauseAndEffect?.({ outputs, rows: newCauses });
  };

  const updateSolutions = (newSolutions: any[]) => {
    setSolutions(newSolutions);
    setIsDirty(true);
    onChangeSolutions?.({ criteria, solutions: newSolutions });
  };

  const calculateCauseTotal = (scores: Record<string, number>) => {
    return outputs.reduce((sum, out) => sum + (scores[out.id] || 0) * out.weight, 0);
  };

  const calculateSolutionTotal = (scores: Record<string, number>) => {
    return criteria.reduce((sum, crit) => sum + (scores[crit.id] || 0) * crit.weight, 0);
  };

  return (
    <div className="w-full space-y-6 bg-card p-6 rounded-xl border border-border shadow-xs">
      {/* Barra superior de abas e botão de salvar no Repositório */}
      <div className="flex flex-wrap items-center justify-between border-b border-border pb-2 gap-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('causeEffect')}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'causeEffect'
                ? 'border-primary text-primary bg-primary/10 rounded-t-lg'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            1. Matriz de Causa e Efeito
          </button>
          <button
            onClick={() => setActiveTab('effortImpact')}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'effortImpact'
                ? 'border-primary text-primary bg-primary/10 rounded-t-lg'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            2. Matriz Esforço x Impacto
          </button>
          <button
            onClick={() => setActiveTab('solutions')}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'solutions'
                ? 'border-primary text-primary bg-primary/10 rounded-t-lg'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            3. Matriz de Priorização (Soluções)
          </button>
        </div>

        {onSave && (
          <button
            onClick={() => {
              const currentCauseData = { outputs, rows: causes };
              const currentSolutionData = { criteria, solutions };

              onChangeCauseAndEffect?.(currentCauseData);
              onChangeSolutions?.(currentSolutionData);
              onSave(currentCauseData, currentSolutionData);
              setIsDirty(false);
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              isDirty
                ? 'bg-primary text-primary-foreground shadow-sm hover:brightness-95'
                : 'border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {isDirty ? 'Salvar no Repositório' : 'Salvo no Repositório'}
          </button>
        )}
      </div>

      {/* ABA 1: CAUSA E EFEITO */}
      {activeTab === 'causeEffect' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-foreground">Matriz de Causa e Efeito (X × Y)</h3>
              <p className="text-xs text-muted-foreground">Correlacione as causas (X) com as saídas críticas (Y). Escala: 0, 1, 3 ou 5.</p>
            </div>
            <button
              onClick={() => {
                const newId = `c${Date.now()}`;
                updateCauses([...causes, { id: newId, cause: 'Nova Causa Mapeada', scores: {} }]);
              }}
              className="px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:brightness-95 transition-all"
            >
              + Adicionar Causa
            </button>
          </div>

          <div className="overflow-x-auto border border-border rounded-lg">
            <p className="p-2 text-[11px] text-muted-foreground md:hidden">Deslize horizontalmente para comparar causas, saídas e scores.</p>
            <table className="min-w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-sidebar text-sidebar-foreground text-xs uppercase">
                  <th className="p-3 border border-border w-1/3">Entradas (Causas X)</th>
                  {outputs.map((out) => (
                    <th key={out.id} className="p-2 border border-border text-center">
                      <div>{out.name}</div>
                      <div className="text-[11px] font-normal text-primary">Peso: {out.weight}</div>
                    </th>
                  ))}
                  <th className="p-3 border border-border text-center bg-sidebar/80 w-28">Score Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {causes.map((c) => {
                  const score = calculateCauseTotal(c.scores);
                  return (
                    <tr key={c.id} className="hover:bg-muted/40">
                      <td className="p-2 border border-border">
                        <input
                          type="text"
                          value={c.cause}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateCauses(causes.map((item) => (item.id === c.id ? { ...item, cause: val } : item)));
                          }}
                          className="w-full bg-transparent focus:outline-none font-medium text-foreground text-xs"
                        />
                      </td>
                      {outputs.map((out) => (
                        <td key={out.id} className="p-2 border border-border text-center">
                          <select
                            value={c.scores[out.id] ?? 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateCauses(
                                causes.map((item) =>
                                  item.id === c.id
                                    ? { ...item, scores: { ...item.scores, [out.id]: val } }
                                    : item
                                )
                              );
                            }}
                            className="text-xs bg-background border border-border rounded px-2 py-1 font-semibold focus:border-primary focus:outline-none"
                          >
                            {CORRELATION_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      ))}
                      <td className="p-3 border border-border text-center font-bold text-primary bg-muted/20">
                        {score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 2: ESFORÇO X IMPACTO */}
      {activeTab === 'effortImpact' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Matriz Esforço x Impacto (2x2)</h3>
            <p className="text-xs text-muted-foreground">O impacto é derivado da pontuação da Matriz de Causa e Efeito.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-amber-500/40 bg-amber-500/10 p-4 rounded-xl min-h-[160px]">
              <div className="font-bold text-amber-700 text-xs uppercase tracking-wider mb-2">Prioritário com Análise (Alto Impacto / Alto Esforço)</div>
              <ul className="space-y-1.5">
                {causes.filter((c) => calculateCauseTotal(c.scores) >= 50 && effortMap[c.id] === 'Alto').map((c) => (
                  <li key={c.id} className="text-xs bg-card p-2 rounded border border-border flex justify-between items-center">
                    <span>{c.cause}</span>
                    <span className="font-bold text-amber-700">Score: {calculateCauseTotal(c.scores)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-destructive/40 bg-destructive/10 p-4 rounded-xl min-h-[160px]">
              <div className="font-bold text-destructive text-xs uppercase tracking-wider mb-2">Podemos Descartar (Baixo Impacto / Alto Esforço)</div>
              <ul className="space-y-1.5">
                {causes.filter((c) => calculateCauseTotal(c.scores) < 50 && effortMap[c.id] === 'Alto').map((c) => (
                  <li key={c.id} className="text-xs bg-card p-2 rounded border border-border flex justify-between items-center">
                    <span>{c.cause}</span>
                    <span className="font-bold text-destructive">Score: {calculateCauseTotal(c.scores)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-primary/40 bg-primary/10 p-4 rounded-xl min-h-[160px]">
              <div className="font-bold text-primary text-xs uppercase tracking-wider mb-2">★ Maior Interesse (Alto Impacto / Baixo Esforço)</div>
              <ul className="space-y-1.5">
                {causes.filter((c) => calculateCauseTotal(c.scores) >= 50 && effortMap[c.id] !== 'Alto').map((c) => (
                  <li key={c.id} className="text-xs bg-card p-2 rounded border border-border flex justify-between items-center">
                    <span>{c.cause}</span>
                    <span className="font-bold text-primary">Score: {calculateCauseTotal(c.scores)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-border bg-muted/40 p-4 rounded-xl min-h-[160px]">
              <div className="font-bold text-muted-foreground text-xs uppercase tracking-wider mb-2">Ganhos Rápidos / Secundários (Baixo Impacto / Baixo Esforço)</div>
              <ul className="space-y-1.5">
                {causes.filter((c) => calculateCauseTotal(c.scores) < 50 && effortMap[c.id] !== 'Alto').map((c) => (
                  <li key={c.id} className="text-xs bg-card p-2 rounded border border-border flex justify-between items-center">
                    <span>{c.cause}</span>
                    <span className="font-bold text-muted-foreground">Score: {calculateCauseTotal(c.scores)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: PRIORIZAÇÃO DE SOLUÇÕES */}
      {activeTab === 'solutions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-foreground">Matriz de Priorização de Soluções</h3>
              <p className="text-xs text-muted-foreground">Classificação das soluções propostas para as causas de maior impacto.</p>
            </div>
            <button
              onClick={() => {
                const newId = `s${Date.now()}`;
                updateSolutions([...solutions, { id: newId, description: 'Nova Ideia de Solução', scores: {} }]);
              }}
              className="px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:brightness-95 transition-all"
            >
              + Adicionar Solução
            </button>
          </div>

          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="min-w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-sidebar text-sidebar-foreground text-xs uppercase font-bold">
                  <th className="p-3 border border-border w-2/5">Solução Proposta</th>
                  {criteria.map((crit) => (
                    <th key={crit.id} className="p-2 border border-border text-center">
                      <div>{crit.name}</div>
                      <div className="text-[11px] font-normal text-primary">Peso: {crit.weight}</div>
                    </th>
                  ))}
                  <th className="p-3 border border-border text-center bg-sidebar/80 w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {solutions.map((sol: any) => {
                  const score = calculateSolutionTotal(sol.scores);
                  return (
                    <tr key={sol.id} className="hover:bg-muted/40">
                      <td className="p-2 border border-border">
                        <input
                          type="text"
                          value={sol.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateSolutions(solutions.map((s: any) => (s.id === sol.id ? { ...s, description: val } : s)));
                          }}
                          className="w-full bg-transparent focus:outline-none font-medium text-foreground text-xs"
                        />
                      </td>
                      {criteria.map((crit) => (
                        <td key={crit.id} className="p-2 border border-border text-center">
                          <select
                            value={sol.scores[crit.id] ?? 0}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateSolutions(
                                solutions.map((s: any) =>
                                  s.id === sol.id
                                    ? { ...s, scores: { ...s.scores, [crit.id]: val } }
                                    : s
                                )
                              );
                            }}
                            className="text-xs bg-background border border-border rounded px-2 py-1 font-semibold focus:border-primary focus:outline-none"
                          >
                            {CORRELATION_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      ))}
                      <td className="p-3 border border-border text-center font-bold text-primary bg-muted/20">
                        {score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
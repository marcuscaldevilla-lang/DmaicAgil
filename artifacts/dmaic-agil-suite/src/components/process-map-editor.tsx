import { useMemo, useRef, useState } from 'react';
import type { DmaicProcessMap, DmaicProcessNode, DmaicProcessVariable } from '@workspace/api-client-react';
import { Copy, GitBranch, Image as ImageIcon, Link2, Plus, Save, Trash2, X } from 'lucide-react';

type Props = {
  value: DmaicProcessMap;
  onChange: (value: DmaicProcessMap) => void;
  onSave: () => void;
  dirty?: boolean;
  saved?: boolean;
};

const escapeSvg = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function processMapBounds(value: DmaicProcessMap) {
  const maxX = Math.max(...value.nodes.map((node) => node.position.x + NODE_WIDTH), 480);
  const maxY = Math.max(...value.nodes.map((node) => node.position.y + NODE_HEIGHT), 240);
  return { width: maxX + 48, height: maxY + 152 };
}

export function processMapSvg(value: DmaicProcessMap) {
  const { width, height } = processMapBounds(value);
  const nodeById = new Map(value.nodes.map((node) => [node.id, node]));
  const nodes = value.nodes.map((node) => {
    const label = escapeSvg(node.label);
    const x = node.position.x + 24;
    const y = node.position.y + 104;
    const centerX = x + NODE_WIDTH / 2;
    const centerY = y + NODE_HEIGHT / 2;
    const variables = value.variables.filter((variable) => variable.nodeId === node.id);
    const yVariables = variables.filter((variable) => variable.kind === 'Y');
    const xVariables = variables.filter((variable) => variable.kind === 'X');
    const variableText = (variable: DmaicProcessVariable) => {
      const prefix = variable.kind === 'Y' ? 'Y' : variable.classification === 'controlável' ? 'xC' : variable.classification === 'ruído' ? 'xR' : 'x';
      return `${prefix} – ${variable.name}${variable.unit ? ` (${variable.unit})` : ''}`;
    };
    const yLabels = yVariables.map((variable, index) => `<text x="${x}" y="${y - 18 - (yVariables.length - index - 1) * 16}" text-anchor="start" class="variable y-variable">${escapeSvg(variableText(variable))}</text>`).join('');
    const xLabels = xVariables.map((variable, index) => `<text x="${x}" y="${y + NODE_HEIGHT + 18 + index * 16}" text-anchor="start" class="variable x-variable">${escapeSvg(variableText(variable))}</text>`).join('');
    const shape = node.type === 'decision'
      ? `<polygon points="${centerX},${y} ${x + NODE_WIDTH},${centerY} ${centerX},${y + NODE_HEIGHT} ${x},${centerY}" fill="#fffdfa" stroke="#94a3b8" stroke-width="2" filter="url(#shadow)"/><text x="${centerX}" y="${centerY + 4}" text-anchor="middle">${label}</text>`
      : `<rect x="${x}" y="${y}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="${node.type === 'start' || node.type === 'end' ? 38 : 14}" fill="#fffdfa" stroke="#cbd5e1" stroke-width="2" filter="url(#shadow)"/><text x="${centerX}" y="${centerY + 4}" text-anchor="middle">${label}</text>`;
    return `${yLabels}${shape}${xLabels}`;
  }).join('');
  const edges = value.edges.map((edge) => {
    const from = nodeById.get(edge.source); const to = nodeById.get(edge.target);
    if (!from || !to) return '';
    const x1 = from.position.x + 24 + NODE_WIDTH / 2; const y1 = from.position.y + 104 + NODE_HEIGHT / 2;
    const x2 = to.position.x + 24 + NODE_WIDTH / 2; const y2 = to.position.y + 104 + NODE_HEIGHT / 2;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)"/><text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 8}" text-anchor="middle">${escapeSvg(edge.label)}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#0f172a" flood-opacity=".18"/></filter><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill="#94a3b8"/></marker></defs><rect width="100%" height="100%" fill="#ffffff"/>${edges}${nodes}<style>text{font-family:Arial,sans-serif;font-size:13px;font-weight:700;fill:#1e293b}.variable{font-size:11px;font-weight:400}.y-variable{fill:#2563eb}.x-variable{fill:#334155}</style></svg>`;
}

export function exportProcessMapPdf(value: DmaicProcessMap) {
  const popup = window.open('', '_blank', 'width=1200,height=900');
  if (!popup) return;
  const svg = processMapSvg(value);
  popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Mapa de Processo</title><style>body{font-family:Arial,sans-serif;margin:0;padding:24px}h1{font-size:20px}.map{overflow:auto;border:1px solid #e2e8f0;padding:12px}svg{display:block;max-width:none}.bar{display:flex;justify-content:flex-end;margin-bottom:16px}@media print{.bar{display:none}body{padding:0}}</style></head><body><div class="bar"><button onclick="window.print()">Imprimir / Salvar como PDF</button></div><h1>Mapa de Processo</h1><div class="map">${svg}</div></body></html>`);
  popup.document.close();
  popup.focus();
}

export function exportProcessMapPng(value: DmaicProcessMap) {
  const svg = processMapSvg(value);
  const { width, height } = processMapBounds(value);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.scale(2, 2);
    context.drawImage(image, 0, 0, width, height);
    const link = document.createElement('a');
    link.download = 'mapa-de-processo.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 76;
const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const splitLines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);

export function ProcessMapEditor({ value, onChange, onSave, dirty, saved }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState(value.nodes[0]?.id ?? '');
  const [selectedEdgeId, setSelectedEdgeId] = useState('');
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [connectingFrom, setConnectingFrom] = useState('');
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const selectedNode = value.nodes.find((item) => item.id === selectedNodeId);
  const selectedEdge = value.edges.find((item) => item.id === selectedEdgeId);
  const nodeVariables = value.variables.filter((item) => item.nodeId === selectedNodeId);
  const nodeById = useMemo(() => new Map(value.nodes.map((item) => [item.id, item])), [value.nodes]);

  const patchNode = (patch: Partial<DmaicProcessNode>) => {
    if (!selectedNode) return;
    onChange({ ...value, nodes: value.nodes.map((item) => item.id === selectedNode.id ? { ...item, ...patch } : item) });
  };

  const addNode = (type: DmaicProcessNode['type']) => {
    const created: DmaicProcessNode = {
      id: newId('node'), type, label: type === 'decision' ? 'Nova decisão?' : type === 'activity' ? 'Nova atividade' : type === 'start' ? 'INÍCIO' : 'FIM',
      position: { x: 80 + (value.nodes.length % 5) * 210, y: 90 + Math.floor(value.nodes.length / 5) * 130 },
      processInputs: [], processOutputs: [],
    };
    onChange({ ...value, nodes: [...value.nodes, created] });
    setSelectedNodeId(created.id);
    setSelectedEdgeId('');
  };

  const removeNode = () => {
    if (!selectedNode) return;
    onChange({
      ...value,
      nodes: value.nodes.filter((item) => item.id !== selectedNode.id),
      edges: value.edges.filter((item) => item.source !== selectedNode.id && item.target !== selectedNode.id),
      variables: value.variables.filter((item) => item.nodeId !== selectedNode.id),
    });
    setSelectedNodeId('');
  };

  const duplicateNode = () => {
    if (!selectedNode) return;
    const copy = { ...selectedNode, id: newId('node'), label: `${selectedNode.label} — cópia`, position: { x: selectedNode.position.x + 32, y: selectedNode.position.y + 32 } };
    onChange({ ...value, nodes: [...value.nodes, copy] });
    setSelectedNodeId(copy.id);
  };

  const handleNodeClick = (id: string) => {
    if (connectingFrom && connectingFrom !== id) {
      if (!value.edges.some((edge) => edge.source === connectingFrom && edge.target === id)) {
        const created = { id: newId('edge'), source: connectingFrom, target: id, label: '', condition: '' };
        onChange({ ...value, edges: [...value.edges, created] });
        setSelectedEdgeId(created.id);
      }
      setConnectingFrom('');
    }
    setSelectedNodeId(id);
    setPropertiesOpen(true);
  };

  const moveNode = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || !canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(4800, event.clientX - bounds.left + canvasRef.current.scrollLeft - drag.dx));
    const y = Math.max(0, Math.min(4800, event.clientY - bounds.top + canvasRef.current.scrollTop - drag.dy));
    onChange({ ...value, nodes: value.nodes.map((item) => item.id === drag.id ? { ...item, position: { x, y } } : item) });
  };

  const addVariable = () => {
    if (!selectedNode) return;
    const created: DmaicProcessVariable = {
      id: newId('var'), nodeId: selectedNode.id, name: 'Nova variável', kind: 'X', classification: 'controlável', unit: '', measure: '', notes: '',
    };
    onChange({ ...value, variables: [...value.variables, created] });
  };

  const patchVariable = (id: string, patch: Partial<DmaicProcessVariable>) =>
    onChange({ ...value, variables: value.variables.map((item) => item.id === id ? { ...item, ...patch } : item) });

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm" data-testid="process-map-editor">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Mapa de processo</p>
          <h2 className="mt-1 text-lg font-bold text-foreground">Fluxo editável e variáveis por etapa</h2>
          <p className="mt-1 text-xs text-muted-foreground">Arraste as etapas, conecte o fluxo e relacione os Ys e Xs do projeto.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onSave} disabled={!dirty} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"><Save size={14} /> {saved ? 'Salvo no Repositório' : 'Salvar no Repositório'}</button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-border bg-muted/30 px-4 py-3">
        {(['activity', 'decision', 'start', 'end'] as const).map((type) => <button key={type} type="button" onClick={() => addNode(type)} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:border-primary">{type === 'activity' ? 'Atividade' : type === 'decision' ? 'Decisão' : type === 'start' ? 'Início' : 'Fim'}</button>)}
        <span className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground"><b className="text-blue-700">Y</b> saída do processo <b className="text-emerald-700">X</b> entrada controlável <b className="text-amber-700">X</b> ruído <b className="text-slate-700">X</b> referência</span>
      </div>

      <div className="grid min-h-[680px] lg:grid-cols-[minmax(0,1fr)_340px]">
        <div ref={canvasRef} onPointerMove={moveNode} onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)} className="relative min-h-[680px] overflow-auto bg-[radial-gradient(circle,#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]">
          <div className="relative h-[920px] w-[1250px]">
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              <defs><marker id="process-map-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="currentColor" /></marker></defs>
              {value.edges.map((item) => {
                const from = nodeById.get(item.source); const to = nodeById.get(item.target);
                if (!from || !to) return null;
                const x1 = from.position.x + NODE_WIDTH / 2, y1 = from.position.y + NODE_HEIGHT / 2;
                const x2 = to.position.x + NODE_WIDTH / 2, y2 = to.position.y + NODE_HEIGHT / 2;
                return <g key={item.id} className={item.id === selectedEdgeId ? 'text-primary' : 'text-slate-400'}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={item.id === selectedEdgeId ? 3 : 2} markerEnd="url(#process-map-arrow)" /><text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} textAnchor="middle" className="fill-foreground text-[11px] font-bold">{item.label}</text></g>;
              })}
            </svg>
            {value.edges.map((item) => {
              const from = nodeById.get(item.source); const to = nodeById.get(item.target); if (!from || !to) return null;
              return <button key={`hit-${item.id}`} type="button" aria-label={`Selecionar conexão ${item.label || item.id}`} onClick={() => { setSelectedEdgeId(item.id); setSelectedNodeId(''); setPropertiesOpen(true); }} className="absolute z-[1] h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent" style={{ left: (from.position.x + to.position.x) / 2 + NODE_WIDTH / 2, top: (from.position.y + to.position.y) / 2 + NODE_HEIGHT / 2 }} />;
            })}
            {value.nodes.map((item) => {
              const vars = value.variables.filter((variable) => variable.nodeId === item.id);
              return <div key={item.id} onPointerDown={(event) => { if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLButtonElement) return; const target = event.currentTarget; target.setPointerCapture(event.pointerId); setDrag({ id: item.id, dx: event.nativeEvent.offsetX, dy: event.nativeEvent.offsetY }); }} onClick={() => handleNodeClick(item.id)} className={`absolute z-10 flex cursor-move select-none items-center justify-center text-center text-xs font-bold transition ${selectedNodeId === item.id ? 'ring-4 ring-primary/10' : ''} ${item.type === 'decision' ? '[filter:drop-shadow(0_4px_4px_rgba(15,23,42,0.18))] [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)] bg-slate-300 p-[2px]' : `border-2 bg-background px-4 shadow-md ${selectedNodeId === item.id ? 'border-primary' : 'border-slate-300'} ${item.type === 'start' || item.type === 'end' ? 'rounded-full' : 'rounded-xl'}`} ${item.type === 'decision' ? '' : 'px-4'}`} style={{ left: item.position.x, top: item.position.y, width: NODE_WIDTH, height: NODE_HEIGHT }}>
                <span className={item.type === 'decision' ? 'flex h-full w-full items-center justify-center bg-background px-4 [clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]' : 'line-clamp-3'}>{item.label}</span>
                {vars.length > 0 && <span className="absolute -bottom-3 rounded-full border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">{vars.filter((v) => v.kind === 'Y').length}Y · {vars.filter((v) => v.kind === 'X').length}X</span>}
              </div>;
            })}
          </div>
        </div>

        <aside className={`border-l border-border bg-background p-4 transition-all ${propertiesOpen ? '' : 'hidden'}`}>
          {selectedEdge ? <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-bold"><Link2 size={16} /> Conexão</h3><button type="button" title="Fechar propriedades" aria-label="Fechar propriedades" onClick={() => { setPropertiesOpen(false); setSelectedEdgeId(''); setSelectedNodeId(''); }} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={16} /></button></div><Field label="Rótulo" value={selectedEdge.label} onChange={(label) => onChange({ ...value, edges: value.edges.map((item) => item.id === selectedEdge.id ? { ...item, label } : item) })} /><Field label="Condição / observação" value={selectedEdge.condition} onChange={(condition) => onChange({ ...value, edges: value.edges.map((item) => item.id === selectedEdge.id ? { ...item, condition } : item) })} /><button type="button" onClick={() => { onChange({ ...value, edges: value.edges.filter((item) => item.id !== selectedEdge.id) }); setSelectedEdgeId(''); }} className="flex items-center gap-2 text-xs font-bold text-destructive"><Trash2 size={14} /> Excluir conexão</button></div>
          : selectedNode ? <div className="space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-bold">Propriedades da etapa</h3><div className="flex items-center gap-1"><button title="Duplicar" type="button" onClick={duplicateNode} className="rounded p-2 hover:bg-muted"><Copy size={15} /></button><button title="Excluir" type="button" onClick={removeNode} className="rounded p-2 text-destructive hover:bg-muted"><Trash2 size={15} /></button><button title="Fechar propriedades" aria-label="Fechar propriedades" type="button" onClick={() => { setPropertiesOpen(false); setSelectedNodeId(''); setSelectedEdgeId(''); }} className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={15} /></button></div></div>
            <Field label="Nome" value={selectedNode.label} onChange={(label) => patchNode({ label })} />
            <label className="block text-xs font-bold">Tipo<select value={selectedNode.type} onChange={(event) => patchNode({ type: event.target.value as DmaicProcessNode['type'] })} className="mt-1 w-full rounded-lg border border-border bg-background p-2 font-normal"><option value="activity">Atividade</option><option value="decision">Decisão</option><option value="start">Início</option><option value="end">Fim</option></select></label>
            <Field label="Entradas do processo (uma por linha)" value={selectedNode.processInputs.join('\n')} multiline onChange={(text) => patchNode({ processInputs: splitLines(text) })} />
            <Field label="Saídas do processo (uma por linha)" value={selectedNode.processOutputs.join('\n')} multiline onChange={(text) => patchNode({ processOutputs: splitLines(text) })} />
            <button type="button" onClick={() => setConnectingFrom(connectingFrom === selectedNode.id ? '' : selectedNode.id)} className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${connectingFrom === selectedNode.id ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}><GitBranch size={15} /> {connectingFrom === selectedNode.id ? 'Clique na etapa de destino' : 'Conectar a outra etapa'}</button>
            <div className="border-t border-border pt-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Ys e Xs desta etapa</h3><button type="button" onClick={addVariable} className="flex items-center gap-1 text-xs font-bold text-primary"><Plus size={14} /> Variável</button></div>
              <div className="space-y-3">{nodeVariables.map((item) => <VariableCard key={item.id} value={item} onChange={(patch) => patchVariable(item.id, patch)} onRemove={() => onChange({ ...value, variables: value.variables.filter((variable) => variable.id !== item.id) })} />)}{nodeVariables.length === 0 && <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Nenhuma variável relacionada a esta etapa.</p>}</div>
            </div>
          </div> : <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">Selecione uma etapa ou conexão para editar. Para criar um fluxo, selecione uma etapa, clique em “Conectar” e depois na etapa de destino.</div>}
        </aside>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-3"><p className="text-[11px] text-muted-foreground">Exporte somente o mapa de processos em imagem.</p><button type="button" onClick={() => exportProcessMapPng(value)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted"><ImageIcon size={14} /> Exportar mapa em PNG</button></div>
    </section>
  );
}

function Field({ label, value, onChange, multiline }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  const className = 'mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs font-normal';
  return <label className="block text-xs font-bold">{label}{multiline ? <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className={className} /> : <input value={value} onChange={(event) => onChange(event.target.value)} className={className} />}</label>;
}

function VariableCard({ value, onChange, onRemove }: { value: DmaicProcessVariable; onChange: (patch: Partial<DmaicProcessVariable>) => void; onRemove: () => void }) {
  return <div className="space-y-2 rounded-xl border border-border p-3"><div className="flex gap-2"><select value={value.kind} onChange={(event) => onChange({ kind: event.target.value as DmaicProcessVariable['kind'] })} className="rounded-md border border-border bg-background px-2 text-xs font-bold"><option>Y</option><option>X</option></select><input value={value.name} onChange={(event) => onChange({ name: event.target.value })} className="min-w-0 flex-1 rounded-md border border-border bg-background p-2 text-xs" /><button type="button" onClick={onRemove} className="text-destructive"><Trash2 size={14} /></button></div><select value={value.classification} onChange={(event) => onChange({ classification: event.target.value as DmaicProcessVariable['classification'] })} className="w-full rounded-md border border-border bg-background p-2 text-xs"><option value="controlável">Controlável</option><option value="ruído">Ruído</option><option value="referência">Referência</option></select><Field label="Unidade" value={value.unit} onChange={(unit) => onChange({ unit })} /><Field label="Forma de medição" value={value.measure} onChange={(measure) => onChange({ measure })} /><Field label="Observações" value={value.notes} multiline onChange={(notes) => onChange({ notes })} /></div>;
}
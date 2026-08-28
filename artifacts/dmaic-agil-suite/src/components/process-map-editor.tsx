import { useMemo, useRef, useState } from 'react';
import type { DmaicProcessMap, DmaicProcessNode, DmaicProcessVariable } from '@workspace/api-client-react';
import { Copy, GitBranch, Link2, Plus, Printer, Save, Trash2 } from 'lucide-react';

type Props = {
  value: DmaicProcessMap;
  onChange: (value: DmaicProcessMap) => void;
  onSave: () => void;
  dirty?: boolean;
  saved?: boolean;
};

const NODE_WIDTH = 180;
const NODE_HEIGHT = 76;
const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const splitLines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);

export function ProcessMapEditor({ value, onChange, onSave, dirty, saved }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState(value.nodes[0]?.id ?? '');
  const [selectedEdgeId, setSelectedEdgeId] = useState('');
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
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"><Printer size={14} /> Imprimir / PDF</button>
          <button type="button" onClick={onSave} disabled={!dirty} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"><Save size={14} /> {saved ? 'Salvo' : 'Salvar mapa'}</button>
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
              return <button key={`hit-${item.id}`} type="button" aria-label={`Selecionar conexão ${item.label || item.id}`} onClick={() => { setSelectedEdgeId(item.id); setSelectedNodeId(''); }} className="absolute z-[1] h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent" style={{ left: (from.position.x + to.position.x) / 2 + NODE_WIDTH / 2, top: (from.position.y + to.position.y) / 2 + NODE_HEIGHT / 2 }} />;
            })}
            {value.nodes.map((item) => {
              const vars = value.variables.filter((variable) => variable.nodeId === item.id);
              return <div key={item.id} onPointerDown={(event) => { const target = event.currentTarget; target.setPointerCapture(event.pointerId); setDrag({ id: item.id, dx: event.nativeEvent.offsetX, dy: event.nativeEvent.offsetY }); }} onClick={() => handleNodeClick(item.id)} className={`absolute z-10 flex cursor-move select-none items-center justify-center border-2 bg-background px-4 text-center text-xs font-bold shadow-md transition ${selectedNodeId === item.id ? 'border-primary ring-4 ring-primary/10' : 'border-slate-300'} ${item.type === 'decision' ? 'rounded-sm' : item.type === 'start' || item.type === 'end' ? 'rounded-full' : 'rounded-xl'}`} style={{ left: item.position.x, top: item.position.y, width: NODE_WIDTH, height: NODE_HEIGHT }}>
                <span className="line-clamp-3">{item.label}</span>
                {vars.length > 0 && <span className="absolute -bottom-3 rounded-full border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">{vars.filter((v) => v.kind === 'Y').length}Y · {vars.filter((v) => v.kind === 'X').length}X</span>}
              </div>;
            })}
          </div>
        </div>

        <aside className="border-l border-border bg-background p-4">
          {selectedEdge ? <div className="space-y-3"><h3 className="flex items-center gap-2 font-bold"><Link2 size={16} /> Conexão</h3><Field label="Rótulo" value={selectedEdge.label} onChange={(label) => onChange({ ...value, edges: value.edges.map((item) => item.id === selectedEdge.id ? { ...item, label } : item) })} /><Field label="Condição / observação" value={selectedEdge.condition} onChange={(condition) => onChange({ ...value, edges: value.edges.map((item) => item.id === selectedEdge.id ? { ...item, condition } : item) })} /><button type="button" onClick={() => { onChange({ ...value, edges: value.edges.filter((item) => item.id !== selectedEdge.id) }); setSelectedEdgeId(''); }} className="flex items-center gap-2 text-xs font-bold text-destructive"><Trash2 size={14} /> Excluir conexão</button></div>
          : selectedNode ? <div className="space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-bold">Propriedades da etapa</h3><div className="flex gap-1"><button title="Duplicar" type="button" onClick={duplicateNode} className="rounded p-2 hover:bg-muted"><Copy size={15} /></button><button title="Excluir" type="button" onClick={removeNode} className="rounded p-2 text-destructive hover:bg-muted"><Trash2 size={15} /></button></div></div>
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
import { GitBranch, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { AiMindMapContent } from '../../types/ai';
import type { MindMapEdge, MindMapMode, MindMapNode } from '../../types/mentalMap';
import { layoutAiMindMap } from '../../utils/aiMindMapLayout';
import { newId } from '../../utils/study';
import { MindMapCanvas } from '../mindmaps/MindMapCanvas';
import { Button } from '../ui/Button';

interface AiMindMapPreviewProps {
  content: AiMindMapContent;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  mode: MindMapMode;
  saving: boolean;
  onContentChange: (content: AiMindMapContent) => void;
  onNodesChange: (nodes: MindMapNode[]) => void;
  onEdgesChange: (edges: MindMapEdge[]) => void;
  onModeChange: (mode: MindMapMode) => void;
  onSave: () => void;
  onRegenerate: () => void;
  onCancel: () => void;
}

function childPosition(parent: MindMapNode, index: number) {
  const offsetX = parent.type === 'central' ? 260 : 210;
  const offsetY = (index - 1) * 88;
  return { x: parent.x + offsetX, y: parent.y + offsetY };
}

function makeChildType(parent: MindMapNode): MindMapNode['type'] {
  if (parent.type === 'central') return 'category';
  if (parent.type === 'category') return 'term';
  return 'definition';
}

export function AiMindMapPreview({
  content,
  nodes,
  edges,
  mode,
  saving,
  onContentChange,
  onNodesChange,
  onEdgesChange,
  onModeChange,
  onSave,
  onRegenerate,
  onCancel,
}: AiMindMapPreviewProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [expandedTermIds, setExpandedTermIds] = useState<Set<string>>(() => new Set());
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  const updateTitle = (value: string) => {
    onContentChange({ ...content, title: value });
    onNodesChange(nodes.map((node) => (node.id === 'central' ? { ...node, label: value } : node)));
  };

  const setSummaryMode = (nextMode: MindMapMode) => {
    onModeChange(nextMode);
    setExpandedTermIds(nextMode === 'complete' ? new Set(nodes.filter((node) => node.type === 'term').map((node) => node.id)) : new Set());
  };

  const toggleTerm = (termId: string) => {
    setExpandedTermIds((current) => {
      const next = new Set(current);
      if (next.has(termId)) next.delete(termId);
      else next.add(termId);
      return next;
    });
  };

  const updateSelectedNode = (field: 'label' | 'fullText', value: string) => {
    if (!selectedNode) return;
    const updatedNode = { ...selectedNode, [field]: value };
    onNodesChange(nodes.map((node) => (node.id === selectedNode.id ? updatedNode : node)));

    if (selectedNode.type === 'central' && field === 'label') {
      onContentChange({ ...content, title: value });
    }
  };

  const addChildNode = () => {
    if (!selectedNode) return;
    const childType = makeChildType(selectedNode);
    const childId = newId(`ai-${childType}`);
    const siblings = edges.filter((edge) => edge.source === selectedNode.id).length;
    const position = childPosition(selectedNode, siblings);
    const child: MindMapNode = {
      id: childId,
      type: childType,
      label: childType === 'category' ? 'Nova categoria' : childType === 'term' ? 'Novo conceito' : 'Nova explicação',
      fullText: 'Edite este conteúdo antes de salvar.',
      subtitle: childType === 'definition' ? 'Explicação' : undefined,
      categoryId: selectedNode.type === 'category' ? selectedNode.id : selectedNode.categoryId,
      flashcardId: childType === 'term' ? newId('ai-card') : selectedNode.flashcardId,
      ...position,
    };

    onNodesChange([...nodes, child]);
    onEdgesChange([...edges, { id: `edge-${selectedNode.id}-${childId}`, source: selectedNode.id, target: childId }]);
    setSelectedNodeId(childId);
    if (childType === 'term') setExpandedTermIds((current) => new Set(current).add(childId));
  };

  const deleteSelectedNode = () => {
    if (!selectedNode || selectedNode.id === 'central') return;

    const descendants = new Set<string>([selectedNode.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const edge of edges) {
        if (!descendants.has(edge.source) || descendants.has(edge.target)) continue;
        descendants.add(edge.target);
        changed = true;
      }
    }

    onNodesChange(nodes.filter((node) => !descendants.has(node.id)));
    onEdgesChange(edges.filter((edge) => !descendants.has(edge.source) && !descendants.has(edge.target)));
    setSelectedNodeId(undefined);
  };

  const resetLayout = () => {
    const layout = layoutAiMindMap(content);
    onNodesChange(layout.nodes);
    onEdgesChange(layout.edges);
    onModeChange(layout.mode);
    setExpandedTermIds(new Set());
    setSelectedNodeId(undefined);
  };

  return (
    <div className="ai-preview ai-preview--mindmap">
      <header className="ai-preview__header">
        <div>
          <span className="ai-badge"><Sparkles size={14} /> Gerado com inteligência artificial</span>
          <label>
            Título
            <input value={content.title} maxLength={100} onChange={(event) => updateTitle(event.target.value)} />
          </label>
          <label>
            Descrição
            <input value={content.description} maxLength={240} onChange={(event) => onContentChange({ ...content, description: event.target.value })} />
          </label>
        </div>
        <p>Revise informações importantes antes de estudar. Clique em um nó para editar detalhes.</p>
      </header>

      <div className={`ai-mindmap-preview ${selectedNode ? 'with-editor' : ''}`}>
        <MindMapCanvas
          nodes={nodes}
          edges={edges}
          mode={mode}
          expandedTermIds={expandedTermIds}
          selectedNode={selectedNode}
          saving={saving}
          saved={false}
          isPremium
          onNodesChange={onNodesChange}
          onModeChange={setSummaryMode}
          onToggleTerm={toggleTerm}
          onExpandAll={() => {
            setExpandedTermIds(new Set(nodes.filter((node) => node.type === 'term').map((node) => node.id)));
            onModeChange('complete');
          }}
          onCollapseAll={() => {
            setExpandedTermIds(new Set());
            onModeChange('summary');
          }}
          onSelectNode={(node) => setSelectedNodeId(node?.id)}
          onRegenerate={onRegenerate}
          onSave={onSave}
        />

        {selectedNode && (
          <aside className="ai-node-editor">
            <header>
              <span><GitBranch size={17} /></span>
              <div>
                <small>Nó selecionado</small>
                <strong>{selectedNode.type}</strong>
              </div>
            </header>
            <label>
              Título do nó
              <input value={selectedNode.label} maxLength={100} onChange={(event) => updateSelectedNode('label', event.target.value)} />
            </label>
            <label>
              Conteúdo
              <textarea value={selectedNode.fullText} maxLength={400} onChange={(event) => updateSelectedNode('fullText', event.target.value)} />
            </label>
            <Button type="button" variant="secondary" icon={<Plus size={16} />} onClick={addChildNode}>Adicionar subnó</Button>
            <Button type="button" variant="danger" icon={<Trash2 size={16} />} onClick={deleteSelectedNode} disabled={selectedNode.id === 'central'}>Excluir nó</Button>
          </aside>
        )}
      </div>

      <footer className="ai-preview__actions">
        <Button type="button" variant="secondary" onClick={resetLayout}>Reorganizar mapa</Button>
        <div>
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button type="button" variant="secondary" onClick={onRegenerate}>Gerar novamente</Button>
          <Button type="button" loading={saving} disabled={!content.title.trim() || !nodes.length} onClick={onSave}>Salvar no StudyFlow</Button>
        </div>
      </footer>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { BrainCircuit, Network, Plus, Sparkles } from 'lucide-react';
import type { StudySet, ToastMessage } from '../types';
import type { MentalMap, MindMapEdge, MindMapMode, MindMapNode } from '../types/mentalMap';
import { generateAdvancedMindMapFromFlashcards, isMindMapLayoutValid } from '../utils/mindMapGenerator';
import { useMentalMaps } from '../hooks/useMentalMaps';
import { MindMapSetSelector } from '../components/mindmaps/MindMapSetSelector';
import { MindMapCanvas } from '../components/mindmaps/MindMapCanvas';
import { MindMapDetailsPanel } from '../components/mindmaps/MindMapDetailsPanel';
import { SavedMindMapsList } from '../components/mindmaps/SavedMindMapsList';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

interface MindMapsViewProps {
  userId: string;
  studySets: StudySet[];
  onCreateSet: () => void;
  onStudyFlashcard: (studySet: StudySet, flashcardId: string) => void;
  notify: (type: ToastMessage['type'], message: string) => void;
}

export function MindMapsView({ userId, studySets, onCreateSet, onStudyFlashcard, notify }: MindMapsViewProps) {
  const { maps, isLoading, error, saveMap, saveChanges, removeMap } = useMentalMaps(userId);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [edges, setEdges] = useState<MindMapEdge[]>([]);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<MindMapMode>('summary');
  const [expandedTermIds, setExpandedTermIds] = useState<Set<string>>(() => new Set());
  const [activeMap, setActiveMap] = useState<MentalMap>();
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectedSet = studySets.find((studySet) => studySet.id === selectedSetId);
  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId), [nodes, selectedNodeId]);

  if (!studySets.length) {
    return <div className="view"><EmptyState icon={<BrainCircuit size={32}/>} title="Nenhum flashcard disponível" description="Crie um conjunto de flashcards antes de gerar um mapa mental." action={<Button onClick={onCreateSet}>Criar conjunto</Button>}/></div>;
  }

  const applyGeneratedMap = (studySet: StudySet) => {
    const generated = generateAdvancedMindMapFromFlashcards(studySet);
    setNodes(generated.nodes);
    setEdges(generated.edges);
    setMode(generated.mode);
    setExpandedTermIds(new Set());
    setSelectedNodeId(undefined);
    return generated;
  };

  const generate = () => {
    if (!selectedSet) return;
    setGenerating(true);
    try {
      applyGeneratedMap(selectedSet);
      setTitle(selectedSet.title);
      setActiveMap(undefined);
      notify('success', 'Mapa mental avançado criado com sucesso.');
    } catch (reason) {
      notify('error', reason instanceof Error ? reason.message : 'Não foi possível gerar o mapa mental. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const regenerate = () => {
    const sourceSet = studySets.find((studySet) => studySet.id === selectedSetId);
    if (!sourceSet?.cards.length) {
      notify('error', 'O conjunto original não possui flashcards disponíveis.');
      return;
    }
    try {
      applyGeneratedMap(sourceSet);
      notify('success', 'Mapa regenerado como mapa avançado. Salve para manter as alterações.');
    } catch (reason) {
      notify('error', reason instanceof Error ? reason.message : 'Não foi possível regenerar o mapa.');
    }
  };

  const openMap = (map: MentalMap) => {
    const sourceSet = studySets.find((studySet) => studySet.id === map.studySetId);
    if (!isMindMapLayoutValid(map.nodes, map.edges) && sourceSet?.cards.length) {
      const generated = generateAdvancedMindMapFromFlashcards(sourceSet);
      const repaired = { ...map, nodes: generated.nodes, edges: generated.edges, mode: generated.mode };
      setActiveMap(repaired);
      setSelectedSetId(map.studySetId);
      setTitle(map.title);
      setNodes(generated.nodes);
      setEdges(generated.edges);
      setMode(generated.mode);
      setExpandedTermIds(new Set());
      setSelectedNodeId(undefined);
      notify('info', 'Este mapa antigo foi convertido para o formato avançado. Salve para manter o novo layout.');
      return;
    }
    setActiveMap(map);
    setSelectedSetId(map.studySetId);
    setTitle(map.title);
    setNodes(map.nodes);
    setEdges(map.edges);
    setMode(map.mode);
    setExpandedTermIds(map.mode === 'complete' ? new Set(map.nodes.filter((node) => node.type === 'term').map((node) => node.id)) : new Set());
    setSelectedNodeId(undefined);
  };

  const updateNode = (updatedNode: MindMapNode) => {
    setNodes((current) => current.map((node) => node.id === updatedNode.id ? updatedNode : node));
    if (updatedNode.type === 'central') setTitle(updatedNode.label);
  };

  const save = async () => {
    if (!selectedSetId || !nodes.length) return;
    setSaving(true);
    try {
      if (activeMap) {
        const updated = await saveChanges({ ...activeMap, title, nodes, edges, mode });
        setActiveMap(updated);
        notify('success', 'Alterações salvas com sucesso.');
        return;
      }
      const saved = await saveMap({ userId, studySetId: selectedSetId, title, nodes, edges, mode });
      setActiveMap(saved);
      notify('success', 'Mapa mental salvo na sua conta.');
    } catch (reason) {
      notify('error', reason instanceof Error ? reason.message : 'Não foi possível salvar o mapa mental.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (map: MentalMap) => {
    if (!window.confirm(`Excluir o mapa “${map.title}”?`)) return;
    try {
      await removeMap(map.id);
      if (activeMap?.id === map.id) {
        setActiveMap(undefined);
        setNodes([]);
        setEdges([]);
      }
      notify('success', 'Mapa mental excluído.');
    } catch (reason) {
      notify('error', reason instanceof Error ? reason.message : 'Não foi possível excluir o mapa.');
    }
  };

  const newMap = () => {
    setActiveMap(undefined);
    setNodes([]);
    setEdges([]);
    setTitle('');
    setMode('summary');
    setExpandedTermIds(new Set());
    setSelectedNodeId(undefined);
  };
  const changeMode = (nextMode: MindMapMode) => {
    setMode(nextMode);
    const termIds = nodes.filter((node) => node.type === 'term').map((node) => node.id);
    setExpandedTermIds(nextMode === 'complete' ? new Set(termIds) : new Set());
    if (nextMode === 'summary' && selectedNode && !['central', 'category', 'term'].includes(selectedNode.type)) setSelectedNodeId(undefined);
  };
  const toggleTerm = (termId: string) => {
    setMode('summary');
    setExpandedTermIds((current) => {
    const next = new Set(current);
    if (next.has(termId)) next.delete(termId); else next.add(termId);
    return next;
    });
  };
  const expandAll = () => { setExpandedTermIds(new Set(nodes.filter((node) => node.type === 'term').map((node) => node.id))); setMode('complete'); };
  const collapseAll = () => { setExpandedTermIds(new Set()); setMode('summary'); if (selectedNode && !['central', 'category', 'term'].includes(selectedNode.type)) setSelectedNodeId(undefined); };
  const studySelectedFlashcard = () => {
    if (!selectedNode?.flashcardId || !selectedSet) return;
    onStudyFlashcard(selectedSet, selectedNode.flashcardId);
  };

  return <div className="view mind-maps-view"><div className="mind-view-actions"><p>Transforme seus cards em categorias, conceitos e conexões para revisar melhor.</p><Button variant="secondary" icon={<Plus size={17}/>} onClick={newMap}>Novo mapa mental</Button></div><MindMapSetSelector studySets={studySets} selectedId={selectedSetId} generating={generating} onSelect={setSelectedSetId} onGenerate={generate}/>{error && <div className="mind-error" role="alert">{error}</div>}{isLoading && <div className="mind-loading"><span className="spin"><Sparkles size={20}/></span> Carregando mapas salvos...</div>}{nodes.length ? <div className={`mind-workspace ${selectedNode ? 'with-details' : ''}`}><MindMapCanvas nodes={nodes} edges={edges} mode={mode} expandedTermIds={expandedTermIds} selectedNode={selectedNode} saving={saving} saved={Boolean(activeMap)} onNodesChange={setNodes} onModeChange={changeMode} onToggleTerm={toggleTerm} onExpandAll={expandAll} onCollapseAll={collapseAll} onSelectNode={(node) => setSelectedNodeId(node?.id)} onRegenerate={regenerate} onSave={() => void save()}/>{selectedNode && <MindMapDetailsPanel node={selectedNode} studySetTitle={selectedSet?.title ?? title} onChange={updateNode} onStudy={selectedNode.flashcardId ? studySelectedFlashcard : undefined} onClose={() => setSelectedNodeId(undefined)}/>}</div> : <section className="mind-first-state"><span><Network size={31}/></span><h2>Crie seu primeiro mapa mental</h2><p>Escolha um conjunto de flashcards e transforme seus estudos em um mapa visual.</p></section>}<SavedMindMapsList maps={maps} activeId={activeMap?.id} onOpen={openMap} onDelete={(map) => void remove(map)}/></div>;
}

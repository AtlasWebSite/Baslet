import { useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from 'react';
import type { MindMapEdge, MindMapMode, MindMapNode as MindMapNodeModel } from '../../types/mentalMap';
import { filterMindMapByMode, MIND_MAP_HEIGHT, MIND_MAP_WIDTH } from '../../utils/mindMapGenerator';
import { MindMapNode } from './MindMapNode';
import { MindMapToolbar } from './MindMapToolbar';

const DEFAULT_ZOOM = .5;
const nodeSizes: Record<MindMapNodeModel['type'], { width: number; height: number }> = {
  central: { width: 230, height: 86 }, category: { width: 190, height: 70 }, term: { width: 210, height: 92 },
  definition: { width: 230, height: 84 }, example: { width: 210, height: 70 }, question: { width: 220, height: 76 }, keyword: { width: 150, height: 44 }
};
const nodeCenter = (node: MindMapNodeModel) => ({ x: node.x + nodeSizes[node.type].width / 2, y: node.y + nodeSizes[node.type].height / 2 });

interface MindMapCanvasProps {
  nodes: MindMapNodeModel[];
  edges: MindMapEdge[];
  mode: MindMapMode;
  expandedTermIds: ReadonlySet<string>;
  selectedNode?: MindMapNodeModel;
  saving: boolean;
  saved: boolean;
  isPremium: boolean;
  onNodesChange: (nodes: MindMapNodeModel[]) => void;
  onModeChange: (mode: MindMapMode) => void;
  onToggleTerm: (termId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onSelectNode: (node?: MindMapNodeModel) => void;
  onRegenerate: () => void;
  onSave: () => void;
}

export function MindMapCanvas({ nodes, edges, mode, expandedTermIds, selectedNode, saving, saved, isPremium, onNodesChange, onModeChange, onToggleTerm, onExpandAll, onCollapseAll, onSelectNode, onRegenerate, onSave }: MindMapCanvasProps) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const visibleMap = filterMindMapByMode(nodes, edges, expandedTermIds);
  const highlightedCategoryId = selectedNode?.type === 'category' ? selectedNode.id : undefined;
  const moveNode = (id: string, x: number, y: number) => onNodesChange(nodes.map((node) => node.id === id ? { ...node, x: Math.min(MIND_MAP_WIDTH - 240, x), y: Math.min(MIND_MAP_HEIGHT - 96, y) } : node));
  const resetView = () => { setZoom(DEFAULT_ZOOM); setPan({ x: 0, y: 0 }); };
  const selectNode = (node: MindMapNodeModel) => { if (node.type === 'term') onToggleTerm(node.id); onSelectNode(node); };
  const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('.mind-node')) return;
    const startX = event.clientX; const startY = event.clientY; const origin = pan;
    const move = (pointerEvent: PointerEvent) => setPan({ x: origin.x + pointerEvent.clientX - startX, y: origin.y + pointerEvent.clientY - startY });
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop);
  };
  const handleWheel = (event: WheelEvent<HTMLDivElement>) => { event.preventDefault(); setZoom((current) => Math.max(.35, Math.min(1.5, current - event.deltaY * .001))); };
  return <section className="mind-canvas-card"><MindMapToolbar zoom={zoom} mode={mode} saving={saving} saved={saved} isPremium={isPremium} onZoom={setZoom} onModeChange={onModeChange} onExpandAll={onExpandAll} onCollapseAll={onCollapseAll} onReset={resetView} onRegenerate={() => { onRegenerate(); resetView(); }} onSave={onSave}/><div className="mind-canvas" onPointerDown={startPan} onWheel={handleWheel} onClick={() => onSelectNode(undefined)}><div className="mind-world" style={{ width: MIND_MAP_WIDTH, height: MIND_MAP_HEIGHT, transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})` }}><svg viewBox={`0 0 ${MIND_MAP_WIDTH} ${MIND_MAP_HEIGHT}`} width={MIND_MAP_WIDTH} height={MIND_MAP_HEIGHT} fill="none" aria-hidden="true">{visibleMap.edges.map((edge) => { const source = nodes.find((node) => node.id === edge.source); const target = nodes.find((node) => node.id === edge.target); if (!source || !target) return null; const a = nodeCenter(source); const b = nodeCenter(target); const middleX = (a.x + b.x) / 2; const dimmed = highlightedCategoryId && source.id !== highlightedCategoryId && source.categoryId !== highlightedCategoryId && target.categoryId !== highlightedCategoryId; return <path key={edge.id} d={`M ${a.x} ${a.y} C ${middleX} ${a.y}, ${middleX} ${b.y}, ${b.x} ${b.y}`} fill="none" stroke="#aaa7df" strokeWidth={2} strokeOpacity={dimmed ? .16 : .72} strokeLinecap="round"/>; })}</svg>{visibleMap.nodes.map((node) => <MindMapNode key={node.id} node={node} selected={selectedNode?.id === node.id} expanded={expandedTermIds.has(node.id)} dimmed={Boolean(highlightedCategoryId && node.id !== 'central' && node.id !== highlightedCategoryId && node.categoryId !== highlightedCategoryId)} zoom={zoom} onSelect={selectNode} onMove={moveNode}/>)}</div></div></section>;
}

import { Brain, ChevronDown, ChevronRight, FileText, Hash, HelpCircle, Lightbulb, Network, Sparkles } from 'lucide-react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { MindMapNode as MindMapNodeModel } from '../../types/mentalMap';

const icons = { central: Brain, category: Network, term: Lightbulb, definition: FileText, example: Sparkles, question: HelpCircle, keyword: Hash };
const kindLabels = { central: 'Mapa mental', category: 'Categoria', term: 'Conceito', definition: 'Explicação', example: 'Exemplo', question: 'Revisão', keyword: 'Palavra-chave' };

interface MindMapNodeProps {
  node: MindMapNodeModel;
  selected: boolean;
  dimmed: boolean;
  expanded: boolean;
  zoom: number;
  onSelect: (node: MindMapNodeModel) => void;
  onMove: (id: string, x: number, y: number) => void;
}

export function MindMapNode({ node, selected, dimmed, expanded, zoom, onSelect, onMove }: MindMapNodeProps) {
  const Icon = icons[node.type];
  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault(); event.stopPropagation();
    const startX = event.clientX; const startY = event.clientY; const originX = node.x; const originY = node.y;
    const move = (pointerEvent: PointerEvent) => onMove(node.id, Math.max(0, originX + (pointerEvent.clientX - startX) / zoom), Math.max(0, originY + (pointerEvent.clientY - startY) / zoom));
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop);
  };
  return <button type="button" className={`mind-node mind-node--${node.type} ${selected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''} ${expanded ? 'expanded' : ''}`} style={{ left: node.x, top: node.y }} onPointerDown={startDrag} onClick={(event) => { event.stopPropagation(); onSelect(node); }} title={node.fullText}><span className="mind-node__icon"><Icon size={node.type === 'central' ? 20 : 15}/></span><span className="mind-node__content"><small>{node.subtitle && node.type !== 'term' ? node.subtitle : kindLabels[node.type]}</small><strong>{node.label}</strong>{node.type === 'term' && node.subtitle && <em>{node.subtitle}</em>}</span>{node.type === 'term' && <span className="mind-node__expand" aria-hidden="true">{expanded ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}</span>}</button>;
}

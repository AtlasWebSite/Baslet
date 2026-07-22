import { Brain, FileText, Hash, HelpCircle, Lightbulb, Network, Play, Sparkles, X } from 'lucide-react';
import type { MindMapNode } from '../../types/mentalMap';
import { Button } from '../ui/Button';

const labels = { central: 'Nó central', category: 'Categoria', term: 'Termo', definition: 'Definição', example: 'Exemplo', question: 'Pergunta de revisão', keyword: 'Palavra-chave' };
const icons = { central: Brain, category: Network, term: Lightbulb, definition: FileText, example: Sparkles, question: HelpCircle, keyword: Hash };

export function MindMapDetailsPanel({ node, studySetTitle, onChange, onStudy, onClose }: { node: MindMapNode; studySetTitle: string; onChange: (node: MindMapNode) => void; onStudy?: () => void; onClose: () => void }) {
  const Icon = icons[node.type];
  return <aside className="mind-details"><header><span><Icon size={19}/></span><div><small>{labels[node.type]}</small><strong>Detalhes do nó</strong></div><button onClick={onClose} aria-label="Fechar detalhes"><X size={18}/></button></header><label>Título do nó<input value={node.label} maxLength={120} onChange={(event) => onChange({ ...node, label: event.target.value })}/></label><div><span>Conteúdo completo</span><p>{node.fullText}</p></div>{node.flashcardId && <div className="mind-details__relation"><span>Flashcard relacionado</span><strong>{studySetTitle}</strong><small>Este conteúdo foi gerado a partir de um card real do conjunto.</small></div>}{onStudy && <Button icon={<Play size={15}/>} onClick={onStudy}>Estudar este flashcard</Button>}<small>Arraste o nó no mapa para reorganizá-lo.</small></aside>;
}

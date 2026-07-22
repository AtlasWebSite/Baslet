import { Layers3, ListTree } from 'lucide-react';
import type { MindMapMode } from '../../types/mentalMap';

export function MindMapModeToggle({ mode, onChange }: { mode: MindMapMode; onChange: (mode: MindMapMode) => void }) {
  return <div className="mind-mode" role="group" aria-label="Modo do mapa"><button className={mode === 'summary' ? 'active' : ''} onClick={() => onChange('summary')}><ListTree size={15}/> Resumo</button><button className={mode === 'complete' ? 'active' : ''} onClick={() => onChange('complete')}><Layers3 size={15}/> Completo</button></div>;
}

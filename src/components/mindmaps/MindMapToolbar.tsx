import { ChevronsDownUp, ChevronsUpDown, LocateFixed, Minus, Plus, RefreshCw, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import type { MindMapMode } from '../../types/mentalMap';
import { MindMapModeToggle } from './MindMapModeToggle';

interface MindMapToolbarProps {
  zoom: number;
  mode: MindMapMode;
  saving: boolean;
  saved: boolean;
  onZoom: (zoom: number) => void;
  onModeChange: (mode: MindMapMode) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onReset: () => void;
  onRegenerate: () => void;
  onSave: () => void;
}

export function MindMapToolbar({ zoom, mode, saving, saved, onZoom, onModeChange, onExpandAll, onCollapseAll, onReset, onRegenerate, onSave }: MindMapToolbarProps) {
  return <div className="mind-toolbar"><div className="mind-toolbar__zoom"><button onClick={() => onZoom(Math.max(.35, zoom - .1))} aria-label="Diminuir zoom"><Minus size={17}/></button><span>{Math.round(zoom * 100)}%</span><button onClick={() => onZoom(Math.min(1.5, zoom + .1))} aria-label="Aumentar zoom"><Plus size={17}/></button><button onClick={onReset} aria-label="Centralizar mapa" title="Centralizar mapa"><LocateFixed size={17}/></button></div><MindMapModeToggle mode={mode} onChange={onModeChange}/><div className="mind-toolbar__details"><button onClick={onExpandAll} title="Expandir todos os detalhes"><ChevronsUpDown size={16}/>Expandir tudo</button><button onClick={onCollapseAll} title="Recolher todos os detalhes"><ChevronsDownUp size={16}/>Recolher tudo</button></div><div className="mind-toolbar__actions"><Button variant="secondary" icon={<RefreshCw size={16}/>} onClick={onRegenerate}>Regenerar</Button><Button loading={saving} icon={<Save size={16}/>} onClick={onSave}>{saved ? 'Salvar alterações' : 'Salvar mapa'}</Button></div></div>;
}

import { LoaderCircle } from 'lucide-react';
import { Logo } from '../logo/Logo';

export function LoadingState({ label = 'Preparando seu espaço de estudos...' }: { label?: string }) {
  return <div className="app-loading"><Logo /><LoaderCircle className="spin" size={25} /><p>{label}</p></div>;
}

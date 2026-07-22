import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { ToastMessage } from '../../types';

export function Toast({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? XCircle : Info;
  return (
    <div className={`toast toast--${toast.type}`} role="status">
      <Icon size={20} /><span>{toast.message}</span>
      <button onClick={onClose} aria-label="Fechar mensagem"><X size={16} /></button>
    </div>
  );
}

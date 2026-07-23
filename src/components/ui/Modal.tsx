import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  eyebrow?: string;
  hideHeader?: boolean;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, description, eyebrow = 'Novo material', hideHeader = false, className, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={className ? `modal ${className}` : 'modal'} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {hideHeader ? <button className="modal__floating-close icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button> : <header className="modal__header">
          <div><span className="eyebrow">{eyebrow}</span><h2 id="modal-title">{title}</h2>{description && <p>{description}</p>}</div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </header>}
        {children}
      </section>
    </div>
  );
}

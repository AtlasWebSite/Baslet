import type { ReactNode } from 'react';

interface AiContentTypeCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  selected: boolean;
  onSelect: () => void;
}

export function AiContentTypeCard({ title, description, icon, selected, onSelect }: AiContentTypeCardProps) {
  return (
    <button
      type="button"
      className={`ai-type-card ${selected ? 'selected' : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="ai-type-card__icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </button>
  );
}

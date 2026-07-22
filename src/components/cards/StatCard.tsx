import type { ReactNode } from 'react';

export function StatCard({ icon, value, label, detail, tone = 'purple' }: { icon: ReactNode; value: string | number; label: string; detail?: string; tone?: string }) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__icon">{icon}</span><div><strong>{value}</strong><span>{label}</span>{detail && <small>{detail}</small>}</div>
    </article>
  );
}

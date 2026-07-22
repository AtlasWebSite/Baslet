interface LogoProps { compact?: boolean; light?: boolean; }

export function Logo({ compact = false, light = false }: LogoProps) {
  return (
    <div className={`flow-logo ${compact ? 'flow-logo--compact' : ''} ${light ? 'flow-logo--light' : ''}`} aria-label="StudyFlow">
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <defs><linearGradient id="flowGradient" x1="4" y1="4" x2="40" y2="40"><stop stopColor="#7b68ee"/><stop offset="1" stopColor="#45b8d7"/></linearGradient></defs>
        <rect x="2" y="2" width="40" height="40" rx="13" fill="url(#flowGradient)"/>
        <path d="M13 15.5c5.7-3.8 11.7-3.8 18 0v14c-6.3-3.8-12.3-3.8-18 0v-14Z" fill="none" stroke="white" strokeWidth="2.2" strokeLinejoin="round"/>
        <path d="M22 14v15M17 19.5h2.5M24.5 22h2.5" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
      {!compact && <strong>Study<span>Flow</span></strong>}
    </div>
  );
}

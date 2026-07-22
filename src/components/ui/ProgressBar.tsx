interface ProgressBarProps {
  value: number;
  label?: string;
  color?: string;
}

export function ProgressBar({ value, label, color }: ProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-group">
      {label && <div className="progress-label"><span>{label}</span><strong>{safeValue}%</strong></div>}
      <div className="progress-track" role="progressbar" aria-valuenow={safeValue} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${safeValue}%`, background: color }} />
      </div>
    </div>
  );
}

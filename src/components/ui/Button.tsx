import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'primary', loading, icon, children, className = '', disabled, ...props }: ButtonProps) {
  return (
    <button className={`button button--${variant} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? <LoaderCircle size={18} className="spin" /> : icon}
      <span>{children}</span>
    </button>
  );
}

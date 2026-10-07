import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'critical'
  | 'info'
  | 'neutral'
  | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  icon,
}) => {
  const sizeClasses =
    size === 'sm'
      ? 'text-[11px] font-medium px-2 py-0.5 rounded-md'
      : 'text-xs font-medium px-2.5 py-1 rounded-md';

  const variantClasses: Record<BadgeVariant, string> = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    primary: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    critical: 'bg-red-100 text-red-900 border border-red-300 font-semibold',
    info: 'bg-sky-50 text-sky-700 border border-sky-200',
    neutral: 'bg-zinc-100 text-zinc-700 border border-zinc-300',
    outline: 'bg-transparent text-slate-600 border border-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 leading-none whitespace-nowrap ${sizeClasses} ${variantClasses[variant]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

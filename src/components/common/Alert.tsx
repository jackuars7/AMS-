import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export type AlertType = 'info' | 'warning' | 'error' | 'success';

interface AlertProps {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  action,
  className = '',
}) => {
  const styles = {
    info: {
      bg: 'bg-sky-50 border-sky-200 text-sky-900',
      icon: <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />,
      titleColor: 'text-sky-950',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />,
      titleColor: 'text-amber-950',
    },
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />,
      titleColor: 'text-rose-950',
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />,
      titleColor: 'text-emerald-950',
    },
  }[type];

  return (
    <div
      role="alert"
      className={`rounded-lg border p-3.5 flex items-start justify-between gap-3 text-sm ${styles.bg} ${className}`}
    >
      <div className="flex items-start gap-2.5">
        {styles.icon}
        <div>
          {title && <h4 className={`font-semibold text-xs leading-5 uppercase tracking-wide ${styles.titleColor}`}>{title}</h4>}
          <div className="text-xs leading-relaxed mt-0.5">{children}</div>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

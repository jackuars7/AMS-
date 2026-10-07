import React from 'react';
import { FolderSearch } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="rounded-full bg-white p-3 text-slate-400 shadow-xs border border-slate-100 mb-3">
        {icon || <FolderSearch className="h-6 w-6" />}
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

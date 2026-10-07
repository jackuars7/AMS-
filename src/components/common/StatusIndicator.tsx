import React from 'react';
import { ConnectorStatus } from '../../types/index.ts';

interface StatusIndicatorProps {
  status: ConnectorStatus | 'ACTIVE' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'BLOCKED';
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = 'md',
}) => {
  const dotSize = size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2';

  const config = {
    ACTIVE: { color: 'bg-emerald-500 ring-emerald-100', defaultLabel: 'Active / Healthy' },
    COMPLETED: { color: 'bg-emerald-500 ring-emerald-100', defaultLabel: 'Completed' },
    DEGRADED: { color: 'bg-amber-500 ring-amber-100 animate-pulse', defaultLabel: 'Degraded' },
    RUNNING: { color: 'bg-sky-500 ring-sky-100 animate-pulse', defaultLabel: 'Running' },
    PENDING: { color: 'bg-slate-400 ring-slate-100', defaultLabel: 'Pending' },
    CIRCUIT_OPEN: { color: 'bg-rose-600 ring-rose-100', defaultLabel: 'Circuit Open (Tripped)' },
    FAILED: { color: 'bg-rose-500 ring-rose-100', defaultLabel: 'Failed' },
    BLOCKED: { color: 'bg-amber-600 ring-amber-100', defaultLabel: 'Blocked' },
    SUSPENDED: { color: 'bg-zinc-400 ring-zinc-100', defaultLabel: 'Suspended' },
  }[status] || { color: 'bg-slate-400 ring-slate-100', defaultLabel: status };

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
      <span className={`rounded-full ${dotSize} ${config.color} ring-2`} />
      <span>{label || config.defaultLabel}</span>
    </span>
  );
};

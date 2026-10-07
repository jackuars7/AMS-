import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  History,
  KeyRound,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react';
import { AuditEvent } from '../../../types/index.ts';
import { Badge } from '../../common/Badge.tsx';

interface AuditTraceabilityAreaProps {
  events: AuditEvent[];
  caseReference: string;
}

export const AuditTraceabilityArea: React.FC<AuditTraceabilityAreaProps> = ({
  events,
  caseReference,
}) => {
  const [searchFilter, setSearchFilter] = useState('');

  const caseEvents = events.filter(
    (e) => !e.caseReference || e.caseReference === caseReference
  );

  const filtered = caseEvents.filter((e) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      e.action.toLowerCase().includes(q) ||
      e.actorName.toLowerCase().includes(q) ||
      e.details.toLowerCase().includes(q) ||
      e.correlationId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Immutable Audit Trail & Regulatory Lineage
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Every policy evaluation, alias state change, exemption adjudication, and search execution is cryptographically auditable.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter audit events..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-indigo-600"
          />
        </div>
      </div>

      {/* Audit Timeline */}
      <div className="space-y-4">
        {filtered.map((event, idx) => (
          <div
            key={event.id || idx}
            className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-colors text-xs space-y-2"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900 text-xs">
                  {event.action}
                </span>
                <Badge variant="primary" size="sm">
                  {event.entityType}
                </Badge>
                {event.caseReference && (
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {event.caseReference}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                <Clock className="h-3 w-3" />
                <span>{new Date(event.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <p className="text-slate-700 leading-relaxed font-sans">{event.details}</p>

            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-slate-400" />
                <span>
                  {event.actorName} ({event.actorRole})
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-400">
                <KeyRound className="h-3 w-3 text-slate-400" />
                <span>Correlation: {event.correlationId}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

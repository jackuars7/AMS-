import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  Layers,
  Scale,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { MaterialUpdate, MaterialUpdateCategory, UserRole } from '../../types/index.ts';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';

interface MaterialUpdatesViewProps {
  updates: MaterialUpdate[];
  activeRole: UserRole;
  onRefresh: () => void;
  onNavigateToCase?: (caseId: string) => void;
}

export const MaterialUpdatesView: React.FC<MaterialUpdatesViewProps> = ({
  updates,
  activeRole,
  onRefresh,
  onNavigateToCase,
}) => {
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = updates.filter((u) => {
    if (typeFilter !== 'ALL' && u.updateCategory !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        u.headline?.toLowerCase().includes(q) ||
        u.summary?.toLowerCase().includes(q) ||
        u.subjectId?.toLowerCase().includes(q) ||
        u.updateCategory?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getChangeTypeBadge = (t: MaterialUpdateCategory) => {
    switch (t) {
      case 'CHARGE':
      case 'CONVICTION':
        return <Badge variant="critical">{t}</Badge>;
      case 'ACQUITTAL':
      case 'DISMISSAL':
        return <Badge variant="success">{t}</Badge>;
      case 'CORRECTION':
      case 'RETRACTION':
        return <Badge variant="info">{t}</Badge>;
      case 'NEW_INDEPENDENT_CORROBORATION':
        return <Badge variant="warning">Corroboration</Badge>;
      case 'SIGNIFICANT_IDENTITY_CHANGE':
        return <Badge variant="primary">Identity Change</Badge>;
      default:
        return <Badge variant="default">{t}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search material update summary, subject, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-slate-300 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-600">Material Category:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs px-2 py-1 rounded border border-slate-300 bg-white"
          >
            <option value="ALL">All Material Changes</option>
            <option value="CHARGE">CHARGE</option>
            <option value="CONVICTION">CONVICTION</option>
            <option value="ACQUITTAL">ACQUITTAL</option>
            <option value="DISMISSAL">DISMISSAL</option>
            <option value="APPEAL">APPEAL</option>
            <option value="SETTLEMENT">SETTLEMENT</option>
            <option value="CORRECTION">CORRECTION</option>
            <option value="RETRACTION">RETRACTION</option>
            <option value="NEW_INDEPENDENT_CORROBORATION">CORROBORATION</option>
            <option value="SIGNIFICANT_IDENTITY_CHANGE">IDENTITY CHANGE</option>
          </select>
        </div>
      </div>

      {/* Updates Cards List */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 bg-white border border-slate-200 rounded-lg">
          <FileCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No material updates detected</p>
          <p className="text-xs text-slate-500">
            Incremental ingestion has not detected unhandled material status changes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-4 shadow-2xs space-y-3 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getChangeTypeBadge(item.updateCategory)}
                    <span className="text-xs font-bold text-slate-900">
                      Subject ID: {item.subjectId}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-xs font-medium text-slate-600">
                      Cycle: {item.cycleId}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {item.headline}
                  </h4>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {item.summary}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-400 block">
                    {new Date(item.detectedAt).toLocaleDateString()}
                  </span>
                  <Badge
                    variant={item.severity === 'CRITICAL' ? 'critical' : item.severity === 'HIGH' ? 'danger' : 'warning'}
                    size="sm"
                    className="mt-1"
                  >
                    {item.severity} Severity
                  </Badge>
                </div>
              </div>

              {/* Before vs After View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Previous Legal Status
                  </span>
                  <div className="text-slate-700 font-medium">
                    {item.previousStatus || 'No recorded criminal finding (CLEARED)'}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-indigo-50/50 border border-indigo-200">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block mb-1">
                    New Procedural Status
                  </span>
                  <div className="text-indigo-950 font-bold">
                    {item.newStatus}
                  </div>
                </div>
              </div>

              {/* Immediate Escalation Indicator */}
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <span>Event ID:</span>
                  <strong className="text-slate-700 font-mono">{item.eventId}</strong>
                  <span>•</span>
                  <span>Escalation Required:</span>
                  <strong className={item.requiresImmediateEscalation ? 'text-rose-700 font-bold' : 'text-slate-600'}>
                    {item.requiresImmediateEscalation ? 'YES (Triggered EDD / MLRO)' : 'Standard Review'}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

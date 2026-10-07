import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FolderOpen,
  Play,
  Radio,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { KycCase, SourceConnector, UserRole, WorkItem } from '../../types/index.ts';
import { Badge, BadgeVariant } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';

interface HomeViewProps {
  cases: KycCase[];
  workItems: WorkItem[];
  connectors: SourceConnector[];
  activeRole: UserRole;
  onOpenCase: (caseId: string) => void;
  onSelectNavTab: (tab: any) => void;
  onRunTourStep: (stepNumber: number) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  cases,
  workItems,
  connectors,
  activeRole,
  onOpenCase,
  onSelectNavTab,
  onRunTourStep,
}) => {
  const degradedConnectors = connectors.filter(
    (c) => c.status === 'CIRCUIT_OPEN' || c.status === 'DEGRADED'
  );

  const pendingApprovals = workItems.filter(
    (w) => w.type === 'CHECKER_REVIEW' || w.type === 'EXEMPTION_REQUEST'
  );

  const highRiskCases = cases.filter((c) => c.riskLevel === 'HIGH' || c.riskLevel === 'VERY_HIGH');

  const riskBadgeMap: Record<string, BadgeVariant> = {
    HIGH: 'critical',
    VERY_HIGH: 'critical',
    MEDIUM: 'warning',
    LOW: 'success',
  };

  return (
    <div className="space-y-6">
      {/* Synthetic Interactive Demo Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Enterprise Stage 1 Capability Test Bench (AM-01 through AM-06)
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Explore the end-to-end foundation: deterministic policy resolution, case completion
              blockers, multi-source conflict resolution, AI safety guardrails, and approved-source
              search orchestration.
            </p>
          </div>

          <Badge variant="primary" size="sm" className="bg-indigo-500/20 text-indigo-300 border-indigo-400/40">
            Active Role: {activeRole}
          </Badge>
        </div>

        {/* 6 Capability Quick Test Triggers */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => onRunTourStep(1)}
            className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-400 text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-mono text-indigo-400 font-bold uppercase">AM-01</div>
            <div className="text-xs font-semibold text-white group-hover:text-indigo-200 mt-0.5">
              Completion Blocker
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Test mandatory invariant</div>
          </button>

          <button
            type="button"
            onClick={() => onRunTourStep(2)}
            className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-400 text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-mono text-indigo-400 font-bold uppercase">AM-02</div>
            <div className="text-xs font-semibold text-white group-hover:text-indigo-200 mt-0.5">
              Subject Conflicts
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Inspect multi-source DOB</div>
          </button>

          <button
            type="button"
            onClick={() => onRunTourStep(3)}
            className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-400 text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-mono text-indigo-400 font-bold uppercase">AM-03</div>
            <div className="text-xs font-semibold text-white group-hover:text-indigo-200 mt-0.5">
              AI Names & Human Gate
            </div>
            <div className="text-[11px] text-slate-400 mt-1">AI suggestions in pending</div>
          </button>

          <button
            type="button"
            onClick={() => onRunTourStep(4)}
            className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-400 text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-mono text-indigo-400 font-bold uppercase">AM-05</div>
            <div className="text-xs font-semibold text-white group-hover:text-indigo-200 mt-0.5">
              Deterministic Rules
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Pure code policy engine</div>
          </button>

          <button
            type="button"
            onClick={() => onRunTourStep(5)}
            className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-400 text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-mono text-indigo-400 font-bold uppercase">AM-06</div>
            <div className="text-xs font-semibold text-white group-hover:text-indigo-200 mt-0.5">
              Circuit Breaker
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Retry tripped connector</div>
          </button>

          <button
            type="button"
            onClick={() => onRunTourStep(6)}
            className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-400 text-left transition-all cursor-pointer group"
          >
            <div className="text-[10px] font-mono text-indigo-400 font-bold uppercase">Security</div>
            <div className="text-xs font-semibold text-white group-hover:text-indigo-200 mt-0.5">
              Segregation of Duties
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Test self-approval ban</div>
          </button>
        </div>
      </div>

      {/* Circuit Breaker / Degraded Connector Alert Banner */}
      {degradedConnectors.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-bold text-rose-950 block">
                Operational Alert: {degradedConnectors.length} Source Connector Circuit Breaker Open
              </span>
              <span>
                {degradedConnectors.map((c) => c.name).join(', ')} exceeded failure thresholds.
                Downstream screening runs operate in partial success mode until reset.
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectNavTab('monitoring')}
            className="text-xs text-rose-800 hover:bg-rose-100/60 border-rose-300 self-start sm:self-auto shrink-0"
          >
            Open Monitoring
          </Button>
        </div>
      )}

      {/* Role-Specific Workload Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onSelectNavTab('work-queue')}
          className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition-colors space-y-2"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">My Active Queue</span>
            <Users className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {workItems.filter((w) => w.assignedRole === activeRole).length}
          </div>
          <p className="text-[11px] text-slate-500">Assigned investigations & reviews</p>
        </div>

        <div
          onClick={() => onSelectNavTab('work-queue')}
          className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition-colors space-y-2"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Pending 4-Eyes Reviews</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">
            {pendingApprovals.length}
          </div>
          <p className="text-[11px] text-slate-500">Exemptions & AI alias verifications</p>
        </div>

        <div
          onClick={() => onSelectNavTab('cases')}
          className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition-colors space-y-2"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">High-Risk Portfolios</span>
            <ShieldAlert className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {highRiskCases.length}
          </div>
          <p className="text-[11px] text-slate-500">Mandatory forensic screening depth</p>
        </div>

        <div
          onClick={() => onSelectNavTab('monitoring')}
          className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition-colors space-y-2"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold">Approved Connectors</span>
            <Radio className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            {connectors.filter((c) => c.status === 'ACTIVE').length} / {connectors.length}
          </div>
          <p className="text-[11px] text-slate-500">Allowlisted and healthy</p>
        </div>
      </div>

      {/* Priority Cases Table */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Active KYC Cases Requiring Attention
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any case to open the unified 7-area workspace.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectNavTab('cases')}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
            className="text-xs text-indigo-600"
          >
            View All Cases
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Reference / Customer</th>
                <th className="py-2.5 px-3">Type / Jurisdiction</th>
                <th className="py-2.5 px-3">Risk Level</th>
                <th className="py-2.5 px-3">Screening Status</th>
                <th className="py-2.5 px-3">Blocking Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cases.map((c) => {
                const hasBlockers = c.blockingConditions && c.blockingConditions.length > 0;
                return (
                  <tr
                    key={c.id}
                    onClick={() => onOpenCase(c.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{c.customerName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{c.reference}</div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-700">{c.customerType}</span>
                      <span className="text-slate-400 block text-[11px]">
                        Jurisdiction: {c.jurisdiction}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <Badge variant={riskBadgeMap[c.riskLevel] || 'neutral'} size="sm">
                        {c.riskLevel}
                      </Badge>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800">
                        {c.screeningStatus.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-400 block text-[11px]">
                        Owner: {c.assignedToName}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      {hasBlockers ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{c.blockingConditions.length} Blocker(s)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Cleared</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
                        <span>Workspace</span>
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, Wrench } from 'lucide-react';
import { CoverageGap, UserRole } from '../../../types/index.ts';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';

interface CoverageGapsCardProps {
  coverageGaps: CoverageGap[];
  onRetryConnector: (connectorId: string) => Promise<void>;
  retryingConnectorId: string | null;
  activeRole: UserRole;
}

export const CoverageGapsCard: React.FC<CoverageGapsCardProps> = ({
  coverageGaps,
  onRetryConnector,
  retryingConnectorId,
}) => {
  if (!coverageGaps || coverageGaps.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <div>
            <span className="font-semibold text-emerald-900">Zero Regulatory Coverage Gaps Identified</span>
            <p className="text-emerald-700 text-[11px] mt-0.5">
              All allowlisted connectors in the mandatory screening obligation were successfully queried.
            </p>
          </div>
        </div>
        <Badge variant="success" size="sm">100% Obligation Met</Badge>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-xl bg-amber-50/70 border border-amber-300 shadow-2xs space-y-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-700 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-amber-950">
              Identified Coverage Gaps & Remediation (AM-06 / AM-08)
            </h4>
            <p className="text-xs text-amber-800 mt-0.5">
              The following connector failures caused partial screening coverage. Review remediation guidance and execute retry.
            </p>
          </div>
        </div>
        <Badge variant="warning" size="sm">
          {coverageGaps.length} Active {coverageGaps.length === 1 ? 'Gap' : 'Gaps'}
        </Badge>
      </div>

      <div className="space-y-2.5">
        {coverageGaps.map((gap) => {
          const isRetrying = retryingConnectorId === gap.connectorId;

          return (
            <div
              key={gap.id}
              className="p-3.5 rounded-lg bg-white border border-amber-200 shadow-2xs text-xs space-y-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{gap.connectorName}</span>
                  <span className="font-mono text-[11px] text-slate-400">({gap.connectorId})</span>
                  <Badge variant={gap.severity === 'HIGH' ? 'danger' : 'warning'} size="sm">
                    {gap.severity} SEVERITY
                  </Badge>
                  <span className="text-[10px] font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                    {gap.category.replace(/_/g, ' ')}
                  </span>
                </div>

                {gap.canRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRetryConnector(gap.connectorId)}
                    isLoading={isRetrying}
                    leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                    className="text-xs py-1 px-3 border-amber-300 text-amber-900 hover:bg-amber-100"
                  >
                    Retry Connector & Heal Gap
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-medium">Root Cause / Error Category:</span>
                  <span className="font-mono text-rose-700 font-medium">
                    {gap.errorCategory}: {gap.reason}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Prescribed Remediation Action:</span>
                  <span className="text-slate-700 flex items-center gap-1">
                    <Wrench className="h-3 w-3 text-amber-600 shrink-0 inline" />
                    {gap.remediationAction}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

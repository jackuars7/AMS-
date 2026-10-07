import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { CoverageOutcome, ScreeningRun, SourceConnector, Subject, UserRole } from '../../../types/index.ts';
import { Alert } from '../../common/Alert.tsx';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';
import { StatusIndicator } from '../../common/StatusIndicator.tsx';
import { CoverageGapsCard } from '../investigation/CoverageGapsCard.tsx';
import { MultilingualQueriesSection } from '../investigation/MultilingualQueriesSection.tsx';
import { HistoricalPeriodSection } from '../investigation/HistoricalPeriodSection.tsx';
import { AuditManifestSection } from '../investigation/AuditManifestSection.tsx';
import { InvestigationWorkspace } from '../investigation/InvestigationWorkspace.tsx';

interface InvestigationAreaProps {
  screeningRun: ScreeningRun | null;
  connectors: SourceConnector[];
  activeRole: UserRole;
  currentUserId?: string;
  onRetryConnector: (connectorId: string, runId: string) => Promise<void>;
  onExecuteNewRun: () => void;
  isExecuting?: boolean;
  caseId?: string;
  subjects?: Subject[];
  onRefreshRun?: () => void;
}

export const InvestigationArea: React.FC<InvestigationAreaProps> = ({
  screeningRun,
  connectors,
  activeRole,
  currentUserId = 'USR-CHECKER-01',
  onRetryConnector,
  onExecuteNewRun,
  isExecuting = false,
  caseId,
  subjects = [],
  onRefreshRun,
}) => {
  const [activeViewMode, setActiveViewMode] = useState<'investigation_workspace' | 'screening_orchestration'>('investigation_workspace');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRetry = async (connectorId: string) => {
    if (!screeningRun) return;
    setRetryingId(connectorId);
    setErrorMsg(null);
    try {
      await onRetryConnector(connectorId, screeningRun.id);
      if (onRefreshRun) onRefreshRun();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setRetryingId(null);
    }
  };

  const coveragePercent = screeningRun?.overallCoveragePercent || 0;
  const isCompleteCoverage = coveragePercent === 100;

  return (
    <div className="space-y-6">
      {/* Top Level Mode Switcher */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveViewMode('investigation_workspace')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeViewMode === 'investigation_workspace'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Case Investigation & Four-Eyes Workspace (AM-38–AM-44)
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode('screening_orchestration')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeViewMode === 'screening_orchestration'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Approved-Source Search & Coverage (AM-06)
          </button>
        </div>
      </div>

      {activeViewMode === 'investigation_workspace' ? (
        <InvestigationWorkspace
          currentCaseId={caseId}
          activeRole={activeRole}
          currentUserId={currentUserId}
        />
      ) : (
        <>
          {/* 1. Top Banner: Coverage Status & Search Orchestration (AM-06) */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Approved-Source Search Orchestration & Coverage (AM-06)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Only allowlisted enterprise connectors are queried. Circuit breakers protect downstream systems.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Overall Coverage</span>
              <span
                className={`text-base font-extrabold ${
                  isCompleteCoverage ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {coveragePercent}%
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={onExecuteNewRun}
              isLoading={isExecuting}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              className="text-xs"
            >
              Re-run Search
            </Button>
          </div>
        </div>

        {/* Coverage Progress Bar */}
        <div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${
                isCompleteCoverage ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${coveragePercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1 font-mono">
            <span>Minimum Regulatory Threshold: 75%</span>
            <span>
              Status: {screeningRun ? screeningRun.status.replace(/_/g, ' ') : 'NOT_RUN'}
            </span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <Alert type="error" title="Connector Operation Failed">
          {errorMsg}
        </Alert>
      )}

      {/* 2. Coverage Gaps & Remediation Card (AM-06 / AM-08) */}
      <CoverageGapsCard
        coverageGaps={screeningRun?.coverageGaps || []}
        onRetryConnector={handleRetry}
        retryingConnectorId={retryingId}
        activeRole={activeRole}
      />

      {/* 3. Connectors Health & Circuit Breakers Table (AM-06) */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Source Connectors & Health Observability (AM-06)
          </h4>
          <span className="text-xs text-slate-500">
            {connectors.filter((c) => c.status === 'ACTIVE').length} / {connectors.length} Operational
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Connector Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3">Articles</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {connectors.map((connector) => {
                const outcome = screeningRun?.coverageOutcomes?.find(
                  (o) => o.connectorId === connector.id
                );
                const isCircuitOpen = connector.status === 'CIRCUIT_OPEN';

                return (
                  <tr key={connector.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{connector.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {connector.id} • Rate: {connector.rateLimitPerMin}/min
                      </div>
                      {outcome?.errorMessage && (
                        <div className="mt-1 text-[11px] text-rose-600 font-mono">
                          {outcome.errorMessage}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <Badge variant="neutral" size="sm">
                        {connector.category.replace(/_/g, ' ')}
                      </Badge>
                    </td>

                    <td className="py-3 px-3">
                      <StatusIndicator status={connector.status} />
                      {connector.consecutiveFailures > 0 && (
                        <span className="block text-[10px] text-rose-600 font-mono mt-0.5">
                          {connector.consecutiveFailures} consecutive err
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600">
                      {outcome?.executionDurationMs ? `${outcome.executionDurationMs}ms` : '—'}
                    </td>

                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {outcome?.articlesRetrieved ?? '—'}
                    </td>

                    <td className="py-3 px-3 text-right">
                      {(isCircuitOpen || outcome?.status === 'FAILED') && screeningRun && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(connector.id)}
                          isLoading={retryingId === connector.id}
                          leftIcon={<RefreshCw className="h-3 w-3" />}
                          className="text-xs py-1 px-2.5 min-h-[28px] text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                        >
                          Retry Connector
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Multilingual Query Expansion & Provenance (AM-07) */}
      <MultilingualQueriesSection
        queryVariants={screeningRun?.queryVariants || []}
        subjects={subjects}
      />

      {/* 5. Historical Period Policy & Lookback Controls (AM-10) */}
      <HistoricalPeriodSection
        historicalPeriod={screeningRun?.historicalPeriod}
        activeRole={activeRole}
        subjectId={screeningRun?.subjectId || subjects[0]?.id}
        onRefreshRun={onRefreshRun}
      />

      {/* 6. Immutable Search Audit Manifest & Hash Integrity (AM-08) */}
      <AuditManifestSection
        manifestId={screeningRun?.manifestId}
        activeRole={activeRole}
        caseId={caseId}
      />
        </>
      )}
    </div>
  );
};

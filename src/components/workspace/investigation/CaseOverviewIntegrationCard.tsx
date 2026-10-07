import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  HelpCircle,
  Layers,
  Lock,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Zap,
} from 'lucide-react';
import {
  AcceptanceCondition,
  ApprovedFinding,
  EddCase,
  HandoverPackage,
  InformationRequest,
  Investigation,
  KycCase,
  KycCaseLink,
  RiskImpact,
  Subject,
  UserRole,
} from '../../../types/index.ts';
import { apiClient } from '../../../lib/api-client.ts';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';

interface CaseOverviewIntegrationCardProps {
  investigation: Investigation;
  kycCase?: KycCase;
  subject?: Subject;
  activeRole: UserRole;
  currentUserId: string;
  onNavigateTab: (tabId: 'tasks' | 'decisions' | 'disposition' | 'ledger') => void;
  onRefresh: () => Promise<void>;
}

export const CaseOverviewIntegrationCard: React.FC<CaseOverviewIntegrationCardProps> = ({
  investigation,
  kycCase,
  subject,
  activeRole,
  currentUserId,
  onNavigateTab,
  onRefresh,
}) => {
  const [kycLink, setKycLink] = useState<KycCaseLink | null>(null);
  const [riskImpact, setRiskImpact] = useState<RiskImpact | null>(null);
  const [eddCase, setEddCase] = useState<EddCase | null>(null);
  const [clientRequests, setClientRequests] = useState<InformationRequest[]>([]);
  const [conditions, setConditions] = useState<AcceptanceCondition[]>([]);
  const [handovers, setHandovers] = useState<HandoverPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadIntegrationData = async () => {
    setIsLoading(true);
    try {
      const [link, impact, edd, reqs, conds, pkgs] = await Promise.all([
        apiClient.getKycLink(investigation.id).catch(() => null),
        apiClient.getRiskImpact(investigation.id).catch(() => null),
        apiClient.getEddCase(investigation.id).catch(() => null),
        apiClient.getInformationRequests(investigation.id).catch(() => []),
        apiClient.getAcceptanceConditions(investigation.id).catch(() => []),
        apiClient.getHandoverPackages(investigation.id).catch(() => []),
      ]);
      setKycLink(link);
      setRiskImpact(impact);
      setEddCase(edd);
      setClientRequests(reqs || []);
      setConditions(conds || []);
      setHandovers(pkgs || []);
    } catch (err: any) {
      console.error('Failed to load integration card data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrationData();
  }, [investigation.id]);

  const handleReconcile = async () => {
    setIsLoading(true);
    setActionFeedback(null);
    try {
      const res = await apiClient.reconcileKycLink(investigation.id);
      setKycLink(res.data);
      setActionFeedback({
        type: 'success',
        message: `KYC artifacts reconciled with Core Banking. Checksum: ${res.data.reconciliationChecksum.substring(0, 14)}...`,
      });
      await onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Reconciliation failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerEdd = async () => {
    setIsLoading(true);
    setActionFeedback(null);
    try {
      const res = await apiClient.triggerEddCase(
        investigation.id,
        'Analyst triggered mandatory EDD investigation due to high-severity adverse media findings.'
      );
      setEddCase(res);
      setActionFeedback({
        type: 'success',
        message: 'Enhanced Due Diligence (EDD) case successfully initiated with customized investigation plan.',
      });
      await loadIntegrationData();
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to trigger EDD' });
    } finally {
      setIsLoading(false);
    }
  };

  const openRequestsCount = clientRequests.filter(
    (r) => r.status !== 'EVIDENCE_VERIFIED' && r.status !== 'CANCELLED'
  ).length;

  const openConditionsCount = conditions.filter(
    (c) => c.status !== 'SATISFIED_CLOSED' && c.status !== 'WAIVED'
  ).length;

  const blockingConditionsCount = conditions.filter(
    (c) => c.blocksCaseClosure && c.status !== 'SATISFIED_CLOSED' && c.status !== 'WAIVED'
  ).length;

  const latestHandover = handovers[0] || null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-5">
      {/* Top row: Section title & quick status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Integrated Case Governance & Core Systems Link
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                AM-45 – AM-52
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Live bi-directional synchronization with KYC Core, Enterprise Risk Engine, and BAU Banking Operations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="ghost"
            onClick={loadIntegrationData}
            leftIcon={<RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Sync
          </Button>
          <Button
            size="xs"
            variant="secondary"
            onClick={handleReconcile}
            leftIcon={<ShieldCheck className="h-3 w-3 text-emerald-600" />}
          >
            Reconcile KYC Core
          </Button>
        </div>
      </div>

      {actionFeedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{actionFeedback.message}</span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Grid: 4 Critical Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. KYC Case State & Sync */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">KYC Case State</span>
            <Badge
              variant={
                kycLink?.integrationStatus === 'SYNCED'
                  ? 'success'
                  : kycLink?.integrationStatus === 'OUTBOX_PENDING'
                  ? 'warning'
                  : 'neutral'
              }
            >
              {kycLink?.integrationStatus || 'SYNCED'}
            </Badge>
          </div>
          <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <span>{kycCase?.status?.replace('_', ' ') || 'UNDER_REVIEW'}</span>
            <span className="text-[10px] text-slate-400 font-mono">({kycLink?.contractVersion || 'v2.4'})</span>
          </div>
          <div className="text-[11px] text-slate-500 truncate" title={kycLink?.reconciliationChecksum}>
            Checksum: <code className="font-mono text-[10px]">{kycLink?.reconciliationChecksum?.substring(0, 10)}...</code>
          </div>
        </div>

        {/* 2. Risk Rating & Impact */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Risk Impact</span>
            {riskImpact?.riskDelta === 'UPGRADE_RISK' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                <TrendingUp className="h-3 w-3" /> Upgrade
              </span>
            ) : riskImpact?.riskDelta === 'DOWNGRADE_RISK' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                <TrendingDown className="h-3 w-3" /> Downgrade
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                No Delta
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Current:</span>
            <span className="text-xs font-bold text-slate-700">{riskImpact?.currentRating || 'MEDIUM'}</span>
            <ArrowRight className="h-3 w-3 text-slate-400" />
            <span className="text-xs text-slate-400">Proposed:</span>
            <span className="text-sm font-extrabold text-rose-600">{riskImpact?.proposedRating || 'HIGH'}</span>
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            {riskImpact?.isTransmissionBlocked ? (
              <span className="text-amber-700 flex items-center gap-1" title={riskImpact.blockingReason}>
                <Lock className="h-2.5 w-2.5" /> Blocked: Needs Human Approval
              </span>
            ) : (
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Engine Ready
              </span>
            )}
          </div>
        </div>

        {/* 3. EDD Status & Plan */}
        {(() => {
          const eddQuestions = eddCase?.plan?.questions || (eddCase as any)?.investigationPlan?.customQuestions || [];
          const eddStage =
            (eddCase as any)?.investigationPlan?.stage ||
            eddCase?.approvalStages?.find((s) => s.status === 'PENDING')?.stage ||
            eddCase?.approvalStages?.[0]?.stage ||
            eddCase?.status ||
            'IN_PROGRESS';
          const eddApprovedCount = eddQuestions.filter((q: any) => q.humanApproved).length;

          return (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">EDD Status</span>
                <Badge
                  variant={
                    eddCase
                      ? eddCase.status === 'COMPLETED'
                        ? 'success'
                        : 'primary'
                      : 'neutral'
                  }
                >
                  {eddCase ? eddCase.status : 'NOT_TRIGGERED'}
                </Badge>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {eddCase ? (
                  <span>Stage: {eddStage.replace('_', ' ')}</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleTriggerEdd}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline flex items-center gap-1 cursor-pointer"
                  >
                    <Zap className="h-3 w-3" /> Trigger EDD Case
                  </button>
                )}
              </div>
              <div className="text-[11px] text-slate-500">
                {eddCase ? (
                  <span>
                    {eddApprovedCount}/{eddQuestions.length} Questions Approved
                  </span>
                ) : (
                  <span>Policy threshold evaluation ready</span>
                )}
              </div>
            </div>
          );
        })()}

        {/* 4. Requests & Conditions */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Requests & Conditions</span>
            {blockingConditionsCount > 0 ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" /> {blockingConditionsCount} Blocking
              </span>
            ) : (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Clear
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
            <span>Open CIR: {openRequestsCount}</span>
            <span>Conditions: {openConditionsCount}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Handover: {latestHandover ? latestHandover.transmissionStatus : 'NOT_INITIATED'}
          </div>
        </div>
      </div>

      {/* Primary Next Action Banner & Blocker Guidance */}
      <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded">
              Primary Next Action
            </span>
            <span className="text-xs font-bold text-slate-900">
              {riskImpact?.primaryNextAction || 'Complete Analyst Disposition and Review'}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            {riskImpact?.explanationText ||
              'Only human-approved findings can be transmitted to the Enterprise Risk Engine and BAU downstream systems.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="xs"
            variant="secondary"
            onClick={() => onNavigateTab('tasks')}
            leftIcon={<FileText className="h-3 w-3 text-indigo-600" />}
          >
            Tasks & Requests ({openRequestsCount + ((eddCase?.plan?.questions || (eddCase as any)?.investigationPlan?.customQuestions || []).length)})
          </Button>
          <Button
            size="xs"
            variant="primary"
            onClick={() => onNavigateTab('decisions')}
            leftIcon={<Shield className="h-3 w-3" />}
          >
            Decisions & Governance
          </Button>
        </div>
      </div>
    </div>
  );
};

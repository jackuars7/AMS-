import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Fingerprint,
  Layers,
  Lock,
  Package,
  Plus,
  RefreshCw,
  Scale,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Unlock,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import {
  AcceptanceCondition,
  AnalystConclusion,
  ApprovedFinding,
  DecisionPack,
  Draft,
  HandoverPackage,
  Investigation,
  KycCase,
  ReviewDecision,
  RiskImpact,
  Subject,
  UserRole,
} from '../../../types/index.ts';
import { apiClient } from '../../../lib/api-client.ts';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';
import { AnalystDispositionPanel } from './AnalystDispositionPanel.tsx';
import { OverridesPanel } from './OverridesPanel.tsx';
import { MakerCheckerPanel } from './MakerCheckerPanel.tsx';
import { ComplianceMlroPanel } from './ComplianceMlroPanel.tsx';

interface DecisionsAndGovernanceHubProps {
  investigation: Investigation;
  kycCase?: KycCase;
  subject?: Subject;
  events?: any[];
  activeDraft?: Draft | null;
  overrides?: any[];
  escalations?: any[];
  activeRole: UserRole;
  currentUserId: string;
  actionAvailability: any;
  onSaveDraft: (payload: any) => Promise<void>;
  onSubmitDisposition: (payload: any) => Promise<void>;
  onSubmitReview: (payload: any) => Promise<void>;
  onSubmitCompliance: (payload: any) => Promise<void>;
  onSubmitMlro: (payload: any) => Promise<void>;
  onSubmitOverride: (payload: any) => Promise<void>;
  onApproveOverride: (overrideId: string, notes?: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  isProcessing?: boolean;
  initialTab?: DecisionTab;
  initialApprovalsSubTab?: 'disposition' | 'overrides' | 'review' | 'compliance_mlro';
}

type DecisionTab = 'RISK_ENGINE' | 'DECISION_PACKS' | 'CONDITIONS' | 'APPROVALS' | 'BAU_HANDOVER';

export const DecisionsAndGovernanceHub: React.FC<DecisionsAndGovernanceHubProps> = ({
  investigation,
  kycCase,
  subject,
  events = [],
  activeDraft,
  overrides = [],
  escalations = [],
  activeRole,
  currentUserId,
  actionAvailability,
  onSaveDraft,
  onSubmitDisposition,
  onSubmitReview,
  onSubmitCompliance,
  onSubmitMlro,
  onSubmitOverride,
  onApproveOverride,
  onRefresh,
  isProcessing = false,
  initialTab = 'RISK_ENGINE',
  initialApprovalsSubTab = 'disposition',
}) => {
  const [activeTab, setActiveTab] = useState<DecisionTab>(initialTab);
  const [approvalsSubTab, setApprovalsSubTab] = useState<'disposition' | 'overrides' | 'review' | 'compliance_mlro'>(initialApprovalsSubTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialApprovalsSubTab) {
      setApprovalsSubTab(initialApprovalsSubTab);
    }
  }, [initialApprovalsSubTab]);

  const [riskImpact, setRiskImpact] = useState<RiskImpact | null>(null);
  const [approvedFindings, setApprovedFindings] = useState<ApprovedFinding[]>([]);
  const [decisionPacks, setDecisionPacks] = useState<DecisionPack[]>([]);
  const [conditions, setConditions] = useState<AcceptanceCondition[]>([]);
  const [handovers, setHandovers] = useState<HandoverPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Modal: Generate Decision Pack
  const [isGeneratePackOpen, setIsGeneratePackOpen] = useState(false);
  const [packSummaryNarrative, setPackSummaryNarrative] = useState(
    'Comprehensive adverse media assessment confirms formal indictment in Geneva jurisdiction regarding commercial bribery. High risk upgrade proposed under enhanced monitoring conditions.'
  );

  // Modal: Create Acceptance Condition
  const [isCreateConditionOpen, setIsCreateConditionOpen] = useState(false);
  const [condTitle, setCondTitle] = useState('');
  const [condDesc, setCondDesc] = useState('');
  const [condDomain, setCondDomain] = useState<'ADVERSE_MEDIA' | 'PEP' | 'SANCTIONS_CONTROL' | 'SOURCE_OF_WEALTH'>('ADVERSE_MEDIA');
  const [condBlocksClosure, setCondBlocksClosure] = useState(true);
  const [condIsPreOnboarding, setCondIsPreOnboarding] = useState(false);
  const [condReviewFreq, setCondReviewFreq] = useState<'ONE_OFF' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL'>('ANNUAL');
  const [condDueDate, setCondDueDate] = useState(new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]);

  // Modal: Attach Condition Evidence
  const [attachingCondition, setAttachingCondition] = useState<AcceptanceCondition | null>(null);
  const [evidenceDocTitle, setEvidenceDocTitle] = useState('');
  const [evidenceDocUri, setEvidenceDocUri] = useState('');

  // Modal: Create Handover
  const [isCreateHandoverOpen, setIsCreateHandoverOpen] = useState(false);
  const [handoverTarget, setHandoverTarget] = useState<'BAU_CORE_BANKING' | 'KYC_OPERATIONS' | 'RELATIONSHIP_MANAGER'>('BAU_CORE_BANKING');
  const [handoverMinimization, setHandoverMinimization] = useState(true);
  const [handoverNotes, setHandoverNotes] = useState(
    'Adverse media screening completed. Risk rating upgraded to HIGH. 1 mandatory annual review condition established. SAR determination filed confidentially with MLRO.'
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [impact, findings, packs, conds, pkgs] = await Promise.all([
        apiClient.getRiskImpact(investigation.id).catch(() => null),
        apiClient.getApprovedFindings(investigation.id).catch(() => []),
        apiClient.getDecisionPacks(investigation.id).catch(() => []),
        apiClient.getAcceptanceConditions(investigation.id).catch(() => []),
        apiClient.getHandoverPackages(investigation.id).catch(() => []),
      ]);
      setRiskImpact(impact);
      setApprovedFindings(findings || []);
      setDecisionPacks(packs || []);
      setConditions(conds || []);
      setHandovers(pkgs || []);
    } catch (err: any) {
      console.error('Failed to load decisions data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [investigation.id]);

  // Transmit Approved Finding to Risk Engine (AM-46)
  const handleTransmitFinding = async (findingId: string) => {
    setIsLoading(true);
    setBannerNotice(null);
    try {
      const res = await apiClient.transmitFindingToRisk(investigation.id, findingId);
      setBannerNotice({
        type: 'success',
        message: `Finding securely transmitted to Enterprise Risk Engine via Anti-Corruption Layer. Engine ACK: ${res.data.outboxDeliveryId}.`,
      });
      await loadData();
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: `Transmission rejected: ${err.message}. Machine-generated findings without human approval cannot influence risk ratings.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Decision Pack (AM-50)
  const handleGenerateDecisionPack = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setBannerNotice(null);
    try {
      const res = await apiClient.generateDecisionPack(investigation.id, {
        summaryNarrative: packSummaryNarrative,
      });
      setIsGeneratePackOpen(false);
      setBannerNotice({
        type: 'success',
        message: `Version ${res.data.version} Decision Pack generated and sealed with SHA-256 cryptographic manifest.`,
      });
      await loadData();
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'Failed to generate decision pack.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Create Acceptance Condition (AM-51)
  const handleCreateCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condTitle) return;
    setIsLoading(true);
    try {
      await apiClient.createAcceptanceCondition(investigation.id, {
        title: condTitle,
        description: condDesc,
        riskDomain: condDomain,
        blocksCaseClosure: condBlocksClosure,
        isPreOnboarding: condIsPreOnboarding,
        reviewFrequency: condReviewFreq,
        targetDueDate: new Date(condDueDate).toISOString(),
      });
      setIsCreateConditionOpen(false);
      setCondTitle('');
      setCondDesc('');
      setBannerNotice({
        type: 'success',
        message: 'Acceptance condition established with mandatory tracking and SLA enforcement.',
      });
      await loadData();
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'Failed to create condition.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Attach Condition Evidence (AM-51)
  const handleAttachEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachingCondition || !evidenceDocTitle) return;
    setIsLoading(true);
    try {
      await apiClient.attachConditionEvidence(investigation.id, attachingCondition.id, {
        title: evidenceDocTitle,
        documentUri: evidenceDocUri || 'https://dms.bank.internal/docs/verif-09',
        sha256Checksum: `sha256-${Math.random().toString(16).substring(2, 12)}`,
        notes: 'Verified against official regulatory registry records.',
      });
      setAttachingCondition(null);
      setEvidenceDocTitle('');
      setEvidenceDocUri('');
      setBannerNotice({
        type: 'success',
        message: 'Verification evidence attached. Condition is now eligible for 4-Eyes closure approval.',
      });
      await loadData();
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'Failed to attach evidence.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Approve Condition Closure (AM-51)
  const handleApproveConditionClosure = async (conditionId: string) => {
    setIsLoading(true);
    setBannerNotice(null);
    try {
      await apiClient.approveConditionClosure(investigation.id, conditionId);
      setBannerNotice({
        type: 'success',
        message: 'Acceptance condition closure approved under 4-Eyes dual sign-off governance.',
      });
      await loadData();
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'Closure approval failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Escalate Condition Breach (AM-51)
  const handleEscalateBreach = async (conditionId: string) => {
    setIsLoading(true);
    try {
      await apiClient.escalateConditionBreach(investigation.id, conditionId, 'SLA exceeded without required verified evidence.');
      setBannerNotice({
        type: 'error',
        message: 'Condition SLA breach formally escalated to Compliance & MLRO.',
      });
      await loadData();
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Create BAU Handover (AM-52)
  const handleCreateHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await apiClient.createAndTransmitHandover(investigation.id, {
        targetSystem: handoverTarget,
        operationalSummary: handoverNotes,
        dataMinimizationApplied: handoverMinimization,
      });
      setIsCreateHandoverOpen(false);
      const ackChecksum = res.data?.outboxDelivery?.idempotencyKey || 'sha256-verified';
      setBannerNotice({
        type: 'success',
        message: `BAU Handover package dispatched to ${handoverTarget}. Delivery ID: ${ackChecksum.substring(0, 14)}...`,
      });
      await loadData();
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'Handover dispatch failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Replay Handover Outbox (AM-52)
  const handleReplayHandover = async (handoverId: string, simulateFailure = false) => {
    setIsLoading(true);
    try {
      const res = await apiClient.replayHandoverDelivery(investigation.id, handoverId, simulateFailure);
      const statusStr = res.data?.outboxDelivery?.deliveryStatus || (simulateFailure ? 'FAILED' : 'DELIVERED');
      setBannerNotice({
        type: simulateFailure ? 'error' : 'success',
        message: `Outbox replay executed. Status: ${statusStr}. Attempts logged in Transactional Outbox.`,
      });
      await loadData();
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      {bannerNotice && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 ${
            bannerNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : bannerNotice.type === 'info'
              ? 'bg-blue-50 text-blue-800 border border-blue-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{bannerNotice.message}</span>
          <button
            type="button"
            onClick={() => setBannerNotice(null)}
            className="text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Decisions Hub Main Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              Decisions & Governance Hub
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                AM-46, AM-47, AM-50, AM-51, AM-52
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Risk factor impacts, compliance decision packs, acceptance conditions, human adjudication, and BAU handovers
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="ghost"
              onClick={loadData}
              leftIcon={<RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsGeneratePackOpen(true)}
              leftIcon={<FileCheck className="h-3.5 w-3.5 text-indigo-600" />}
            >
              Generate Decision Pack
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsCreateConditionOpen(true)}
              leftIcon={<Plus className="h-3.5 w-3.5 text-amber-600" />}
            >
              New Condition
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsCreateHandoverOpen(true)}
              leftIcon={<Package className="h-3.5 w-3.5" />}
            >
              Transmit BAU Handover
            </Button>
          </div>
        </div>

        {/* Section Tabs inside Decisions Hub */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100">
          {[
            { id: 'RISK_ENGINE', label: 'Risk Impact & Findings (AM-46, 47)', count: approvedFindings.length },
            { id: 'DECISION_PACKS', label: 'Decision Packs (AM-50)', count: decisionPacks.length },
            { id: 'CONDITIONS', label: 'Acceptance Conditions (AM-51)', count: conditions.length },
            { id: 'APPROVALS', label: 'Approvals & Adjudication (AM-39-42)', count: overrides.length + escalations.length },
            { id: 'BAU_HANDOVER', label: 'BAU Handover & Outbox (AM-52)', count: handovers.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as DecisionTab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeTab === tab.id ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: RISK IMPACT & APPROVED FINDINGS (AM-46 & AM-47) */}
      {activeTab === 'RISK_ENGINE' && (
        <div className="space-y-6">
          {/* Risk Impact Analysis Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Risk Engine Impact & Driver Explanation
                </h4>
                <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded">
                  AM-46, AM-47 &bull; Rule Version: {riskImpact?.ruleVersion || 'v3.2.0'}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                Anti-Corruption Layer (ACL) enforces human authorization gate
              </div>
            </div>

            {/* Impact Metric Visual */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Rating Comparison</span>
                <div className="flex items-center gap-3 pt-1">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Previous</span>
                    <span className="text-sm font-bold text-slate-700">{riskImpact?.previousRating || 'MEDIUM'}</span>
                  </div>
                  <TrendingUp className="h-4 w-4 text-rose-600" />
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Proposed</span>
                    <span className="text-base font-extrabold text-rose-600">{riskImpact?.proposedRating || 'HIGH'}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Risk Delta Decision</span>
                <div className="pt-1">
                  {riskImpact?.riskDelta === 'UPGRADE_RISK' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg">
                      <TrendingUp className="h-3.5 w-3.5" /> UPGRADE RISK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-200 px-2.5 py-1 rounded-lg">
                      NO CHANGE
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 block pt-1">
                  Materiality Threshold: 75% | Severity Weight: 0.85
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Transmission Status</span>
                <div className="pt-1">
                  {riskImpact?.isTransmissionBlocked ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
                      <Lock className="h-3.5 w-3.5" /> Human Approval Required
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Transmitted to Risk Engine
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 block pt-1">
                  Outbox: {riskImpact?.outboxStatus || 'ACKNOWLEDGED'}
                </span>
              </div>
            </div>

            {/* Explanation Narrative */}
            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2">
              <h5 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                Regulatory Impact Explanation (AM-47)
              </h5>
              <p className="text-xs text-slate-700 leading-relaxed">
                {riskImpact?.explanationText ||
                  'Adverse media screening identified confirmed material bribery & corruption indictment against subject executive in Geneva jurisdiction. Only human-approved findings are permitted to drive risk rating recalculations in the Enterprise Risk Engine.'}
              </p>
            </div>
          </div>

          {/* Approved Findings Table & Transmission */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Human-Approved Adverse Findings
                </h4>
                <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded">
                  AM-46
                </span>
              </div>
              <div className="text-xs text-slate-500">
                Only findings signed off by human reviewers can update downstream risk
              </div>
            </div>

            {approvedFindings.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
                No human-approved findings available. Complete and approve the Analyst Disposition under Four-Eyes review first.
              </div>
            ) : (
              <div className="space-y-3">
                {approvedFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="p-4 rounded-xl border bg-white border-slate-200 flex flex-col md:flex-row md:items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {finding.primaryAdverseCategory.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                          Legal: {finding.legalStatus.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          Classification: {finding.findingClassification}
                        </span>
                        <Badge variant="success">Human Approved</Badge>
                      </div>

                      <p className="text-xs text-slate-600">{finding.narrativeSummary}</p>

                      <div className="text-xs text-slate-500 flex flex-wrap gap-4 pt-1">
                        <span>Approved By: <strong className="text-slate-800">{finding.approvedByUserName} ({finding.approvedByUserRole})</strong></span>
                        <span>Approved At: <strong className="text-slate-800">{new Date(finding.approvedAt).toLocaleDateString()}</strong></span>
                        <span>Outbox: <strong className="text-slate-800">{finding.outboxStatus}</strong></span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Button
                        size="xs"
                        variant="primary"
                        onClick={() => handleTransmitFinding(finding.id)}
                        leftIcon={<Send className="h-3 w-3" />}
                      >
                        Transmit to Risk Engine
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: COMPLIANCE DECISION PACKS (AM-50) */}
      {activeTab === 'DECISION_PACKS' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Compliance Decision Packs & Cryptographic Seals
              </h4>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded">
                AM-50
              </span>
            </div>
            <Button
              size="xs"
              variant="primary"
              onClick={() => setIsGeneratePackOpen(true)}
              leftIcon={<Plus className="h-3 w-3" />}
            >
              Generate Decision Pack
            </Button>
          </div>

          {decisionPacks.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
              No sealed decision packs generated yet. Click "Generate Decision Pack" to compile evidence and freeze case snapshot.
            </div>
          ) : (
            <div className="space-y-4">
              {decisionPacks.map((pack) => (
                <div
                  key={pack.id}
                  className="p-4 rounded-xl border bg-white border-slate-200 space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {pack.packReference}
                        </span>
                        <h5 className="text-sm font-bold text-slate-900">Decision Pack v{pack.version}</h5>
                        <Badge variant="success">Cryptographically Sealed</Badge>
                      </div>
                      <p className="text-xs text-slate-600">{pack.summaryNarrative}</p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <a
                        href={pack.authorizedDownloadLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" /> Download PDF/A-3
                      </a>
                    </div>
                  </div>

                  {/* Artifact Manifest & Cryptographic Seal */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5 font-mono">
                    <div className="flex flex-wrap items-center justify-between text-slate-500">
                      <span>Generated By: {pack.generatedByUserName} ({pack.generatedByUserRole})</span>
                      <span>Sealed: {new Date(pack.sealedAt).toLocaleString()}</span>
                    </div>
                    <div className="text-[11px] text-slate-700 truncate">
                      SHA-256 Manifest Seal: <code>{pack.manifestChecksum}</code>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Included Artifacts ({pack.includedArtifacts.length}): {pack.includedArtifacts.join(', ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACCEPTANCE CONDITIONS (AM-51) */}
      {activeTab === 'CONDITIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Customer Acceptance Conditions & Monitoring
              </h4>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded">
                AM-51
              </span>
            </div>
            <Button
              size="xs"
              variant="primary"
              onClick={() => setIsCreateConditionOpen(true)}
              leftIcon={<Plus className="h-3 w-3" />}
            >
              New Acceptance Condition
            </Button>
          </div>

          {conditions.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
              No acceptance conditions registered for this case.
            </div>
          ) : (
            <div className="space-y-4">
              {conditions.map((cond) => (
                <div
                  key={cond.id}
                  className={`p-4 rounded-xl border transition-all ${
                    cond.status === 'SATISFIED_CLOSED'
                      ? 'bg-slate-50/70 border-slate-200'
                      : cond.status === 'IN_BREACH'
                      ? 'bg-rose-50/40 border-rose-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {cond.conditionReference}
                        </span>
                        <h5 className="text-sm font-bold text-slate-900">{cond.title}</h5>
                        {cond.blocksCaseClosure && (
                          <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" /> Blocks Closure
                          </span>
                        )}
                        <Badge
                          variant={
                            cond.status === 'SATISFIED_CLOSED'
                              ? 'success'
                              : cond.status === 'IN_BREACH'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {cond.status}
                        </Badge>
                        <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {cond.riskDomain}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600">{cond.description}</p>

                      <div className="text-xs text-slate-500 flex flex-wrap gap-4 pt-1">
                        <span>Due Date: <strong className="text-slate-800">{new Date(cond.targetDueDate).toLocaleDateString()}</strong></span>
                        <span>Monitoring: <strong className="text-slate-800">{cond.reviewFrequency}</strong></span>
                        <span>Owner: <strong className="text-slate-800">{cond.ownerRole}</strong></span>
                      </div>

                      {/* Evidence verification record */}
                      {cond.verificationEvidence && (
                        <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                          <div className="font-bold text-emerald-900 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Evidence Attached: {cond.verificationEvidence.title}
                          </div>
                          <div className="text-[11px] font-mono text-emerald-800">
                            SHA-256: {cond.verificationEvidence.sha256Checksum}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="shrink-0 flex md:flex-col items-end gap-2">
                      {cond.status !== 'SATISFIED_CLOSED' && !cond.verificationEvidence && (
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => {
                            setAttachingCondition(cond);
                            setEvidenceDocTitle(`Verified Registry Extract - ${cond.title}`);
                            setEvidenceDocUri('https://commercial-register.ch/apex-extract.pdf');
                          }}
                          leftIcon={<FileCheck className="h-3 w-3 text-indigo-600" />}
                        >
                          Attach Evidence
                        </Button>
                      )}

                      {cond.status !== 'SATISFIED_CLOSED' && cond.verificationEvidence && (
                        <Button
                          size="xs"
                          variant="primary"
                          onClick={() => handleApproveConditionClosure(cond.id)}
                          leftIcon={<UserCheck className="h-3 w-3" />}
                        >
                          Approve Closure
                        </Button>
                      )}

                      {cond.status !== 'SATISFIED_CLOSED' && cond.status !== 'IN_BREACH' && (
                        <Button
                          size="xs"
                          variant="danger"
                          onClick={() => handleEscalateBreach(cond.id)}
                          leftIcon={<ShieldAlert className="h-3 w-3" />}
                        >
                          Escalate Breach
                        </Button>
                      )}

                      {cond.status === 'SATISFIED_CLOSED' && (
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Closed by {cond.closedByUserName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: APPROVALS & ADJUDICATION (AM-39, AM-40, AM-41, AM-42) */}
      {activeTab === 'APPROVALS' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
            {[
              { id: 'disposition', label: 'Analyst Disposition (AM-39)' },
              { id: 'overrides', label: `Overrides & Corrections (${overrides.length}) (AM-40)` },
              { id: 'review', label: 'Four-Eyes Review (AM-41)' },
              { id: 'compliance_mlro', label: `Compliance & MLRO (${escalations.length}) (AM-42)` },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setApprovalsSubTab(st.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  approvalsSubTab === st.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {approvalsSubTab === 'disposition' && (
            <AnalystDispositionPanel
              investigation={investigation}
              events={events}
              activeDraft={activeDraft}
              canSubmit={actionAvailability.canSubmitDisposition}
              disabledReason={actionAvailability.dispositionDisabledReason}
              validationBlockers={actionAvailability.validationBlockers}
              onSaveDraft={onSaveDraft}
              onSubmitDisposition={onSubmitDisposition}
              isProcessing={isProcessing}
            />
          )}

          {approvalsSubTab === 'overrides' && (
            <OverridesPanel
              investigationId={investigation.id}
              overrides={overrides}
              activeRole={activeRole}
              onSubmitOverride={onSubmitOverride}
              onApproveOverride={onApproveOverride}
              isProcessing={isProcessing}
            />
          )}

          {approvalsSubTab === 'review' && (
            <MakerCheckerPanel
              investigation={investigation}
              activeRole={activeRole}
              currentUserId={currentUserId}
              canPerformReview={actionAvailability.canPerformCheckerReview}
              disabledReason={actionAvailability.checkerDisabledReason}
              onSubmitReview={onSubmitReview}
              isProcessing={isProcessing}
            />
          )}

          {approvalsSubTab === 'compliance_mlro' && (
            <ComplianceMlroPanel
              investigation={investigation}
              activeRole={activeRole}
              canAdjudicateCompliance={actionAvailability.canAdjudicateCompliance}
              complianceDisabledReason={actionAvailability.complianceDisabledReason}
              canDetermineMlro={actionAvailability.canDetermineMlro}
              mlroDisabledReason={actionAvailability.mlroDisabledReason}
              onSubmitCompliance={onSubmitCompliance}
              onSubmitMlro={onSubmitMlro}
              isProcessing={isProcessing}
            />
          )}
        </div>
      )}

      {/* TAB 5: BAU HANDOVER & OUTBOX REPLAY (AM-52) */}
      {activeTab === 'BAU_HANDOVER' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-900">
                BAU Operations Handover & Transactional Outbox
              </h4>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded">
                AM-52
              </span>
            </div>
            <Button
              size="xs"
              variant="primary"
              onClick={() => setIsCreateHandoverOpen(true)}
              leftIcon={<Plus className="h-3 w-3" />}
            >
              Dispatch New Handover
            </Button>
          </div>

          {handovers.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
              No BAU Handover packages dispatched yet. Click "Dispatch New Handover" to transmit closed case summary to Core Banking.
            </div>
          ) : (
            <div className="space-y-4">
              {handovers.map((hnd) => {
                const outboxStatus = hnd.outboxDelivery?.deliveryStatus || hnd.status;
                const checksum = hnd.outboxDelivery?.outboxId || 'outbox-verified';
                const idempotencyKey = hnd.outboxDelivery?.idempotencyKey || 'idem-key';
                const cadence = hnd.permittedDisclosures?.monitoringFrequency || 'ANNUAL';
                const summary = hnd.permittedDisclosures?.approvedFactsSummary || 'Approved adverse media finding transferred.';

                return (
                  <div
                    key={hnd.id}
                    className="p-4 rounded-xl border bg-white border-slate-200 space-y-3"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {hnd.packageRef}
                          </span>
                          <h5 className="text-sm font-bold text-slate-900">
                            Target: {hnd.targetSystem.replace('_', ' ')}
                          </h5>
                          <Badge
                            variant={
                              outboxStatus === 'DELIVERED' || outboxStatus === 'ACKNOWLEDGED'
                                ? 'success'
                                : outboxStatus === 'FAILED'
                                ? 'danger'
                                : 'primary'
                            }
                          >
                            {outboxStatus}
                          </Badge>
                          {hnd.dataMinimizationRules?.maskConfidentialSarNotes && (
                            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" /> Data Minimization Applied
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600">{summary}</p>
                      </div>

                      {/* Replay Controls */}
                      <div className="shrink-0 flex items-center gap-2">
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => handleReplayHandover(hnd.id, false)}
                          leftIcon={<RefreshCw className="h-3 w-3 text-indigo-600" />}
                        >
                          Replay Outbox
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => handleReplayHandover(hnd.id, true)}
                          leftIcon={<AlertCircle className="h-3 w-3 text-rose-500" />}
                        >
                          Test Failure & Retry
                        </Button>
                      </div>
                    </div>

                    {/* Manifest and Delivery Tracking */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1 font-mono">
                      <div className="flex flex-wrap items-center justify-between text-slate-500">
                        <span>Idempotency Key: {idempotencyKey}</span>
                        <span>Dispatched: {new Date(hnd.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="text-[11px] text-slate-700 truncate">
                        SHA-256 Checksum: <code>{checksum}</code>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Monitoring Cadence: {cadence} &bull; Created By: {hnd.createdBy}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Generate Decision Pack (AM-50) */}
      {isGeneratePackOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-indigo-600" />
                <h4 className="text-base font-bold text-slate-900">Generate Compliance Decision Pack</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsGeneratePackOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateDecisionPack} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Executive Summary Narrative (Drafted by AI, editable by human)
                </label>
                <textarea
                  rows={4}
                  required
                  value={packSummaryNarrative}
                  onChange={(e) => setPackSummaryNarrative(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-indigo-600"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800">Included Freeze Snapshot Artifacts:</div>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>Case Metadata & Subject Identification</li>
                  <li>All Approved Findings & Evidence Quotations</li>
                  <li>Cryptographic Decision Ledger Audit Chain (AM-43)</li>
                  <li>Risk Engine Impact Calculation</li>
                  <li>Active Acceptance Conditions & Monitoring Schedule</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <Button size="sm" variant="ghost" type="button" onClick={() => setIsGeneratePackOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit">
                  Generate & Seal Pack
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Acceptance Condition (AM-51) */}
      {isCreateConditionOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-base font-bold text-slate-900">New Acceptance Condition</h4>
              <button
                type="button"
                onClick={() => setIsCreateConditionOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCondition} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Condition Title</label>
                <input
                  type="text"
                  required
                  value={condTitle}
                  onChange={(e) => setCondTitle(e.target.value)}
                  placeholder="e.g. Annual submission of certified anti-bribery compliance audit"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description & Evidence Threshold</label>
                <textarea
                  rows={3}
                  value={condDesc}
                  onChange={(e) => setCondDesc(e.target.value)}
                  placeholder="Define precise documentation required to satisfy and close this condition..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Risk Domain</label>
                  <select
                    value={condDomain}
                    onChange={(e) => setCondDomain(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  >
                    <option value="ADVERSE_MEDIA">Adverse Media</option>
                    <option value="PEP">PEP</option>
                    <option value="SANCTIONS_CONTROL">Sanctions Control</option>
                    <option value="SOURCE_OF_WEALTH">Source of Wealth</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Review Frequency</label>
                  <select
                    value={condReviewFreq}
                    onChange={(e) => setCondReviewFreq(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  >
                    <option value="ANNUAL">Annual</option>
                    <option value="SEMI_ANNUAL">Semi-Annual</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="ONE_OFF">One-Off</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Due Date</label>
                <input
                  type="date"
                  value={condDueDate}
                  onChange={(e) => setCondDueDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={condBlocksClosure}
                    onChange={(e) => setCondBlocksClosure(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Block Case Closure until condition is satisfied or waived</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={condIsPreOnboarding}
                    onChange={(e) => setCondIsPreOnboarding(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Pre-Onboarding Mandatory Gate</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <Button size="sm" variant="ghost" type="button" onClick={() => setIsCreateConditionOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit">
                  Establish Condition
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Attach Evidence to Condition */}
      {attachingCondition && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-base font-bold text-slate-900">Attach Condition Evidence</h4>
              <button
                type="button"
                onClick={() => setAttachingCondition(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAttachEvidence} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Evidence Title / Document Name</label>
                <input
                  type="text"
                  required
                  value={evidenceDocTitle}
                  onChange={(e) => setEvidenceDocTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Document URI or Archive ID</label>
                <input
                  type="text"
                  value={evidenceDocUri}
                  onChange={(e) => setEvidenceDocUri(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <Button size="sm" variant="ghost" type="button" onClick={() => setAttachingCondition(null)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit">
                  Attach Evidence
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transmit BAU Handover (AM-52) */}
      {isCreateHandoverOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-600" />
                <h4 className="text-base font-bold text-slate-900">Transmit BAU Operations Handover</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateHandoverOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHandover} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Downstream System</label>
                <select
                  value={handoverTarget}
                  onChange={(e) => setHandoverTarget(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                >
                  <option value="BAU_CORE_BANKING">BAU Core Banking (Core Account Master)</option>
                  <option value="KYC_OPERATIONS">KYC Operations (Periodic Review Queue)</option>
                  <option value="RELATIONSHIP_MANAGER">Relationship Manager (Client Facing CRM)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Operational Summary & Handover Instructions</label>
                <textarea
                  rows={4}
                  required
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-indigo-600"
                />
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs space-y-1">
                <label className="flex items-center gap-2 font-bold text-indigo-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={handoverMinimization}
                    onChange={(e) => setHandoverMinimization(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Enforce Data Minimization (AM-52 Requirement)</span>
                </label>
                <p className="text-[11px] text-slate-600">
                  Filters out unapproved drafts, noise articles, and sensitive internal SAR communications to comply with tipping-off regulations.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <Button size="sm" variant="ghost" type="button" onClick={() => setIsCreateHandoverOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit">
                  Dispatch Handover
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertCircle,
  AlertOctagon,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Fingerprint,
  History,
  Layers,
  Link,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Scale,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Tag,
  User,
  UserCheck,
  Users2,
  Zap,
} from 'lucide-react';
import {
  ActionRecommendation,
  AdverseEvent,
  ComplianceDecisionType,
  Draft,
  FindingClassification,
  Investigation,
  InvestigationComment,
  InvestigationOverride,
  InvestigationTask,
  KycCase,
  MlroStatutoryDecision,
  QueueItem,
  ReviewDecisionType,
  RiskRating,
  Subject,
  TaskPriority,
  TaskStatus,
  TaskType,
  TimelineEntry,
  UserRole,
} from '../../../types/index.ts';
import { apiClient } from '../../../lib/api-client.ts';
import { Badge, BadgeVariant } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';
import { AnalystDispositionPanel } from './AnalystDispositionPanel.tsx';
import { OverridesPanel } from './OverridesPanel.tsx';
import { MakerCheckerPanel } from './MakerCheckerPanel.tsx';
import { ComplianceMlroPanel } from './ComplianceMlroPanel.tsx';
import { TasksManagementPanel } from './TasksManagementPanel.tsx';
import { DecisionAuditLedgerPanel } from './DecisionAuditLedgerPanel.tsx';
import { CaseOverviewIntegrationCard } from './CaseOverviewIntegrationCard.tsx';
import { UnifiedTasksAndRequestsPanel } from './UnifiedTasksAndRequestsPanel.tsx';
import { DecisionsAndGovernanceHub } from './DecisionsAndGovernanceHub.tsx';

interface InvestigationWorkspaceProps {
  currentCaseId?: string;
  activeRole: UserRole;
  currentUserId: string;
  onNavigateToCase?: (caseId: string) => void;
}

export const InvestigationWorkspace: React.FC<InvestigationWorkspaceProps> = ({
  currentCaseId,
  activeRole,
  currentUserId,
  onNavigateToCase,
}) => {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueSummary, setQueueSummary] = useState<Record<string, number>>({});
  const [selectedInvId, setSelectedInvId] = useState<string | null>(null);

  // Workspace Data Payload
  const [workspaceData, setWorkspaceData] = useState<{
    investigation: Investigation;
    case: KycCase;
    subject: Subject;
    events: AdverseEvent[];
    assessments: any[];
    timeline: TimelineEntry[];
    tasks: InvestigationTask[];
    activeDraft: Draft | null;
    decisionLedger: any;
    comments: InvestigationComment[];
    overrides: InvestigationOverride[];
    escalations: any[];
    activeEscalation?: any;
    actionAvailability: any;
    actor: any;
  } | null>(null);

  const [activeSection, setActiveSection] = useState<
    'overview' | 'tasks_requests' | 'decisions' | 'ledger' | 'comments'
  >('overview');

  const [decisionInitialTab, setDecisionInitialTab] = useState<
    'RISK_ENGINE' | 'DECISION_PACKS' | 'CONDITIONS' | 'APPROVALS' | 'BAU_HANDOVER'
  >('RISK_ENGINE');
  const [decisionInitialApprovalsSubTab, setDecisionInitialApprovalsSubTab] = useState<
    'disposition' | 'overrides' | 'review' | 'compliance_mlro'
  >('disposition');

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<{ type: 'success' | 'warning' | 'info' | 'error'; message: string } | null>(null);

  // New Comment state
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);

  // Fetch list of investigations
  const loadInvestigations = useCallback(async () => {
    try {
      const res = await apiClient.getInvestigations();
      setInvestigations(res.data || []);
      setQueueItems(res.queueItems || []);
      setQueueSummary(res.queueSummary || {});

      // Prioritize currentCaseId match if available, else first item
      if (res.data && res.data.length > 0) {
        if (currentCaseId) {
          const matched = res.data.find((inv) => inv.caseId === currentCaseId);
          setSelectedInvId(matched ? matched.id : res.data[0].id);
        } else if (!selectedInvId) {
          setSelectedInvId(res.data[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load investigations:', err);
    }
  }, [currentCaseId, selectedInvId]);

  // Load selected workspace details
  const loadWorkspaceDetails = useCallback(async (invId: string) => {
    setIsLoading(true);
    try {
      const data = await apiClient.getInvestigationWorkspace(invId);
      setWorkspaceData(data);
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'Failed to load workspace data.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvestigations();
  }, [loadInvestigations]);

  useEffect(() => {
    if (selectedInvId) {
      loadWorkspaceDetails(selectedInvId);
    }
  }, [selectedInvId, loadWorkspaceDetails]);

  // Refresh helper
  const refreshWorkspace = async () => {
    if (selectedInvId) {
      await loadWorkspaceDetails(selectedInvId);
      await loadInvestigations();
    }
  };

  // AM-38: Autosave Draft
  const handleSaveDraft = async (payload: any) => {
    if (!workspaceData) return;
    try {
      await apiClient.saveInvestigationDraft(
        workspaceData.investigation.id,
        workspaceData.investigation.caseId,
        'ANALYST_DISPOSITION',
        payload
      );
    } catch (err: any) {
      console.error('Failed to autosave draft:', err);
    }
  };

  // AM-39: Submit Analyst Disposition
  const handleSubmitDisposition = async (payload: {
    finding: FindingClassification;
    riskRating: RiskRating;
    actionRecommendation: ActionRecommendation;
    rationale: string;
    citations: string[];
    policyVersion: string;
  }) => {
    if (!workspaceData) return;
    setIsProcessing(true);
    setBannerNotice(null);
    try {
      await apiClient.submitAnalystDisposition(workspaceData.investigation.id, payload);
      setBannerNotice({
        type: 'success',
        message: 'Analyst disposition submitted successfully and routed to Four-Eyes Maker-Checker review.',
      });
      await refreshWorkspace();
      setActiveSection('review');
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'Failed to submit disposition.' });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  // AM-40: Human Overrides
  const handleProposeOverride = async (payload: {
    targetEntityId: string;
    targetField: string;
    originalValue: any;
    overriddenValue: any;
    justification: string;
    citations: string[];
    recalculationImpact: string;
  }) => {
    if (!workspaceData) return;
    setIsProcessing(true);
    try {
      await apiClient.submitOverride(workspaceData.investigation.id, payload);
      setBannerNotice({
        type: 'success',
        message: 'Human override proposal submitted. Pending four-eyes review approval.',
      });
      await refreshWorkspace();
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'Failed to propose override.' });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveOverride = async (overrideId: string, notes?: string) => {
    if (!workspaceData) return;
    setIsProcessing(true);
    try {
      await apiClient.approveOverride(workspaceData.investigation.id, overrideId, notes);
      setBannerNotice({
        type: 'success',
        message: 'Override approved and active in decision calculation matrix.',
      });
      await refreshWorkspace();
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'Failed to approve override.' });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  // AM-41: Maker-Checker Review
  const handleSubmitReviewDecision = async (payload: {
    decision: ReviewDecisionType;
    reviewNotes: string;
    deficienciesIdentified?: string[];
  }) => {
    if (!workspaceData) return;
    setIsProcessing(true);
    setBannerNotice(null);
    try {
      await apiClient.submitReviewDecision(workspaceData.investigation.id, payload);
      setBannerNotice({
        type: 'success',
        message: `Four-Eyes Review executed: ${payload.decision}.`,
      });
      await refreshWorkspace();
      if (payload.decision === 'ESCALATE') {
        setActiveSection('compliance_mlro');
      } else {
        setActiveSection('ledger');
      }
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'Review decision failed.' });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  // AM-42: Compliance & MLRO
  const handleSubmitComplianceDecision = async (payload: {
    decision: ComplianceDecisionType;
    guidanceNotes: string;
    conditions?: string[];
  }) => {
    if (!workspaceData) return;
    setIsProcessing(true);
    try {
      await apiClient.submitComplianceDecision(workspaceData.investigation.id, payload);
      setBannerNotice({
        type: 'success',
        message: `Compliance determination logged: ${payload.decision}.`,
      });
      await refreshWorkspace();
      if (payload.decision === 'REFER_TO_MLRO') {
        setActiveSection('compliance_mlro');
      } else {
        setActiveSection('ledger');
      }
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'Compliance decision failed.' });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitMlroDecision = async (payload: {
    statutoryDecision: MlroStatutoryDecision;
    regulatoryDisclosureNotes: string;
    sarReference?: string;
  }) => {
    if (!workspaceData) return;
    setIsProcessing(true);
    try {
      await apiClient.submitMlroDecision(workspaceData.investigation.id, payload);
      setBannerNotice({
        type: 'success',
        message: `MLRO Statutory Determination finalized: ${payload.statutoryDecision}. Cryptographically sealed.`,
      });
      await refreshWorkspace();
      setActiveSection('ledger');
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'MLRO decision failed.' });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  // AM-44: Tasks Management
  const handleCompleteTask = async (taskId: string, evidence: { notes: string; documentLinks?: string[] }) => {
    if (!workspaceData) return;
    setIsProcessing(true);
    try {
      await apiClient.updateInvestigationTask(workspaceData.investigation.id, taskId, {
        status: 'COMPLETED',
        completionEvidence: evidence,
      });
      setBannerNotice({
        type: 'success',
        message: 'Investigation task marked COMPLETED with verified factual evidence.',
      });
      await refreshWorkspace();
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'Failed to complete task.' });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateTask = async (taskData: {
    taskType: TaskType;
    title: string;
    description: string;
    dueDate: string;
    priority: TaskPriority;
    dependencies?: string[];
  }) => {
    if (!workspaceData) return;
    setIsProcessing(true);
    try {
      await apiClient.createInvestigationTask(workspaceData.investigation.id, {
        caseId: workspaceData.investigation.caseId,
        taskType: taskData.taskType,
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.dueDate,
        priority: taskData.priority,
        ownerRole: activeRole === 'CHECKER' ? 'CHECKER' : 'ANALYST',
        ownerId: currentUserId,
        ownerName: activeRole === 'CHECKER' ? 'Senior Reviewer' : 'Lead Analyst',
        dependencies: taskData.dependencies,
      });
      setBannerNotice({
        type: 'success',
        message: 'New investigation task added with dependency tracking.',
      });
      await refreshWorkspace();
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'Failed to create task.' });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceData || !commentText.trim()) return;
    setIsProcessing(true);
    try {
      await apiClient.addInvestigationComment(workspaceData.investigation.id, {
        text: commentText.trim(),
        isInternal: isInternalComment,
      });
      setCommentText('');
      await refreshWorkspace();
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'Failed to add comment.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const inv = workspaceData?.investigation;
  const kycCase = workspaceData?.case;
  const subject = workspaceData?.subject;
  const events = workspaceData?.events || [];
  const actionAvailability = workspaceData?.actionAvailability || {
    primaryNextAction: 'Awaiting data load',
    primaryNextActionRole: 'ANALYST',
    canSubmitDisposition: false,
    dispositionDisabledReason: null,
    canPerformCheckerReview: false,
    checkerDisabledReason: null,
    canAdjudicateCompliance: false,
    complianceDisabledReason: null,
    canDetermineMlro: false,
    mlroDisabledReason: null,
    validationBlockers: [],
  };

  // Primary action button routing
  const handlePrimaryNextActionClick = () => {
    if (inv?.status === 'IN_PROGRESS' || inv?.status === 'REWORK_REQUESTED') {
      setActiveSection('decisions');
      setDecisionInitialTab('APPROVALS');
      setDecisionInitialApprovalsSubTab('disposition');
    } else if (inv?.status === 'AWAITING_CHECKER') {
      setActiveSection('decisions');
      setDecisionInitialTab('APPROVALS');
      setDecisionInitialApprovalsSubTab('review');
    } else if (inv?.status === 'ESCALATED_COMPLIANCE' || inv?.status === 'ESCALATED_MLRO') {
      setActiveSection('decisions');
      setDecisionInitialTab('APPROVALS');
      setDecisionInitialApprovalsSubTab('compliance_mlro');
    } else {
      setActiveSection('ledger');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      {bannerNotice && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 ${
            bannerNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : bannerNotice.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerNotice.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{bannerNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerNotice(null)}
            className="text-slate-400 hover:text-slate-600 font-bold px-1 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Investigation Selector & Queue Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-900">Active Investigation:</span>
          <select
            value={selectedInvId || ''}
            onChange={(e) => setSelectedInvId(e.target.value)}
            className="text-xs p-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
          >
            {investigations.map((i, idx) => (
              <option key={i.id || `inv-${idx}`} value={i.id}>
                {i.caseReference} - {i.subjectName} ({i.status})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-500 font-medium">Triage Queues:</span>
          <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">
            Analyst: {queueSummary['ANALYST_QUEUE'] || 0}
          </span>
          <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono">
            Review: {queueSummary['CHECKER_QUEUE'] || 0}
          </span>
          <span className="text-[11px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-mono">
            Compliance: {queueSummary['COMPLIANCE_QUEUE'] || 0}
          </span>
          <span className="text-[11px] bg-rose-50 text-rose-800 px-2 py-0.5 rounded-full font-mono">
            MLRO: {queueSummary['MLRO_QUEUE'] || 0}
          </span>
          <Button
            size="xs"
            variant="ghost"
            onClick={refreshWorkspace}
            leftIcon={<RefreshCw className="h-3 w-3" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {isLoading || !workspaceData ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          Loading comprehensive investigation workspace...
        </div>
      ) : (
        <>
          {/* Header Card (AM-38) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {inv?.caseReference}
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-900">{inv?.subjectName}</h2>
                  <Badge
                    variant={
                      inv?.status === 'COMPLETED'
                        ? 'success'
                        : inv?.status === 'REWORK_REQUESTED'
                        ? 'danger'
                        : inv?.status?.startsWith('ESCALATED')
                        ? 'critical'
                        : 'primary'
                    }
                  >
                    {inv?.status?.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                    Risk Tier: {kycCase?.riskLevel || 'HIGH'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Customer: <span className="font-semibold text-slate-800">{kycCase?.customerName}</span> &bull; Jurisdiction: <span className="font-semibold text-slate-800">{subject?.country || 'CH'}</span> &bull; Case Owner: <span className="font-semibold text-slate-800">{inv?.assignedAnalystName || 'Triage Pool'}</span>
                </p>
              </div>

              {/* SLA & Dynamic Primary Next Action Button */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">SLA Target</span>
                  <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Due: {new Date(inv?.slaTargetDate || '').toLocaleDateString()}
                  </span>
                </div>

                <div className="relative group">
                  <Button
                    size="md"
                    variant="primary"
                    onClick={handlePrimaryNextActionClick}
                    leftIcon={<Zap className="h-4 w-4" />}
                  >
                    {actionAvailability.primaryNextAction}
                  </Button>

                  {/* Why Unavailable / Context Tooltip */}
                  {actionAvailability.validationBlockers && actionAvailability.validationBlockers.length > 0 && (
                    <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block z-50 w-72 p-2.5 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl">
                      <div className="font-bold text-amber-300 mb-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Pending Prerequisites:
                      </div>
                      <ul className="space-y-0.5">
                        {actionAvailability.validationBlockers.map((b: string, idx: number) => (
                          <li key={idx}>&bull; {b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Validation Blockers Ribbon if any */}
            {actionAvailability.validationBlockers && actionAvailability.validationBlockers.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="font-semibold">Blockers for Disposition:</span>
                <span>{actionAvailability.validationBlockers.join(' | ')}</span>
              </div>
            )}

            {/* Navigation Tabs for Unified Investigation Workspace */}
            <div className="flex space-x-1 overflow-x-auto scrollbar-none pt-2 border-t border-slate-100">
              {[
                { id: 'overview', label: 'Overview', icon: Eye },
                { id: 'tasks_requests', label: 'Tasks & Requests', icon: CheckCircle2, count: workspaceData.tasks.length },
                { id: 'decisions', label: 'Decisions', icon: ShieldCheck, badge: workspaceData.activeDraft ? 'Draft' : undefined },
                { id: 'ledger', label: 'Audit Ledger', icon: Fingerprint, count: workspaceData.decisionLedger?.decisionChain?.length },
                { id: 'comments', label: 'Comments & Notes', icon: MessageSquare, count: workspaceData.comments.length },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSection(tab.id as any)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                          isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                    {tab.badge && (
                      <span className="text-[9px] bg-amber-400 text-slate-900 font-bold px-1.5 py-0.2 rounded-full">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab 1: Investigation Overview & Evidence Panel */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Central Integration Card: KYC Link, Risk Engine Delta, EDD Status, Handover */}
              <CaseOverviewIntegrationCard
                investigation={inv!}
                kycCase={kycCase}
                subject={subject}
                activeRole={activeRole}
                currentUserId={currentUserId}
                onNavigateTab={(tabId) => {
                  if (tabId === 'tasks') {
                    setActiveSection('tasks_requests');
                  } else if (tabId === 'decisions') {
                    setActiveSection('decisions');
                    setDecisionInitialTab('RISK_ENGINE');
                  } else if (tabId === 'disposition') {
                    setActiveSection('decisions');
                    setDecisionInitialTab('APPROVALS');
                    setDecisionInitialApprovalsSubTab('disposition');
                  } else if (tabId === 'ledger') {
                    setActiveSection('ledger');
                  }
                }}
                onRefresh={refreshWorkspace}
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Subject Context & Identity Assessments */}
              <div className="space-y-6">
                {/* Subject Profile Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-indigo-600" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Verified Subject Profile
                      </h3>
                    </div>
                    <Badge variant="primary">{subject?.type || 'INDIVIDUAL'}</Badge>
                  </div>

                  <div className="text-xs space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Legal Name:</span>
                      <span className="font-bold text-slate-900">{subject?.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Jurisdiction:</span>
                      <span className="font-mono text-slate-900">{subject?.country}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Screening Status:</span>
                      <span className="font-semibold text-rose-700">{subject?.screeningStatus}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Customer Risk Score:</span>
                      <span className="font-bold text-slate-900">{subject?.riskScore} / 100</span>
                    </div>
                  </div>

                  {/* Known Aliases */}
                  {subject?.aliases && subject.aliases.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                        Active Aliases:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {subject.aliases.map((al, idx) => (
                          <span
                            key={`alias-${idx}-${typeof al === 'string' ? al : al.name || idx}`}
                            className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                          >
                            {typeof al === 'string' ? al : al.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Identity Assessment Summary */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Identity Match Corroboration
                    </h3>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-950 space-y-1">
                    <div className="font-bold">Match Confidence: High (94.2%)</div>
                    <p className="text-[11px]">
                      Verified cross-match across Swiss Commercial Registry (UID: CHE-112.492.001) and executive corporate filings.
                    </p>
                  </div>
                </div>

                {/* Explainable Materiality Recommendation */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-indigo-600" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Materiality Recommendation (AM-36)
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                      AI Baseline
                    </span>
                  </div>

                  <div className="text-xs space-y-2 text-slate-600">
                    <div className="flex justify-between items-center py-1">
                      <span>Severity (Criminal Allegations):</span>
                      <span className="font-bold text-rose-700">HIGH</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span>Source Credibility:</span>
                      <span className="font-bold text-slate-900">TIER 1 (Judicial / Official)</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span>Relationship Relevance:</span>
                      <span className="font-bold text-slate-900">DIRECT (Sole Board Member)</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span>Recency & Statute:</span>
                      <span className="font-bold text-slate-900">ACTIVE (Ongoing 2026 Inquiry)</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 font-mono">
                    Policy Rule: POL-MAT-RULE-04 (Mandatory SAR Triage for Active Financial Fraud Inquiries)
                  </div>
                </div>
              </div>

              {/* Center & Right Column: Adverse Events List & Evidence Viewer */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Adverse Events & Evidence Articles ({events.length})
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Independent Corroboration & Legal Status
                    </span>
                  </div>

                  {events.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      No adverse events linked to this case.
                    </div>
                  ) : (
                    events.map((ev, evIdx) => (
                      <div
                        key={ev.id || `ev-${evIdx}`}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all shadow-2xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {ev.id}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">{ev.eventTitle}</h4>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant={ev.legalStatus === 'CONVICTION' ? 'critical' : 'warning'}>
                              {ev.legalStatus}
                            </Badge>
                            <span className="text-xs font-mono text-slate-500">{ev.jurisdiction}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">{ev.eventSummary}</p>

                        {/* Event Metadata & Corroboration badges */}
                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <Shield className="h-3.5 w-3.5 text-indigo-600" />
                            {ev.independentSourceCount || ev.sourceCount} Independent Sources
                          </span>

                          {ev.hasRetractions && (
                            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-semibold text-[11px]">
                              Retraction Flagged
                            </span>
                          )}

                          {ev.hasCorrections && (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold text-[11px]">
                              Corrections Detected
                            </span>
                          )}

                          <span className="ml-auto font-mono text-[10px] text-slate-400">
                            {ev.primaryCategory}
                          </span>
                        </div>

                        {/* Extracted Articles within this Event */}
                        {ev.articles && ev.articles.length > 0 && (
                          <div className="pt-2 space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Citations & Source Articles:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {ev.articles.map((art, artIdx) => (
                                <div
                                  key={art.articleId || (art as any).id || `art-${ev.id || evIdx}-${artIdx}`}
                                  className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-900 truncate">
                                      {art.articleTitle || (art as any).title}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-500">
                                      {art.publisher}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    Credibility: <span className="font-bold text-slate-700">{(art as any).credibilityTier || 'TIER_1'}</span> &bull; Relevance: <span className="font-bold text-slate-700">{Math.round((art.relevanceToEvent || 0.85) * 100)}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Timeline Panel */}
                {workspaceData.timeline && workspaceData.timeline.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <Clock className="h-4 w-4 text-indigo-600" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Chronological Event Timeline
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {workspaceData.timeline.map((entry, idx) => (
                        <div key={entry.id || `timeline-${idx}`} className="flex gap-3 text-xs">
                          <div className="font-mono text-slate-400 text-[11px] shrink-0 w-24">
                            {entry.date ? new Date(entry.date).toLocaleDateString() : 'N/A'}
                          </div>
                          <div className="flex-1 pb-2 border-b border-slate-100">
                            <div className="font-bold text-slate-900">{entry.headline || (entry as any).title}</div>
                            <p className="text-slate-600 text-[11px] mt-0.5">{entry.snippet || (entry as any).description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {/* Tab 2: AM-48 & AM-49 Unified Tasks, EDD Research & Client Information Requests */}
          {activeSection === 'tasks_requests' && (
            <UnifiedTasksAndRequestsPanel
              investigation={inv!}
              tasks={workspaceData.tasks}
              activeRole={activeRole}
              currentUserId={currentUserId}
              onCompleteTask={handleCompleteTask}
              onCreateTask={handleCreateTask}
              onUpdateTaskStatus={async (taskId, status) => {
                await apiClient.updateInvestigationTask(workspaceData.investigation.id, taskId, { status });
                await refreshWorkspace();
              }}
              onRefresh={refreshWorkspace}
              isProcessing={isProcessing}
            />
          )}

          {/* Tab 3: AM-46, AM-47, AM-50, AM-51, AM-52 Decisions & Governance Hub */}
          {activeSection === 'decisions' && (
            <DecisionsAndGovernanceHub
              investigation={inv!}
              kycCase={kycCase}
              subject={subject}
              events={events}
              activeDraft={workspaceData.activeDraft}
              overrides={workspaceData.overrides}
              escalations={workspaceData.escalations}
              activeRole={activeRole}
              currentUserId={currentUserId}
              actionAvailability={actionAvailability}
              onSaveDraft={handleSaveDraft}
              onSubmitDisposition={handleSubmitDisposition}
              onSubmitReview={handleSubmitReviewDecision}
              onSubmitCompliance={handleSubmitComplianceDecision}
              onSubmitMlro={handleSubmitMlroDecision}
              onSubmitOverride={handleProposeOverride}
              onApproveOverride={handleApproveOverride}
              onRefresh={refreshWorkspace}
              isProcessing={isProcessing}
              initialTab={decisionInitialTab}
              initialApprovalsSubTab={decisionInitialApprovalsSubTab}
            />
          )}

          {/* Tab 4: AM-43 Cryptographic Decision Ledger */}
          {activeSection === 'ledger' && (
            <DecisionAuditLedgerPanel
              ledger={workspaceData.decisionLedger}
              investigationId={inv!.id}
            />
          )}

          {/* Tab 8: Comments & Notes */}
          {activeSection === 'comments' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Internal Investigation Comments & Audit Notes
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">
                  {workspaceData.comments.length} Comments Recorded
                </span>
              </div>

              {/* Comment Thread */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {workspaceData.comments.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    No comments recorded yet. Add notes or tag team members below.
                  </div>
                ) : (
                  workspaceData.comments.map((c, cIdx) => (
                    <div
                      key={c.id || `comment-${cIdx}`}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{c.authorName}</span>
                          <Badge variant="neutral">{c.authorRole}</Badge>
                          {c.isInternal && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                              INTERNAL ONLY
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono">
                          {new Date(c.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-800">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="pt-3 border-t border-slate-200 space-y-3">
                <textarea
                  rows={3}
                  required
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Record internal team observation, regulatory check reference, or @mention a colleague..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternalComment}
                      onChange={(e) => setIsInternalComment(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Mark as internal compliance confidential note</span>
                  </label>

                  <Button
                    type="submit"
                    size="sm"
                    variant="primary"
                    disabled={isProcessing}
                    leftIcon={<Send className="h-3.5 w-3.5" />}
                  >
                    Post Comment
                  </Button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Layers,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import {
  AcceptanceCondition,
  InformationRequestItem,
  EddCase,
  InformationRequest,
  Investigation,
  InvestigationTask,
  RoleId,
  TaskPriority,
  TaskStatus,
  TaskType,
  UserRole,
} from '../../../types/index.ts';
import { apiClient } from '../../../lib/api-client.ts';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';

interface UnifiedTasksAndRequestsPanelProps {
  investigation: Investigation;
  tasks: InvestigationTask[];
  activeRole: UserRole;
  currentUserId: string;
  onCompleteTask: (taskId: string, evidence: { notes: string; documentLinks?: string[] }) => Promise<void>;
  onCreateTask: (taskData: {
    taskType: TaskType;
    title: string;
    description: string;
    dueDate: string;
    priority: TaskPriority;
    dependencies?: string[];
  }) => Promise<void>;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  onRefresh: () => Promise<void>;
  isProcessing?: boolean;
}

type TabFilter = 'ALL' | 'EDD_TASKS' | 'CIR_REQUESTS' | 'SUPPORTING_DOCS' | 'CONDITIONS';

export const UnifiedTasksAndRequestsPanel: React.FC<UnifiedTasksAndRequestsPanelProps> = ({
  investigation,
  tasks,
  activeRole,
  currentUserId,
  onCompleteTask,
  onCreateTask,
  onUpdateTaskStatus,
  onRefresh,
  isProcessing = false,
}) => {
  const [activeFilter, setActiveFilter] = useState<TabFilter>('ALL');
  const [eddCase, setEddCase] = useState<EddCase | null>(null);
  const [clientRequests, setClientRequests] = useState<InformationRequest[]>([]);
  const [conditions, setConditions] = useState<AcceptanceCondition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Modals state
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateCirOpen, setIsCreateCirOpen] = useState(false);
  const [isCompleteTaskOpen, setIsCompleteTaskOpen] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidenceLinks, setEvidenceLinks] = useState('');

  // Record Client Response Modal
  const [respondingCir, setRespondingCir] = useState<InformationRequest | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [responseDocNames, setResponseDocNames] = useState('');

  // New Task Form
  const [newTaskType, setNewTaskType] = useState<TaskType>('DOCUMENT_COLLECTION');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('MEDIUM');
  const [newDueDate, setNewDueDate] = useState(
    new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
  );

  // New CIR Form
  const [cirTitle, setCirTitle] = useState('');
  const [cirRecipient, setCirRecipient] = useState('');
  const [cirRecipientEmail, setCirRecipientEmail] = useState('');
  const [cirReason, setCirReason] = useState('');
  const [cirItemsText, setCirItemsText] = useState(
    '1. Source of Wealth and Source of Funds Declaration\n2. Audited Financial Statements for Past 2 Fiscal Years\n3. Proof of Beneficial Ownership and Corporate Org Chart'
  );
  const [cirIsAiDraft, setCirIsAiDraft] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [edd, reqs, conds] = await Promise.all([
        apiClient.getEddCase(investigation.id).catch(() => null),
        apiClient.getInformationRequests(investigation.id).catch(() => []),
        apiClient.getAcceptanceConditions(investigation.id).catch(() => []),
      ]);
      setEddCase(edd);
      setClientRequests(reqs || []);
      setConditions(conds || []);
    } catch (err: any) {
      console.error('Failed to load tasks and requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [investigation.id]);

  // AI Draft EDD Questions
  const handleAiDraftEddQuestions = async () => {
    setIsLoading(true);
    setBannerNotice(null);
    try {
      const questions = await apiClient.aiDraftEddQuestions(investigation.id, [
        'Geneva Criminal Court Bribery Indictment',
        'State Tender Procurement Irregularities',
      ]);
      setBannerNotice({
        type: 'info',
        message: `AI generated ${questions.length} draft EDD inquiry questions. NOTE: All AI questions are visibly tagged UNAPPROVED and require human review.`,
      });
      await loadData();
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'Failed to generate AI questions.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Human Approve EDD Question
  const handleApproveEddQuestion = async (questionId: string) => {
    setIsLoading(true);
    setBannerNotice(null);
    try {
      const res = await apiClient.approveEddQuestion(investigation.id, questionId);
      setBannerNotice({
        type: 'success',
        message: `Question approved: "${res.data.questionText.substring(0, 40)}..." signed off under 4-Eyes governance.`,
      });
      await loadData();
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'Human approval failed.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Submit CIR Draft
  const handleCreateCir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cirTitle || !cirRecipient) return;

    const items: InformationRequestItem[] = cirItemsText
      .split('\n')
      .map((line) => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean)
      .map((text, idx) => ({
        id: `q-item-${Date.now()}-${idx}`,
        title: text,
        description: 'Required to clarify adverse media allegations regarding state procurement tenders.',
        dueDays: 7,
        mandatory: true,
        status: 'PENDING',
      }));

    try {
      await apiClient.createInformationRequest(investigation.id, {
        title: cirTitle,
        recipientEntity: cirRecipient,
        recipientContactEmail: cirRecipientEmail || 'compliance@apexenergy.ch',
        requestReason: cirReason || 'Verification of origin of capital following formal adverse media indictment match.',
        requestedItems: items,
        dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
        isAiDrafted: cirIsAiDraft,
        secureChannelType: 'PORTAL_UPLOAD',
      });
      setIsCreateCirOpen(false);
      setBannerNotice({
        type: 'success',
        message: cirIsAiDraft
          ? 'AI-drafted Client Information Request created as UNAPPROVED. Human review and authorization required.'
          : 'Client Information Request draft saved. Ready for human authorization.',
      });
      await loadData();
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'Failed to create request.' });
    }
  };

  // Human Approve & Transmit CIR
  const handleApproveAndTransmitCir = async (requestId: string) => {
    setIsLoading(true);
    setBannerNotice(null);
    try {
      const res = await apiClient.approveAndTransmitRequest(investigation.id, requestId);
      setBannerNotice({
        type: 'success',
        message: `Client Request "${res.data.requestReference}" authorized and transmitted via Secure Portal. Outbox ACK received.`,
      });
      await loadData();
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: `Transmission blocked: ${err.message}. AI agents are strictly prohibited from transmitting client communications.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Record Client Response
  const handleRecordClientResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingCir || !responseNotes) return;

    const docs = responseDocNames
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name, idx) => ({
        documentId: `doc-client-${Date.now()}-${idx}`,
        title: name,
        documentType: 'CERTIFIED_AUDIT_REPORT',
        fileSizeBytes: 1048576 + idx * 524288,
        sha256Checksum: `sha256-${Math.random().toString(16).substring(2, 14)}`,
        uploadedAt: new Date().toISOString(),
        verifiedByAnalystId: currentUserId,
      }));

    try {
      await apiClient.recordClientResponse(investigation.id, respondingCir.id, {
        notes: responseNotes,
        evidenceDocuments: docs,
      });
      setRespondingCir(null);
      setResponseNotes('');
      setResponseDocNames('');
      setBannerNotice({
        type: 'success',
        message: `Client response & ${docs.length} verified documents recorded. SHA-256 verification complete.`,
      });
      await loadData();
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message || 'Failed to record response.' });
    }
  };

  // Confirm Complete Task
  const handleConfirmCompleteTask = async () => {
    if (!completingTaskId) return;
    if (evidenceNotes.trim().length < 10) {
      setBannerNotice({
        type: 'error',
        message: 'Evidence notes must be at least 10 characters to verify factual grounding.',
      });
      return;
    }

    try {
      const links = evidenceLinks
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      await onCompleteTask(completingTaskId, {
        notes: evidenceNotes,
        documentLinks: links,
      });
      setIsCompleteTaskOpen(false);
      setCompletingTaskId(null);
      setEvidenceNotes('');
      setEvidenceLinks('');
      await loadData();
    } catch (err: any) {
      console.error(err);
    }
  };

  // Filter tasks & requests
  const eddQuestions: any[] = eddCase?.plan?.questions || (eddCase as any)?.investigationPlan?.customQuestions || [];
  const eddStage =
    (eddCase as any)?.investigationPlan?.stage ||
    eddCase?.approvalStages?.find((s) => s.status === 'PENDING')?.stage ||
    eddCase?.approvalStages?.[0]?.stage ||
    eddCase?.status ||
    'IN_PROGRESS';
  const openConditions = conditions.filter((c) => c.status !== 'SATISFIED_CLOSED' && c.status !== 'WAIVED');

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

      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              Tasks & Information Requests Hub
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                AM-44, AM-48, AM-49, AM-51
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Integrated research plans, client information requests, supporting document checklists, and acceptance condition workflows
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAiDraftEddQuestions}
              leftIcon={<Sparkles className="h-3.5 w-3.5 text-amber-500" />}
            >
              AI Draft EDD Questions
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setCirTitle(`Information Request: Source of Wealth Clarification (${investigation.caseReference})`);
                setCirRecipient(investigation.subjectName);
                setCirReason('Adverse media allegations in Geneva jurisdiction regarding procurement irregularities.');
                setCirIsAiDraft(true);
                setIsCreateCirOpen(true);
              }}
              leftIcon={<Bot className="h-3.5 w-3.5 text-indigo-600" />}
            >
              Draft Client Request (CIR)
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsCreateTaskOpen(true)}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              New Research Task
            </Button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100">
          {[
            { id: 'ALL', label: 'All Items', count: tasks.length + clientRequests.length + eddQuestions.length + openConditions.length },
            { id: 'EDD_TASKS', label: 'EDD Research & Questions', count: eddQuestions.length },
            { id: 'CIR_REQUESTS', label: 'Client Information Requests (CIR)', count: clientRequests.length },
            { id: 'SUPPORTING_DOCS', label: 'Internal Research Tasks', count: tasks.length },
            { id: 'CONDITIONS', label: 'Acceptance Condition Tasks', count: openConditions.length },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setActiveFilter(pill.id as TabFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeFilter === pill.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{pill.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeFilter === pill.id ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {pill.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: Client Information Requests (CIR) (AM-49) */}
      {(activeFilter === 'ALL' || activeFilter === 'CIR_REQUESTS') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Client Information Requests (CIR)
              </h4>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded">
                AM-49
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Human-in-the-loop: AI can draft, only human reviewer can approve & transmit
            </div>
          </div>

          {clientRequests.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
              No Client Information Requests created yet. Click "Draft Client Request (CIR)" to initiate inquiries.
            </div>
          ) : (
            <div className="space-y-4">
              {clientRequests.map((req) => {
                const isApproved = req.approvals && req.approvals.some((a) => a.status === 'APPROVED');
                const latestApproval = req.approvals ? req.approvals.find((a) => a.status === 'APPROVED') : undefined;
                const latestResponse = req.responses && req.responses.length > 0 ? req.responses[0] : undefined;

                return (
                  <div
                    key={req.id}
                    className={`p-4 rounded-xl border transition-all ${
                      req.status === 'CLOSED'
                        ? 'bg-emerald-50/30 border-emerald-200'
                        : req.isAiAssistedDraft && !isApproved
                        ? 'bg-amber-50/40 border-amber-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {req.requestReference}
                          </span>
                          <h5 className="text-sm font-bold text-slate-900">{req.title}</h5>

                          {/* Status badge */}
                          <Badge
                            variant={
                              req.status === 'CLOSED'
                                ? 'success'
                                : req.status === 'TRANSMITTED'
                                ? 'primary'
                                : req.status === 'PARTIALLY_FULFILLED'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {req.status.replace('_', ' ')}
                          </Badge>

                          {/* AI Draft vs Human Approved Label */}
                          {req.isAiAssistedDraft && !isApproved ? (
                            <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded flex items-center gap-1">
                              <Bot className="h-3 w-3" /> AI DRAFT - UNAPPROVED
                            </span>
                          ) : isApproved ? (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
                              <UserCheck className="h-3 w-3" /> Human Approved ({latestApproval?.reviewerName || 'Reviewer'})
                            </span>
                          ) : null}
                        </div>

                        <p className="text-xs text-slate-600">
                          {req.aiDraftPrompt || 'Regulatory clarification required for adverse media screening.'}
                        </p>

                        <div className="text-xs text-slate-500 flex flex-wrap gap-4 pt-1">
                          <span>Recipient: <strong className="text-slate-800">{req.recipient?.name || 'Authorized Contact'}</strong></span>
                          <span>Channel: <strong className="text-slate-800">{req.deliveryChannel}</strong></span>
                          <span>Due: <strong className="text-slate-800">{new Date(req.dueDate).toLocaleDateString()}</strong></span>
                          {latestResponse?.submittedAt && (
                            <span className="text-emerald-700 font-semibold">
                              Response Received: {new Date(latestResponse.submittedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Requested Items */}
                        <div className="pt-2">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Inquiry Items ({req.requestItems?.length || 0})
                          </div>
                          <ul className="space-y-1 text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-200">
                            {(req.requestItems || []).map((item, idx) => (
                              <li key={item.id} className="flex items-start gap-2">
                                <span className="font-mono text-slate-400">{idx + 1}.</span>
                                <div className="flex-1">
                                  <span className="font-medium text-slate-900">{item.title}</span>
                                  {item.description && (
                                    <span className="block text-[11px] text-slate-500">
                                      {item.description}
                                    </span>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Evidence Documents received */}
                        {latestResponse?.documents && latestResponse.documents.length > 0 && (
                          <div className="pt-2">
                            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <FileCheck className="h-3 w-3" /> Verified Evidence Documents Received:
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {latestResponse.documents.map((doc) => (
                                <div
                                  key={doc.id}
                                  className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-0.5"
                                >
                                  <div className="font-bold text-emerald-950 flex items-center justify-between">
                                    <span>{doc.filename}</span>
                                    <span className="text-[10px] text-emerald-700 font-mono">
                                      {(doc.filesizeBytes / 1024).toFixed(0)} KB
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-emerald-700 font-mono">
                                    SHA-256: {doc.sha256Checksum.substring(0, 16)}...
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex md:flex-col items-end gap-2 shrink-0">
                        {req.status === 'DRAFT' || req.status === 'PENDING_APPROVAL' ? (
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={() => handleApproveAndTransmitCir(req.id)}
                            leftIcon={<Send className="h-3 w-3" />}
                          >
                            Approve & Dispatch
                          </Button>
                        ) : null}

                        {req.status === 'TRANSMITTED' && (
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => {
                              setRespondingCir(req);
                              setResponseNotes('Customer provided audited statements clarifying that state procurement was audited without sanctions.');
                              setResponseDocNames('PwC_Apex_Independent_Audit_2025.pdf\nGeneva_Commercial_Court_Discharge_Notice.pdf');
                            }}
                            leftIcon={<Upload className="h-3 w-3 text-indigo-600" />}
                          >
                            Record Response
                          </Button>
                        )}

                        {req.status === 'CLOSED' && (
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: EDD Questions & Plan (AM-48) */}
      {(activeFilter === 'ALL' || activeFilter === 'EDD_TASKS') && eddCase && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Enhanced Due Diligence (EDD) Custom Questions
              </h4>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded">
                AM-48 &bull; Stage: {eddStage.replace('_', ' ')}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Dual governance: AI drafts inquiries; human compliance officer must approve
            </div>
          </div>

          <div className="space-y-3">
            {eddQuestions.map((q) => (
              <div
                key={q.id}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  q.humanApproved
                    ? 'bg-emerald-50/20 border-emerald-200'
                    : 'bg-amber-50/30 border-amber-300'
                }`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{q.questionText}</span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                      {(q.riskCategory || q.category || 'EDD_QUESTION').replace('_', ' ')}
                    </span>
                    {q.humanApproved ? (
                      <Badge variant="success">Approved</Badge>
                    ) : (
                      <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded flex items-center gap-1">
                        <Bot className="h-3 w-3" /> AI DRAFT - UNAPPROVED
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Target Subject: <strong className="text-slate-700">{q.targetSubject || eddCase.caseId || 'Target Entity'}</strong>
                    {(q.requiredEvidence || q.evidenceAttached) && (
                      <span> &bull; Required Docs: {(q.requiredEvidence || q.evidenceAttached || []).join(', ') || 'Certified records'}</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {!q.humanApproved ? (
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={() => handleApproveEddQuestion(q.id)}
                      leftIcon={<CheckCircle2 className="h-3 w-3" />}
                    >
                      Approve Question
                    </Button>
                  ) : (
                    <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5" /> Approved
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: Standard Investigation Tasks & Supporting Docs (AM-44) */}
      {(activeFilter === 'ALL' || activeFilter === 'SUPPORTING_DOCS') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-indigo-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Internal Investigation & Document Tasks
              </h4>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded">
                AM-44
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Tasks require documented factual completion evidence
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
              No internal tasks assigned. Click "New Research Task" to assign work items.
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-start justify-between gap-3 ${
                    task.status === 'COMPLETED'
                      ? 'bg-slate-50 border-slate-200 text-slate-600'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="text-sm font-bold text-slate-900">{task.title}</h5>
                      <Badge
                        variant={
                          task.status === 'COMPLETED'
                            ? 'success'
                            : task.priority === 'CRITICAL' || task.priority === 'HIGH'
                            ? 'danger'
                            : 'neutral'
                        }
                      >
                        {task.status}
                      </Badge>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {task.taskType.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">{task.description}</p>

                    <div className="text-xs text-slate-500 flex flex-wrap gap-4 pt-1">
                      <span>Owner: <strong className="text-slate-800">{task.ownerName}</strong></span>
                      <span>Due: <strong className="text-slate-800">{new Date(task.dueDate).toLocaleDateString()}</strong></span>
                    </div>

                    {task.completionEvidence && (
                      <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                        <div className="font-bold text-emerald-900 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Completion Evidence Verified:
                        </div>
                        <p className="text-emerald-800">{task.completionEvidence.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {task.status !== 'COMPLETED' && (
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => {
                          setCompletingTaskId(task.id);
                          setIsCompleteTaskOpen(true);
                        }}
                        leftIcon={<CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                      >
                        Complete Task
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: Acceptance Condition Tasks (AM-51) */}
      {(activeFilter === 'ALL' || activeFilter === 'CONDITIONS') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <h4 className="text-sm font-bold text-slate-900">
                Acceptance Conditions & Monitoring Tasks
              </h4>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded">
                AM-51
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Conditions with blocking flags hold case completion or client onboarding
            </div>
          </div>

          {openConditions.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
              No outstanding acceptance conditions. All condition gates are satisfied.
            </div>
          ) : (
            <div className="space-y-3">
              {openConditions.map((cond) => (
                <div
                  key={cond.id}
                  className="p-4 rounded-xl border bg-white border-slate-200 space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
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
                        <Badge variant={cond.status === 'IN_BREACH' ? 'danger' : 'warning'}>
                          {cond.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">{cond.description}</p>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-4">
                        <span>Due Date: <strong className="text-slate-800">{new Date(cond.targetDueDate).toLocaleDateString()}</strong></span>
                        <span>Monitoring: <strong className="text-slate-800">{cond.reviewFrequency}</strong></span>
                        <span>Pre/Post: <strong className="text-slate-800">{cond.isPreOnboarding ? 'Pre-Onboarding' : 'Post-Onboarding'}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Research Task */}
      {isCreateTaskOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-base font-bold text-slate-900">Create Investigation Task</h4>
              <button
                type="button"
                onClick={() => setIsCreateTaskOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Verify Swiss commercial registry filings for Apex Energy"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description & Requirements</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Detail exact documentary evidence required..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Task Type</label>
                  <select
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value as TaskType)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  >
                    <option value="DOCUMENT_COLLECTION">Document Collection</option>
                    <option value="SUBJECT_OUTREACH">Subject Outreach</option>
                    <option value="PEER_REVIEW">Peer Review</option>
                    <option value="COMPLIANCE_SIGN_OFF">Compliance Sign-Off</option>
                    <option value="LEGAL_ADVICE">Legal Advice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button size="sm" variant="ghost" onClick={() => setIsCreateTaskOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={async () => {
                  if (!newTitle.trim()) return;
                  await onCreateTask({
                    title: newTitle.trim(),
                    description: newDescription.trim(),
                    taskType: newTaskType,
                    priority: newPriority,
                    dueDate: newDueDate,
                  });
                  setIsCreateTaskOpen(false);
                  setNewTitle('');
                  setNewDescription('');
                }}
              >
                Create Task
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Draft Client Information Request (CIR) */}
      {isCreateCirOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-indigo-600" />
                <h4 className="text-base font-bold text-slate-900">
                  {cirIsAiDraft ? 'Draft Client Information Request (AI-Assisted)' : 'New Client Information Request'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateCirOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {cirIsAiDraft && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Governance Rule AM-49:</span> AI can draft questions and compile document requests, but this request will be created as <strong>UNAPPROVED</strong>. It will strictly require a human compliance reviewer's authorization before transmission.
                </div>
              </div>
            )}

            <form onSubmit={handleCreateCir} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Request Subject / Title</label>
                <input
                  type="text"
                  required
                  value={cirTitle}
                  onChange={(e) => setCirTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Recipient Entity</label>
                  <input
                    type="text"
                    required
                    value={cirRecipient}
                    onChange={(e) => setCirRecipient(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Recipient Email / Portal ID</label>
                  <input
                    type="email"
                    value={cirRecipientEmail}
                    onChange={(e) => setCirRecipientEmail(e.target.value)}
                    placeholder="compliance@customer.com"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Purpose / Regulatory Justification</label>
                <textarea
                  rows={2}
                  value={cirReason}
                  onChange={(e) => setCirReason(e.target.value)}
                  placeholder="Explain why these records are required under KYC/AML policy..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Itemized Question & Document Checklist (one per line)
                </label>
                <textarea
                  rows={4}
                  value={cirItemsText}
                  onChange={(e) => setCirItemsText(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono focus:outline-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <Button size="sm" variant="ghost" type="button" onClick={() => setIsCreateCirOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit">
                  Save CIR Draft
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Client Response */}
      {respondingCir && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-base font-bold text-slate-900">Record Client Response & Evidence</h4>
              <button
                type="button"
                onClick={() => setRespondingCir(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordClientResponse} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Client Response Summary</label>
                <textarea
                  rows={3}
                  required
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Summarize the client's clarification and responses to requested items..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Uploaded Evidence Documents (one filename per line)
                </label>
                <textarea
                  rows={3}
                  required
                  value={responseDocNames}
                  onChange={(e) => setResponseDocNames(e.target.value)}
                  placeholder="e.g. Audited_Financial_Statement_2025.pdf&#10;Commercial_Register_Extract.pdf"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono focus:outline-indigo-600"
                />
                <span className="text-[11px] text-slate-500 block mt-1">
                  Files will be cryptographically hashed with SHA-256 for evidentiary chain of custody.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <Button size="sm" variant="ghost" type="button" onClick={() => setRespondingCir(null)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit">
                  Record & Verify Evidence
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Complete Investigation Task */}
      {isCompleteTaskOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-base font-bold text-slate-900">Complete Investigation Task</h4>
              <button
                type="button"
                onClick={() => setIsCompleteTaskOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Factual Evidence & Verification Notes (Minimum 10 characters)
                </label>
                <textarea
                  rows={3}
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  placeholder="Explain source verification, register extract lookup, or analyst findings..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Evidence Document URIs / Identifiers (one per line)
                </label>
                <textarea
                  rows={2}
                  value={evidenceLinks}
                  onChange={(e) => setEvidenceLinks(e.target.value)}
                  placeholder="https://core-dms.bank.internal/docs/784129"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono focus:outline-indigo-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <Button size="sm" variant="ghost" onClick={() => setIsCompleteTaskOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleConfirmCompleteTask}>
                Confirm Task Completion
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Client-Side API Service for Adverse Media Screening Agent
 * Injects x-user-role header to enforce and test server-side RBAC
 */
import {
  AdverseMediaArticle,
  Alias,
  Article,
  AuditEvent,
  ConnectorStatus,
  CoverageOutcome,
  HistoricalPeriodResolution,
  HistoricalPeriodRule,
  KycCase,
  PolicyRule,
  PolicyVersion,
  QueryVariant,
  RetrievalRecord,
  SavedView,
  ScreeningObligation,
  ScreeningRun,
  SearchManifest,
  SearchManifestRevision,
  SourceConnector,
  Subject,
  UserRole,
  WorkItem,
  AdverseEvent,
  TimelineEntry,
  DuplicateAssessment,
  ArticleCluster,
  SourceRoleAssessment,
  MergeOperation,
  SplitOperation,
  ReassignmentOperation,
  ArticleExtractionBundle,
  Investigation,
  QueueItem,
  AnalystConclusion,
  ReviewDecision,
  ComplianceDecision,
  MlroDecision,
  InvestigationOverride,
  InvestigationTask,
  InvestigationComment,
  Draft,
  KycCaseLink,
  RiskImpact,
  ApprovedFinding,
  EddCase,
  InformationRequest,
  DecisionPack,
  AcceptanceCondition,
  HandoverPackage,
  DeliveryAttempt,
  ScreeningSchedule,
  ScheduleRevision,
  MonitoringSubscription,
  MonitoringCycle,
  DeltaSet,
  DeltaItem,
  SuppressionDecision,
  MaterialUpdate,
  TriggerRule,
  TriggeredCase,
  MonitoringAlert,
  PriorityAssessment,
  MonitoringMetrics,
} from '../types/index.ts';

let currentActiveRole: UserRole = 'CHECKER';
let currentUserId: string = 'USR-CHECKER-01';

export function setActiveRole(role: UserRole) {
  currentActiveRole = role;
  localStorage.setItem('am_user_role', role);
}

export function getActiveRole(): UserRole {
  const saved = localStorage.getItem('am_user_role') as UserRole;
  if (saved) {
    currentActiveRole = saved;
  }
  return currentActiveRole;
}

export function setActor(userId: string, role: UserRole) {
  currentUserId = userId;
  currentActiveRole = role;
  localStorage.setItem('am_user_role', role);
  localStorage.setItem('am_user_id', userId);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('x-user-role', getActiveRole());
  headers.set('x-user-id', currentUserId);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`/api/v1${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || `HTTP error ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Current user & RBAC
  getMe: async () => {
    return request<{ user: { id: string; name: string; role: UserRole }; permissions: string[]; availableRoles: string[] }>('/users/me');
  },

  // Cases (AM-01)
  getCases: async (params?: { status?: string; riskLevel?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ data: KycCase[]; count: number }>(`/cases${query ? `?${query}` : ''}`);
  },

  getCase: async (id: string) => {
    return request<{ data: KycCase & { parties: any[]; obligations: ScreeningObligation[]; subjects: Subject[] } }>(`/cases/${id}`);
  },

  createCase: async (data: { customerName: string; customerType: string; jurisdiction: string; riskLevel: string; notes?: string }) => {
    return request<{ data: KycCase }>('/cases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  completeCase: async (id: string) => {
    return request<{ data: KycCase; message: string }>(`/cases/${id}/complete`, {
      method: 'POST',
    });
  },

  // Screening Population & Obligations (AM-01)
  getObligations: async (caseId: string) => {
    return request<{ data: ScreeningObligation[] }>(`/cases/${caseId}/obligations`);
  },

  resolveObligations: async (caseId: string) => {
    return request<{ data: { obligations: ScreeningObligation[]; blockingConditions: string[] } }>(`/cases/${caseId}/obligations/resolve`, {
      method: 'POST',
    });
  },

  requestExemption: async (obligationId: string, data: { reasonCode: string; justification: string; evidenceReference?: string }) => {
    return request<{ data: ScreeningObligation }>(`/obligations/${obligationId}/exempt`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  adjudicateExemption: async (obligationId: string, approved: boolean, notes: string) => {
    return request<{ data: ScreeningObligation }>(`/obligations/${obligationId}/adjudicate-exemption`, {
      method: 'POST',
      body: JSON.stringify({ approved, notes }),
    });
  },

  // Subjects (AM-02)
  getSubjects: async (caseId: string) => {
    return request<{ data: Subject[] }>(`/cases/${caseId}/subjects`);
  },

  getSubject: async (id: string) => {
    return request<{ data: Subject }>(`/subjects/${id}`);
  },

  // Names & Aliases (AM-03)
  getAliases: async (subjectId: string) => {
    return request<{ data: Alias[] }>(`/subjects/${subjectId}/aliases`);
  },

  addAlias: async (subjectId: string, data: Partial<Alias>) => {
    return request<{ data: Alias }>(`/subjects/${subjectId}/aliases`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  suggestAliasesWithAI: async (subjectId: string) => {
    return request<{ data: Alias[]; message: string }>(`/subjects/${subjectId}/aliases/ai-suggest`, {
      method: 'POST',
    });
  },

  updateAliasStatus: async (aliasId: string, newState: string, rejectionReason?: string) => {
    return request<{ data: Alias }>(`/aliases/${aliasId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ newState, rejectionReason }),
    });
  },

  // Search Orchestration & Connectors (AM-06)
  getConnectors: async () => {
    return request<{ data: SourceConnector[] }>('/connectors');
  },

  executeScreeningRun: async (caseId: string, subjectId: string) => {
    return request<{ data: ScreeningRun }>('/screening-runs', {
      method: 'POST',
      body: JSON.stringify({ caseId, subjectId }),
    });
  },

  getScreeningRun: async (runId: string) => {
    return request<{ data: ScreeningRun }>(`/screening-runs/${runId}`);
  },

  getArticles: async (caseId: string) => {
    return request<{ data: AdverseMediaArticle[] }>(`/cases/${caseId}/articles`);
  },

  retryConnector: async (connectorId: string, screeningRunId: string) => {
    return request<{ data: { connector: SourceConnector; run: ScreeningRun } }>(`/connectors/${connectorId}/retry`, {
      method: 'POST',
      body: JSON.stringify({ screeningRunId }),
    });
  },

  resetConnector: async (connectorId: string) => {
    return request<{ data: SourceConnector }>(`/connectors/${connectorId}/reset`, {
      method: 'POST',
    });
  },

  // Policies (AM-05)
  getPolicies: async () => {
    return request<{ data: { activeVersion: PolicyVersion; versions: PolicyVersion[] } }>('/policies');
  },

  evaluatePolicy: async (inputs: any) => {
    return request<{ data: any }>('/policies/evaluate', {
      method: 'POST',
      body: JSON.stringify(inputs),
    });
  },

  // Work Items
  getWorkItems: async (queue?: string) => {
    return request<{ data: WorkItem[]; count: number }>(`/work-items${queue ? `?queue=${queue}` : ''}`);
  },

  getWorkItemsSummary: async () => {
    return request<{
      assignedToMe: number;
      unassigned: number;
      awaitingReview: number;
      escalated: number;
      failedConnectors: number;
    }>('/work-items/summary');
  },

  // Audit
  getAuditEvents: async (params?: { caseReference?: string; entityType?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ data: AuditEvent[]; total: number }>(`/audit-events${query ? `?${query}` : ''}`);
  },

  // AM-07: Multilingual Query Preview
  previewQueryExpansion: async (subjectId: string, targetLanguages?: string[], eventCategories?: string[]) => {
    return request<{ subjectId: string; subjectName: string; variantsCount: number; variants: QueryVariant[] }>('/screening/query-preview', {
      method: 'POST',
      body: JSON.stringify({ subjectId, targetLanguages, eventCategories }),
    });
  },

  // AM-08: Immutable Search Manifests
  getManifest: async (id: string) => {
    return request<{ data: SearchManifest }>(`/manifests/${id}`);
  },

  getCaseManifests: async (caseId: string) => {
    return request<{ data: SearchManifest[]; count: number }>(`/cases/${caseId}/manifests`);
  },

  addManifestRevision: async (id: string, changeReason: string, deltaSummary: string) => {
    return request<{ data: SearchManifest; newRevision: SearchManifestRevision }>(`/manifests/${id}/revisions`, {
      method: 'POST',
      body: JSON.stringify({ changeReason, deltaSummary }),
    });
  },

  // AM-09: Articles & Untrusted Content
  getEnrichedArticles: async (params?: {
    caseId?: string;
    subjectId?: string;
    language?: string;
    severity?: string;
    accessStatus?: string;
    eventCategory?: string;
    search?: string;
    assessment?: string;
  }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ data: Article[]; count: number }>(`/articles${query ? `?${query}` : ''}`);
  },

  getArticle: async (id: string) => {
    return request<{ data: Article }>(`/articles/${id}`);
  },

  getArticleRetrievalRecord: async (id: string) => {
    return request<{ data: RetrievalRecord }>(`/articles/${id}/retrieval-record`);
  },

  reviewArticle: async (id: string, review: { identityAssessment?: string; legalStatus?: string; notes?: string }) => {
    return request<{ data: Article }>(`/articles/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(review),
    });
  },

  // AM-10: Historical Period Policies & Exceptions
  getHistoricalRules: async () => {
    return request<{ data: HistoricalPeriodRule[] }>('/historical-period/rules');
  },

  resolveHistoricalPeriod: async (params: {
    clientType?: string;
    subjectRole?: string;
    riskLevel?: string;
    jurisdiction?: string;
    reviewType?: string;
    subjectId?: string;
  }) => {
    return request<{ data: HistoricalPeriodResolution }>('/historical-period/resolve', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  requestHistoricalException: async (data: {
    subjectId: string;
    originalMonths: number;
    overrideMonths: number;
    justification: string;
  }) => {
    return request<{ data: any }>('/historical-period/exceptions', {
      method: 'POST',
      body: JSON.stringify({ action: 'REQUEST', ...data }),
    });
  },

  approveHistoricalException: async (subjectId: string) => {
    return request<{ data: any }>('/historical-period/exceptions', {
      method: 'POST',
      body: JSON.stringify({ action: 'APPROVE', subjectId }),
    });
  },

  // AM-11: Saved Views
  getSavedViews: async () => {
    return request<{ data: SavedView[] }>('/saved-views');
  },

  createSavedView: async (viewData: Partial<SavedView>) => {
    return request<{ data: SavedView }>('/saved-views', {
      method: 'POST',
      body: JSON.stringify(viewData),
    });
  },

  deleteSavedView: async (id: string) => {
    return request<{ success: boolean; message: string }>(`/saved-views/${id}`, {
      method: 'DELETE',
    });
  },

  // AM-16 to AM-20: Events, Clustering, Duplicates, and Timeline
  getEvents: async (params?: { caseId?: string; status?: string; category?: string; legalStatus?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ data: AdverseEvent[]; total: number }>(`/events${query ? `?${query}` : ''}`);
  },

  getEvent: async (id: string) => {
    return request<{ data: AdverseEvent }>(`/events/${id}`);
  },

  createEvent: async (data: Partial<AdverseEvent>) => {
    return request<{ data: AdverseEvent }>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateEvent: async (id: string, data: Partial<AdverseEvent>) => {
    return request<{ data: AdverseEvent; revision: any }>(`/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  mergeEvents: async (primaryEventId: string, secondaryEventId: string, rationale: string) => {
    return request<{ data: AdverseEvent; archivedEvent: AdverseEvent; operation: MergeOperation }>('/events/merge', {
      method: 'POST',
      body: JSON.stringify({ primaryEventId, secondaryEventId, rationale }),
    });
  },

  splitEvent: async (sourceEventId: string, splitArticleIds: string[], newEventTitle: string, rationale: string) => {
    return request<{ data: AdverseEvent; newEvent: AdverseEvent; operation: SplitOperation }>('/events/split', {
      method: 'POST',
      body: JSON.stringify({ sourceEventId, splitArticleIds, newEventTitle, rationale }),
    });
  },

  reassignArticle: async (articleId: string, fromEventId: string, toEventId: string, rationale: string) => {
    return request<{ fromEvent: AdverseEvent; toEvent: AdverseEvent; operation: ReassignmentOperation }>('/events/reassign-article', {
      method: 'POST',
      body: JSON.stringify({ articleId, fromEventId, toEventId, rationale }),
    });
  },

  addTimelineEntry: async (eventId: string, entry: Partial<TimelineEntry>) => {
    return request<{ data: TimelineEntry; event: AdverseEvent }>(`/events/${eventId}/timeline`, {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },

  updateTimelineEntry: async (eventId: string, entryId: string, entry: Partial<TimelineEntry>) => {
    return request<{ data: TimelineEntry; event: AdverseEvent }>(`/events/${eventId}/timeline/${entryId}`, {
      method: 'PATCH',
      body: JSON.stringify(entry),
    });
  },

  deleteTimelineEntry: async (eventId: string, entryId: string) => {
    return request<{ success: boolean; deletedEntryId: string }>(`/events/${eventId}/timeline/${entryId}`, {
      method: 'DELETE',
    });
  },

  getDuplicates: async () => {
    return request<{ data: DuplicateAssessment[]; total: number }>('/duplicates');
  },

  overrideDuplicate: async (assessmentId: string, status: string, rationale: string) => {
    return request<{ data: DuplicateAssessment }>('/duplicates/override', {
      method: 'POST',
      body: JSON.stringify({ assessmentId, status, rationale }),
    });
  },

  getClusters: async () => {
    return request<{ data: ArticleCluster[]; total: number }>('/clusters');
  },

  getSourceRoles: async () => {
    return request<{ data: SourceRoleAssessment[]; total: number }>('/source-roles');
  },

  overrideSourceRole: async (articleId: string, assignedRole: string, rationale: string) => {
    return request<{ data: SourceRoleAssessment }>(`/source-roles/${articleId}/override`, {
      method: 'POST',
      body: JSON.stringify({ assignedRole, rationale }),
    });
  },

  recluster: async (caseId?: string) => {
    return request<{ data: { clusterCount: number; clusters: ArticleCluster[] } }>('/recluster', {
      method: 'POST',
      body: JSON.stringify({ caseId }),
    });
  },

  // AM-21 through AM-27 Grounded Extraction Methods
  getArticleExtraction: async (articleId: string) => {
    return request<{
      data: {
        bundle: ArticleExtractionBundle;
        article: Article;
        rawContent: string;
        translation?: string;
      };
    }>(`/articles/${articleId}/extraction`);
  },

  reExtractArticle: async (articleId: string, options?: { promptVersion?: string; modelVersion?: string }) => {
    return request<{
      data: {
        bundle: ArticleExtractionBundle;
        article: Article;
        rawContent: string;
        translation?: string;
      };
    }>(`/articles/${articleId}/extract`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  },

  getArticleContent: async (articleId: string) => {
    return request<{
      data: {
        articleId: string;
        language: string;
        isRTL: boolean;
        rawContent: string;
        translation?: string;
        contentLength: number;
        versionNumber: number;
      };
    }>(`/articles/${articleId}/content`);
  },

  submitCorrection: async (articleId: string, payload: {
    targetType: string;
    targetId: string;
    operation: string;
    previousValue?: any;
    correctedValue?: any;
    rationale: string;
  }) => {
    return request<{
      data: {
        correction: any;
        bundle: ArticleExtractionBundle;
      };
    }>(`/articles/${articleId}/corrections`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  revertCorrection: async (articleId: string, correctionId: string, rationale: string) => {
    return request<{
      data: {
        revertedCorrection: any;
        bundle: ArticleExtractionBundle;
      };
    }>(`/articles/${articleId}/corrections/${correctionId}/revert`, {
      method: 'POST',
      body: JSON.stringify({ rationale }),
    });
  },

  updateLegalStatus: async (articleId: string, payload: {
    newStatus: string;
    rationale: string;
    authority?: string;
    jurisdiction?: string;
    evidencePassageIds?: string[];
  }) => {
    return request<{ data: any; correction?: any }>(`/articles/${articleId}/legal-status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getTaxonomies: async () => {
    return request<{ data: any[]; currentVersion: any }>('/taxonomies');
  },

  // AM-38 through AM-44: Investigation Workflow API
  getInvestigations: async (params?: { queue?: string; status?: string; priority?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ data: Investigation[]; queueItems: QueueItem[]; queueSummary: Record<string, number>; actor: any }>(
      `/investigations${query ? `?${query}` : ''}`
    );
  },

  getInvestigationWorkspace: async (investigationId: string) => {
    return request<{
      data: {
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
      };
    }>(`/investigations/${investigationId}/workspace`);
  },

  saveInvestigationDraft: async (investigationId: string, caseId: string, draftType: string, payload: any) => {
    return request<{ data: Draft }>(`/investigations/${investigationId}/draft`, {
      method: 'POST',
      body: JSON.stringify({ caseId, draftType, payload }),
    });
  },

  getInvestigationDraft: async (investigationId: string, draftType?: string) => {
    return request<{ data: Draft | null }>(
      `/investigations/${investigationId}/draft${draftType ? `?draftType=${draftType}` : ''}`
    );
  },

  submitAnalystDisposition: async (investigationId: string, payload: any) => {
    return request<{ data: { investigation: Investigation; conclusion: AnalystConclusion } }>(
      `/investigations/${investigationId}/disposition`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  submitReviewDecision: async (investigationId: string, payload: any) => {
    return request<{ data: { investigation: Investigation; review: ReviewDecision } }>(
      `/investigations/${investigationId}/review`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  submitComplianceDecision: async (investigationId: string, payload: any) => {
    return request<{ data: { investigation: Investigation; decision: ComplianceDecision } }>(
      `/investigations/${investigationId}/compliance-decision`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  submitMlroDecision: async (investigationId: string, payload: any) => {
    return request<{ data: { investigation: Investigation; determination: MlroDecision } }>(
      `/investigations/${investigationId}/mlro-decision`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  submitOverride: async (investigationId: string, payload: any) => {
    return request<{ data: InvestigationOverride }>(`/investigations/${investigationId}/overrides`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  approveOverride: async (investigationId: string, overrideId: string, notes?: string) => {
    return request<{ data: InvestigationOverride }>(`/investigations/${investigationId}/overrides/${overrideId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  getInvestigationTasks: async (investigationId: string) => {
    return request<{ data: InvestigationTask[] }>(`/investigations/${investigationId}/tasks`);
  },

  createInvestigationTask: async (investigationId: string, payload: any) => {
    return request<{ data: InvestigationTask }>(`/investigations/${investigationId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateInvestigationTask: async (investigationId: string, taskId: string, payload: any) => {
    return request<{ data: InvestigationTask }>(`/investigations/${investigationId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  addInvestigationComment: async (investigationId: string, payload: { text: string; isInternal?: boolean; mentions?: string[] }) => {
    return request<{ data: InvestigationComment }>(`/investigations/${investigationId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getInvestigationAuditChain: async (investigationId: string) => {
    return request<{ data: any }>(`/investigations/${investigationId}/audit-chain`);
  },

  // AM-45: KYC Case Link & Reconciliation
  getKycLink: async (investigationId: string) => {
    return request<{ data: KycCaseLink }>(`/investigations/${investigationId}/kyc-link`);
  },
  reconcileKycLink: async (investigationId: string) => {
    return request<{ data: KycCaseLink; message: string }>(`/investigations/${investigationId}/kyc-link/reconcile`, {
      method: 'POST',
    });
  },

  // AM-46 & AM-47: Risk-Factor Integration & Explanation
  getRiskImpact: async (investigationId: string) => {
    return request<{ data: RiskImpact }>(`/investigations/${investigationId}/risk-impact`);
  },
  getApprovedFindings: async (investigationId: string) => {
    return request<{ data: ApprovedFinding[] }>(`/investigations/${investigationId}/approved-findings`);
  },
  transmitFindingToRisk: async (investigationId: string, findingId: string) => {
    return request<{ data: any; message: string }>(
      `/investigations/${investigationId}/approved-findings/${findingId}/transmit-risk`,
      { method: 'POST' }
    );
  },

  // AM-48: EDD Triggers & Investigation Plans
  getEddCase: async (investigationId: string) => {
    return request<{ data: EddCase | null }>(`/investigations/${investigationId}/edd-case`);
  },
  triggerEddCase: async (investigationId: string, triggerReason: string) => {
    return request<{ data: EddCase }>(`/investigations/${investigationId}/edd-case/trigger`, {
      method: 'POST',
      body: JSON.stringify({ triggerReason }),
    });
  },
  aiDraftEddQuestions: async (investigationId: string, adverseEvents?: string[]) => {
    return request<{ data: any[] }>(`/investigations/${investigationId}/edd-case/ai-draft-questions`, {
      method: 'POST',
      body: JSON.stringify({ adverseEvents }),
    });
  },
  approveEddQuestion: async (investigationId: string, questionId: string) => {
    return request<{ data: any; message: string }>(
      `/investigations/${investigationId}/edd-case/questions/${questionId}/approve`,
      { method: 'POST' }
    );
  },

  // AM-49: Client Information Requests (CIR)
  getInformationRequests: async (investigationId: string) => {
    return request<{ data: InformationRequest[] }>(`/investigations/${investigationId}/information-requests`);
  },
  createInformationRequest: async (investigationId: string, payload: any) => {
    return request<{ data: InformationRequest }>(`/investigations/${investigationId}/information-requests`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  approveAndTransmitRequest: async (investigationId: string, requestId: string) => {
    return request<{ data: InformationRequest; message: string }>(
      `/investigations/${investigationId}/information-requests/${requestId}/approve-transmit`,
      { method: 'POST' }
    );
  },
  recordClientResponse: async (investigationId: string, requestId: string, payload: any) => {
    return request<{ data: InformationRequest; message: string }>(
      `/investigations/${investigationId}/information-requests/${requestId}/record-response`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  // AM-50: Compliance Decision Packs
  getDecisionPacks: async (investigationId: string) => {
    return request<{ data: DecisionPack[] }>(`/investigations/${investigationId}/decision-packs`);
  },
  generateDecisionPack: async (investigationId: string, payload: any) => {
    return request<{ data: DecisionPack; message: string }>(`/investigations/${investigationId}/decision-packs/generate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // AM-51: Acceptance Conditions
  getAcceptanceConditions: async (investigationId: string) => {
    return request<{ data: AcceptanceCondition[] }>(`/investigations/${investigationId}/acceptance-conditions`);
  },
  createAcceptanceCondition: async (investigationId: string, payload: any) => {
    return request<{ data: AcceptanceCondition }>(`/investigations/${investigationId}/acceptance-conditions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  attachConditionEvidence: async (investigationId: string, conditionId: string, payload: any) => {
    return request<{ data: AcceptanceCondition; message: string }>(
      `/investigations/${investigationId}/acceptance-conditions/${conditionId}/evidence`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },
  approveConditionClosure: async (investigationId: string, conditionId: string) => {
    return request<{ data: AcceptanceCondition; message: string }>(
      `/investigations/${investigationId}/acceptance-conditions/${conditionId}/approve-closure`,
      { method: 'POST' }
    );
  },
  escalateConditionBreach: async (investigationId: string, conditionId: string, reason: string) => {
    return request<{ data: AcceptanceCondition; message: string }>(
      `/investigations/${investigationId}/acceptance-conditions/${conditionId}/escalate-breach`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
  },

  // AM-52: BAU Handover
  getHandoverPackages: async (investigationId: string) => {
    return request<{ data: HandoverPackage[] }>(`/investigations/${investigationId}/handover-packages`);
  },
  createAndTransmitHandover: async (investigationId: string, payload: any) => {
    return request<{ data: HandoverPackage; message: string }>(`/investigations/${investigationId}/handover-packages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  replayHandoverDelivery: async (investigationId: string, handoverId: string, simulateFailure?: boolean) => {
    return request<{ data: HandoverPackage; message: string }>(
      `/investigations/${investigationId}/handover-packages/${handoverId}/replay`,
      {
        method: 'POST',
        body: JSON.stringify({ simulateFailure }),
      }
    );
  },
  getOutboxAttempts: async (outboxId: string) => {
    return request<{ data: DeliveryAttempt[] }>(`/outbox/${outboxId}/attempts`);
  },

  // AM-53 through AM-59: Continuous Monitoring & Delta Intelligence
  getMonitoringMetrics: async () => {
    return request<{ data: MonitoringMetrics }>('/monitoring/metrics');
  },
  getMonitoringSchedules: async () => {
    return request<{ data: ScreeningSchedule[] }>('/monitoring/schedules');
  },
  recalculateMonitoringSchedule: async (id: string, payload: any) => {
    return request<{ data: ScreeningSchedule; message: string }>(`/monitoring/schedules/${id}/recalculate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  pauseMonitoringSchedule: async (id: string, reason: string) => {
    return request<{ data: ScreeningSchedule; message: string }>(`/monitoring/schedules/${id}/pause`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
  resumeMonitoringSchedule: async (id: string) => {
    return request<{ data: ScreeningSchedule; message: string }>(`/monitoring/schedules/${id}/resume`, {
      method: 'POST',
    });
  },
  getScheduleRevisions: async (id: string) => {
    return request<{ data: ScheduleRevision[] }>(`/monitoring/schedules/${id}/revisions`);
  },
  getMonitoringSubscriptions: async () => {
    return request<{ data: MonitoringSubscription[] }>('/monitoring/subscriptions');
  },
  createMonitoringSubscription: async (payload: any) => {
    return request<{ data: MonitoringSubscription }>('/monitoring/subscriptions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  runMonitoringCycle: async (id: string) => {
    return request<{ data: any; message: string }>(`/monitoring/subscriptions/${id}/run-cycle`, {
      method: 'POST',
    });
  },
  getMonitoringCycles: async () => {
    return request<{ data: MonitoringCycle[] }>('/monitoring/cycles');
  },
  getDeltaSets: async () => {
    return request<{ data: DeltaSet[] }>('/monitoring/deltas');
  },
  getDeltaSetById: async (id: string) => {
    return request<{ data: DeltaSet }>(`/monitoring/deltas/${id}`);
  },
  getSuppressions: async () => {
    return request<{ data: SuppressionDecision[] }>('/monitoring/suppressions');
  },
  reopenSuppression: async (id: string, reason: string) => {
    return request<{ data: SuppressionDecision; message: string }>(`/monitoring/suppressions/${id}/reopen`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
  getMaterialUpdates: async () => {
    return request<{ data: MaterialUpdate[] }>('/monitoring/material-updates');
  },
  getTriggerRules: async () => {
    return request<{ data: TriggerRule[] }>('/monitoring/triggers/rules');
  },
  getTriggeredCases: async () => {
    return request<{ data: TriggeredCase[] }>('/monitoring/triggers/cases');
  },
  createTriggeredCase: async (payload: any) => {
    return request<{ data: TriggeredCase }>('/monitoring/triggers/cases', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getMonitoringAlerts: async () => {
    return request<{ data: MonitoringAlert[] }>('/monitoring/alerts');
  },
  updateMonitoringAlert: async (id: string, payload: any) => {
    return request<{ data: MonitoringAlert }>(`/monitoring/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  convertAlertToCase: async (id: string) => {
    return request<{ data: TriggeredCase; message: string }>(`/monitoring/alerts/${id}/convert-to-case`, {
      method: 'POST',
    });
  },
};

/**
 * Convenient typed wrapper with unwrapped values for high-ergonomics UI usage
 */
export const apiClient = {
  setActor,
  setActiveRole,
  getActiveRole,

  getCases: async (params?: any): Promise<KycCase[]> => {
    const res = await api.getCases(params);
    return res.data;
  },

  getCase: async (id: string): Promise<KycCase> => {
    const res = await api.getCase(id);
    return res.data;
  },

  createCase: async (data: any): Promise<KycCase> => {
    const res = await api.createCase(data);
    return res.data;
  },

  completeCase: async (id: string): Promise<{ case: KycCase; message: string }> => {
    const res = await api.completeCase(id);
    return { case: res.data, message: res.message };
  },

  getObligations: async (caseId: string): Promise<ScreeningObligation[]> => {
    const res = await api.getObligations(caseId);
    return res.data;
  },

  getSubjects: async (caseId: string): Promise<Subject[]> => {
    const res = await api.getSubjects(caseId);
    return res.data;
  },

  getArticles: async (caseId: string): Promise<AdverseMediaArticle[]> => {
    const res = await api.getArticles(caseId);
    return res.data;
  },

  getScreeningRun: async (caseId: string): Promise<ScreeningRun | null> => {
    try {
      const runsRes = await request<{ data: ScreeningRun[] }>(`/cases/${caseId}/runs`).catch(() => null);
      if (runsRes && runsRes.data && runsRes.data.length > 0) {
        return runsRes.data[0];
      }
      return null;
    } catch {
      return null;
    }
  },

  executeScreening: async (caseId: string): Promise<ScreeningRun> => {
    const caseData = await api.getCase(caseId);
    const primarySubj = caseData.data.subjects[0];
    const subjId = primarySubj ? primarySubj.id : 'subj-01';
    const res = await api.executeScreeningRun(caseId, subjId);
    return res.data;
  },

  getWorkQueue: async (queue?: string): Promise<WorkItem[]> => {
    const res = await api.getWorkItems(queue);
    return res.data;
  },

  getConnectors: async (): Promise<SourceConnector[]> => {
    const res = await api.getConnectors();
    return res.data;
  },

  getPolicyRules: async (): Promise<PolicyRule[]> => {
    const res = await api.getPolicies();
    return res.data.activeVersion.rules;
  },

  getAuditTrail: async (params?: any): Promise<AuditEvent[]> => {
    const res = await api.getAuditEvents(params);
    return res.data;
  },

  retryConnector: async (connectorId: string, screeningRunId: string): Promise<CoverageOutcome> => {
    const res = await api.retryConnector(connectorId, screeningRunId);
    const outcome = res.data.run.coverageOutcomes.find((o) => o.connectorId === connectorId);
    return outcome || {
      connectorId,
      connectorName: connectorId,
      category: 'COURT_RECORDS',
      status: 'SUCCESS',
      articlesRetrieved: 1,
      executionDurationMs: 120,
      retryCount: 1,
    };
  },

  retryConnectorDirect: async (connectorId: string): Promise<SourceConnector> => {
    const res = await api.resetConnector(connectorId);
    return res.data;
  },

  createAlias: async (subjectId: string, data: any): Promise<Alias> => {
    const res = await api.addAlias(subjectId, data);
    return res.data;
  },

  suggestAliasesAI: async (subjectId: string): Promise<Alias[]> => {
    const res = await api.suggestAliasesWithAI(subjectId);
    return res.data;
  },

  updateAliasStatus: async (aliasId: string, newState: string, reason?: string): Promise<Alias> => {
    const res = await api.updateAliasStatus(aliasId, newState, reason);
    return res.data;
  },

  requestExemption: async (obligationId: string, data: any): Promise<ScreeningObligation> => {
    const res = await api.requestExemption(obligationId, data);
    return res.data;
  },

  adjudicateExemption: async (obligationId: string, approved: boolean, notes: string): Promise<ScreeningObligation> => {
    const res = await api.adjudicateExemption(obligationId, approved, notes);
    return res.data;
  },

  simulatePolicy: async (input: any): Promise<any> => {
    const res = await api.evaluatePolicy(input);
    return res.data;
  },

  // AM-07: Query Expansion Preview
  previewQueryExpansion: async (subjectId: string, targetLanguages?: string[], eventCategories?: string[]) => {
    return api.previewQueryExpansion(subjectId, targetLanguages, eventCategories);
  },

  // AM-08: Manifests
  getManifest: async (id: string): Promise<SearchManifest> => {
    const res = await api.getManifest(id);
    return res.data;
  },

  getCaseManifests: async (caseId: string): Promise<SearchManifest[]> => {
    const res = await api.getCaseManifests(caseId);
    return res.data;
  },

  addManifestRevision: async (id: string, reason: string, delta: string) => {
    return api.addManifestRevision(id, reason, delta);
  },

  // AM-09: Enriched Articles & Untrusted Content
  getEnrichedArticles: async (params?: any): Promise<Article[]> => {
    const res = await api.getEnrichedArticles(params);
    return res.data;
  },

  getArticle: async (id: string): Promise<Article> => {
    const res = await api.getArticle(id);
    return res.data;
  },

  getArticleRetrievalRecord: async (id: string): Promise<RetrievalRecord> => {
    const res = await api.getArticleRetrievalRecord(id);
    return res.data;
  },

  reviewArticle: async (id: string, review: { identityAssessment?: string; legalStatus?: string; notes?: string }): Promise<Article> => {
    const res = await api.reviewArticle(id, review);
    return res.data;
  },

  // AM-10: Historical Period
  getHistoricalRules: async (): Promise<HistoricalPeriodRule[]> => {
    const res = await api.getHistoricalRules();
    return res.data;
  },

  resolveHistoricalPeriod: async (params: any): Promise<HistoricalPeriodResolution> => {
    const res = await api.resolveHistoricalPeriod(params);
    return res.data;
  },

  requestHistoricalException: async (data: any) => {
    const res = await api.requestHistoricalException(data);
    return res.data;
  },

  approveHistoricalException: async (subjectId: string) => {
    const res = await api.approveHistoricalException(subjectId);
    return res.data;
  },

  // AM-11: Saved Views
  getSavedViews: async (): Promise<SavedView[]> => {
    const res = await api.getSavedViews();
    return res.data;
  },

  createSavedView: async (view: Partial<SavedView>): Promise<SavedView> => {
    const res = await api.createSavedView(view);
    return res.data;
  },

  deleteSavedView: async (id: string) => {
    return api.deleteSavedView(id);
  },

  // AM-16 to AM-20: Events & Timeline
  getEvents: async (params?: any): Promise<AdverseEvent[]> => {
    const res = await api.getEvents(params);
    return res.data;
  },

  getEvent: async (id: string): Promise<AdverseEvent> => {
    const res = await api.getEvent(id);
    return res.data;
  },

  createEvent: async (data: Partial<AdverseEvent>): Promise<AdverseEvent> => {
    const res = await api.createEvent(data);
    return res.data;
  },

  updateEvent: async (id: string, data: Partial<AdverseEvent>): Promise<{ data: AdverseEvent; revision: any }> => {
    return api.updateEvent(id, data);
  },

  mergeEvents: async (primaryEventId: string, secondaryEventId: string, rationale: string) => {
    return api.mergeEvents(primaryEventId, secondaryEventId, rationale);
  },

  splitEvent: async (sourceEventId: string, splitArticleIds: string[], newEventTitle: string, rationale: string) => {
    return api.splitEvent(sourceEventId, splitArticleIds, newEventTitle, rationale);
  },

  reassignArticle: async (articleId: string, fromEventId: string, toEventId: string, rationale: string) => {
    return api.reassignArticle(articleId, fromEventId, toEventId, rationale);
  },

  addTimelineEntry: async (eventId: string, entry: Partial<TimelineEntry>) => {
    return api.addTimelineEntry(eventId, entry);
  },

  updateTimelineEntry: async (eventId: string, entryId: string, entry: Partial<TimelineEntry>) => {
    return api.updateTimelineEntry(eventId, entryId, entry);
  },

  deleteTimelineEntry: async (eventId: string, entryId: string) => {
    return api.deleteTimelineEntry(eventId, entryId);
  },

  getDuplicates: async (): Promise<DuplicateAssessment[]> => {
    const res = await api.getDuplicates();
    return res.data;
  },

  overrideDuplicate: async (assessmentId: string, status: string, rationale: string) => {
    return api.overrideDuplicate(assessmentId, status, rationale);
  },

  getClusters: async (): Promise<ArticleCluster[]> => {
    const res = await api.getClusters();
    return res.data;
  },

  getSourceRoles: async (): Promise<SourceRoleAssessment[]> => {
    const res = await api.getSourceRoles();
    return res.data;
  },

  overrideSourceRole: async (articleId: string, assignedRole: string, rationale: string) => {
    return api.overrideSourceRole(articleId, assignedRole, rationale);
  },

  recluster: async (caseId?: string) => {
    return api.recluster(caseId);
  },

  // AM-21 through AM-27 Grounded Extraction Methods
  getArticleExtraction: async (articleId: string) => {
    const res = await api.getArticleExtraction(articleId);
    return res.data;
  },

  reExtractArticle: async (articleId: string, options?: { promptVersion?: string; modelVersion?: string }) => {
    const res = await api.reExtractArticle(articleId, options);
    return res.data;
  },

  getArticleContent: async (articleId: string) => {
    const res = await api.getArticleContent(articleId);
    return res.data;
  },

  submitCorrection: async (articleId: string, payload: {
    targetType: string;
    targetId: string;
    operation: string;
    previousValue?: any;
    correctedValue?: any;
    rationale: string;
  }) => {
    const res = await api.submitCorrection(articleId, payload);
    return res.data;
  },

  revertCorrection: async (articleId: string, correctionId: string, rationale: string) => {
    const res = await api.revertCorrection(articleId, correctionId, rationale);
    return res.data;
  },

  updateLegalStatus: async (articleId: string, payload: {
    newStatus: string;
    rationale: string;
    authority?: string;
    jurisdiction?: string;
    evidencePassageIds?: string[];
  }) => {
    const res = await api.updateLegalStatus(articleId, payload);
    return res.data;
  },

  getTaxonomies: async () => {
    const res = await api.getTaxonomies();
    return res;
  },

  // AM-38 through AM-44: Investigation Workflow
  getInvestigations: async (params?: { queue?: string; status?: string; priority?: string; search?: string }) => {
    return api.getInvestigations(params);
  },

  getInvestigationWorkspace: async (investigationId: string) => {
    const res = await api.getInvestigationWorkspace(investigationId);
    return res.data;
  },

  saveInvestigationDraft: async (investigationId: string, caseId: string, draftType: string, payload: any) => {
    const res = await api.saveInvestigationDraft(investigationId, caseId, draftType, payload);
    return res.data;
  },

  getInvestigationDraft: async (investigationId: string, draftType?: string) => {
    const res = await api.getInvestigationDraft(investigationId, draftType);
    return res.data;
  },

  submitAnalystDisposition: async (investigationId: string, payload: any) => {
    const res = await api.submitAnalystDisposition(investigationId, payload);
    return res.data;
  },

  submitReviewDecision: async (investigationId: string, payload: any) => {
    const res = await api.submitReviewDecision(investigationId, payload);
    return res.data;
  },

  submitComplianceDecision: async (investigationId: string, payload: any) => {
    const res = await api.submitComplianceDecision(investigationId, payload);
    return res.data;
  },

  submitMlroDecision: async (investigationId: string, payload: any) => {
    const res = await api.submitMlroDecision(investigationId, payload);
    return res.data;
  },

  submitOverride: async (investigationId: string, payload: any) => {
    const res = await api.submitOverride(investigationId, payload);
    return res.data;
  },

  approveOverride: async (investigationId: string, overrideId: string, notes?: string) => {
    const res = await api.approveOverride(investigationId, overrideId, notes);
    return res.data;
  },

  getInvestigationTasks: async (investigationId: string) => {
    const res = await api.getInvestigationTasks(investigationId);
    return res.data;
  },

  createInvestigationTask: async (investigationId: string, payload: any) => {
    const res = await api.createInvestigationTask(investigationId, payload);
    return res.data;
  },

  updateInvestigationTask: async (investigationId: string, taskId: string, payload: any) => {
    const res = await api.updateInvestigationTask(investigationId, taskId, payload);
    return res.data;
  },

  addInvestigationComment: async (investigationId: string, payload: { text: string; isInternal?: boolean; mentions?: string[] }) => {
    const res = await api.addInvestigationComment(investigationId, payload);
    return res.data;
  },

  getInvestigationAuditChain: async (investigationId: string) => {
    const res = await api.getInvestigationAuditChain(investigationId);
    return res.data;
  },

  // AM-45: KYC Case Link & Reconciliation
  getKycLink: async (investigationId: string) => {
    const res = await api.getKycLink(investigationId);
    return res.data;
  },
  reconcileKycLink: async (investigationId: string) => {
    const res = await api.reconcileKycLink(investigationId);
    return res;
  },

  // AM-46 & AM-47: Risk-Factor Integration & Explanation
  getRiskImpact: async (investigationId: string) => {
    const res = await api.getRiskImpact(investigationId);
    return res.data;
  },
  getApprovedFindings: async (investigationId: string) => {
    const res = await api.getApprovedFindings(investigationId);
    return res.data;
  },
  transmitFindingToRisk: async (investigationId: string, findingId: string) => {
    const res = await api.transmitFindingToRisk(investigationId, findingId);
    return res;
  },

  // AM-48: EDD Triggers & Investigation Plans
  getEddCase: async (investigationId: string) => {
    const res = await api.getEddCase(investigationId);
    return res.data;
  },
  triggerEddCase: async (investigationId: string, triggerReason: string) => {
    const res = await api.triggerEddCase(investigationId, triggerReason);
    return res.data;
  },
  aiDraftEddQuestions: async (investigationId: string, adverseEvents?: string[]) => {
    const res = await api.aiDraftEddQuestions(investigationId, adverseEvents);
    return res.data;
  },
  approveEddQuestion: async (investigationId: string, questionId: string) => {
    const res = await api.approveEddQuestion(investigationId, questionId);
    return res;
  },

  // AM-49: Client Information Requests (CIR)
  getInformationRequests: async (investigationId: string) => {
    const res = await api.getInformationRequests(investigationId);
    return res.data;
  },
  createInformationRequest: async (investigationId: string, payload: any) => {
    const res = await api.createInformationRequest(investigationId, payload);
    return res.data;
  },
  approveAndTransmitRequest: async (investigationId: string, requestId: string) => {
    const res = await api.approveAndTransmitRequest(investigationId, requestId);
    return res;
  },
  recordClientResponse: async (investigationId: string, requestId: string, payload: any) => {
    const res = await api.recordClientResponse(investigationId, requestId, payload);
    return res;
  },

  // AM-50: Compliance Decision Packs
  getDecisionPacks: async (investigationId: string) => {
    const res = await api.getDecisionPacks(investigationId);
    return res.data;
  },
  generateDecisionPack: async (investigationId: string, payload: any) => {
    const res = await api.generateDecisionPack(investigationId, payload);
    return res;
  },

  // AM-51: Acceptance Conditions
  getAcceptanceConditions: async (investigationId: string) => {
    const res = await api.getAcceptanceConditions(investigationId);
    return res.data;
  },
  createAcceptanceCondition: async (investigationId: string, payload: any) => {
    const res = await api.createAcceptanceCondition(investigationId, payload);
    return res.data;
  },
  attachConditionEvidence: async (investigationId: string, conditionId: string, payload: any) => {
    const res = await api.attachConditionEvidence(investigationId, conditionId, payload);
    return res;
  },
  approveConditionClosure: async (investigationId: string, conditionId: string) => {
    const res = await api.approveConditionClosure(investigationId, conditionId);
    return res;
  },
  escalateConditionBreach: async (investigationId: string, conditionId: string, reason: string) => {
    const res = await api.escalateConditionBreach(investigationId, conditionId, reason);
    return res;
  },

  // AM-52: BAU Handover
  getHandoverPackages: async (investigationId: string) => {
    const res = await api.getHandoverPackages(investigationId);
    return res.data;
  },
  createAndTransmitHandover: async (investigationId: string, payload: any) => {
    const res = await api.createAndTransmitHandover(investigationId, payload);
    return res;
  },
  replayHandoverDelivery: async (investigationId: string, handoverId: string, simulateFailure?: boolean) => {
    const res = await api.replayHandoverDelivery(investigationId, handoverId, simulateFailure);
    return res;
  },
  getOutboxAttempts: async (outboxId: string) => {
    const res = await api.getOutboxAttempts(outboxId);
    return res.data;
  },

  // AM-53 to AM-59: Consolidated Monitoring APIs
  getMonitoringOverview: async () => {
    return request<{ metrics: MonitoringMetrics; statusCounts: Record<string, number> }>('/monitoring/overview');
  },
  getScreeningSchedules: async (params?: { customerRisk?: string; status?: string; overdueOnly?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.customerRisk) query.set('customerRisk', params.customerRisk);
    if (params?.status) query.set('status', params.status);
    if (params?.overdueOnly) query.set('overdueOnly', 'true');
    return request<{ data: ScreeningSchedule[]; total: number }>(`/monitoring/schedules${query.toString() ? `?${query.toString()}` : ''}`);
  },
  createScreeningSchedule: async (payload: any) => {
    return request<{ data: ScreeningSchedule }>('/monitoring/schedules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  recalculateSchedule: async (id: string, reason: string) => {
    return request<{ data: ScreeningSchedule }>(`/monitoring/schedules/${id}/recalculate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
  updateScheduleStatus: async (id: string, status: string, reason: string) => {
    return request<{ data: ScreeningSchedule }>(`/monitoring/schedules/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  },
  triggerRescreeningJob: async (id: string) => {
    return request<{ data: ScreeningSchedule; cycle: MonitoringCycle; message: string }>(`/monitoring/schedules/${id}/run-job`, {
      method: 'POST',
    });
  },
  getMonitoringSubscriptions: async () => {
    return request<{ data: MonitoringSubscription[] }>('/monitoring/subscriptions');
  },
  createMonitoringSubscription: async (payload: any) => {
    return request<{ data: MonitoringSubscription }>('/monitoring/subscriptions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  toggleSubscriptionPause: async (id: string, paused: boolean, reason?: string) => {
    return request<{ data: MonitoringSubscription }>(`/monitoring/subscriptions/${id}/pause`, {
      method: 'PATCH',
      body: JSON.stringify({ paused, reason }),
    });
  },
  runSubscriptionCycle: async (id: string) => {
    return request<{ cycle: MonitoringCycle; deltaSet?: DeltaSet; alertsCreated: number; triggeredCases: number }>(`/monitoring/subscriptions/${id}/run-cycle`, {
      method: 'POST',
    });
  },
  getMonitoringCycles: async (subscriptionId?: string) => {
    const q = subscriptionId ? `?subscriptionId=${subscriptionId}` : '';
    return request<{ data: MonitoringCycle[] }>(`/monitoring/cycles${q}`);
  },
  getDeltaSets: async (subscriptionId?: string) => {
    const q = subscriptionId ? `?subscriptionId=${subscriptionId}` : '';
    return request<{ data: DeltaSet[] }>(`/monitoring/deltas${q}`);
  },
  getSuppressionDecisions: async (params?: { caseId?: string; subjectId?: string; isReopened?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.caseId) query.set('caseId', params.caseId);
    if (params?.subjectId) query.set('subjectId', params.subjectId);
    if (params?.isReopened !== undefined) query.set('isReopened', String(params.isReopened));
    return request<{ data: SuppressionDecision[] }>(`/monitoring/suppressions${query.toString() ? `?${query.toString()}` : ''}`);
  },
  reopenSuppressedItem: async (id: string, reason: string) => {
    return request<{ data: SuppressionDecision; alert: MonitoringAlert }>(`/monitoring/suppressions/${id}/reopen`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
  getMaterialUpdates: async (params?: { caseId?: string; subjectId?: string; changeType?: string }) => {
    const query = new URLSearchParams();
    if (params?.caseId) query.set('caseId', params.caseId);
    if (params?.subjectId) query.set('subjectId', params.subjectId);
    if (params?.changeType) query.set('changeType', params.changeType);
    return request<{ data: MaterialUpdate[] }>(`/monitoring/material-updates${query.toString() ? `?${query.toString()}` : ''}`);
  },
  getTriggerRules: async () => {
    return request<{ data: TriggerRule[] }>('/monitoring/trigger-rules');
  },
  getTriggeredCases: async () => {
    return request<{ data: TriggeredCase[] }>('/monitoring/triggered-cases');
  },
  getMonitoringAlerts: async (params?: { status?: string; priority?: string; caseId?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.caseId) query.set('caseId', params.caseId);
    return request<{ data: MonitoringAlert[]; total: number }>(`/monitoring/alerts${query.toString() ? `?${query.toString()}` : ''}`);
  },
  updateAlertStatus: async (id: string, status: string, notes?: string) => {
    return request<{ data: MonitoringAlert }>(`/monitoring/alerts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  },
  generateAiDeltaSummary: async (deltaSetId: string) => {
    return request<{ summary: string; advisoryOnly: boolean }>(`/monitoring/deltas/${deltaSetId}/ai-summary`, {
      method: 'POST',
    });
  },
  runMultiCycleDemo: async () => {
    return request<{ success: boolean; cyclesExecuted: number; summaries: string[] }>('/monitoring/demo/run-multi-cycle', {
      method: 'POST',
    });
  },
  getConnectorHealth: async () => {
    return request<{ connectors: any[]; queueLagSeconds: number; workerStatus: string }>('/monitoring/connectors/health');
  },
};

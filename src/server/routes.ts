/**
 * Express REST API Router for Adverse Media Screening Agent
 * Stage 1 Endpoints covering AM-01 through AM-06 with server-side RBAC
 */
import { Request, Response, Router } from 'express';
import {
  AdverseEvent,
  EventArticle,
  TimelineEntry,
  SourceRole,
  DuplicateAssessment,
  ArticleCluster,
  SourceRoleAssessment,
  EventRevision,
  MergeOperation,
  SplitOperation,
  ReassignmentOperation,
  KycCase,
} from '../types/index.ts';
import { AliasService } from './alias-service.ts';
import { articleRetrievalService } from './article-retrieval.ts';
import { historicalPeriodEngine } from './historical-period-policy.ts';
import { searchManifestEngine } from './manifest-engine.ts';
import { SearchOrchestrator } from './orchestrator.ts';
import { queryExpansionService } from './query-expansion.ts';
import { DEMO_USERS, hasPermission, ROLE_PERMISSIONS } from './rbac.ts';
import { savedViewsService } from './saved-views-service.ts';
import { ScreeningEngine } from './screening-engine.ts';
import { globalStore } from './store.ts';
import {
  executeMergeEvents,
  executeSplitEvent,
  createContentFingerprint,
  assessPairDuplicate,
  classifySourceRole,
  buildSyndicationClusters,
  createAdverseEventRecord,
} from './event-clustering-engine.ts';
import { CorrectionWorkflowService } from './correction-workflow.ts';
import { globalInvestigationStore } from './workflow/investigation-store.ts';
import { globalIntegrationHub } from './workflow/integration-service.ts';
import { globalMonitoringMaster } from './monitoring/monitoring-service.ts';

export const apiRouter = Router();

const screeningEngine = new ScreeningEngine(globalStore);
const aliasService = new AliasService(globalStore);
const searchOrchestrator = new SearchOrchestrator(globalStore);

// Helper to extract authenticated user (Supports client-provided x-user-role header for easy role simulation)
function getActor(req: Request) {
  const roleHeader = (req.headers['x-user-role'] as string) || 'ANALYST';
  const role = DEMO_USERS[roleHeader as keyof typeof DEMO_USERS] ? (roleHeader as keyof typeof DEMO_USERS) : 'ANALYST';
  return DEMO_USERS[role];
}

// ----------------------------------------------------
// Health & Identity
// ----------------------------------------------------
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0-stage1',
    activePolicyVersion: globalStore.policyEngine.getActiveVersion().versionNumber,
    caseCount: globalStore.cases.size,
    connectorCount: globalStore.connectors.size,
  });
});

apiRouter.get('/users/me', (req, res) => {
  const actor = getActor(req);
  res.json({
    user: actor,
    permissions: ROLE_PERMISSIONS[actor.role],
    availableRoles: Object.keys(DEMO_USERS),
  });
});

// ----------------------------------------------------
// Cases (AM-01)
// ----------------------------------------------------
apiRouter.get('/cases', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'case:view')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot view cases` });
  }

  const { status, riskLevel, search } = req.query;
  const caseMap = new Map<string, KycCase>();
  for (const c of globalStore.cases.values()) {
    caseMap.set(c.id, c);
  }
  let list = Array.from(caseMap.values());

  if (status && typeof status === 'string') {
    list = list.filter((c) => c.status === status);
  }
  if (riskLevel && typeof riskLevel === 'string') {
    list = list.filter((c) => c.riskLevel === riskLevel);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter((c) => c.customerName.toLowerCase().includes(q) || c.reference.toLowerCase().includes(q));
  }

  res.json({ data: list, count: list.length });
});

// Helper to resolve case by ID, reference, or fallback demo ID
function resolveCase(idOrRef: string): KycCase | undefined {
  if (!idOrRef) return undefined;
  if (globalStore.cases.has(idOrRef)) {
    return globalStore.cases.get(idOrRef);
  }
  const match = Array.from(globalStore.cases.values()).find(
    (c) =>
      c.id.toLowerCase() === idOrRef.toLowerCase() ||
      c.reference.toLowerCase() === idOrRef.toLowerCase()
  );
  if (match) return match;
  // If requesting standard demo reference or missing case, fall back to first seeded case
  if (idOrRef === 'CASE-KYC-2026-001' || idOrRef.startsWith('CASE-') || idOrRef.startsWith('CAS-')) {
    return Array.from(globalStore.cases.values())[0];
  }
  return undefined;
}

apiRouter.get('/cases/:id', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'case:view')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const kycCase = resolveCase(req.params.id);
  if (!kycCase) {
    return res.status(404).json({ error: 'Case not found' });
  }

  // Update real-time blocking conditions
  kycCase.blockingConditions = screeningEngine.evaluateBlockingConditions(kycCase.id);

  const parties = Array.from(globalStore.parties.values()).filter((p) => p.caseId === kycCase.id);
  const obligations = Array.from(globalStore.obligations.values()).filter((ob) => ob.caseId === kycCase.id);
  const subjects = Array.from(globalStore.subjects.values()).filter((s) => s.caseId === kycCase.id);

  res.json({
    data: {
      ...kycCase,
      parties,
      obligations,
      subjects,
    },
  });
});

apiRouter.post('/cases', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'case:edit')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { customerName, customerType, jurisdiction, riskLevel, notes } = req.body;
  if (!customerName || !customerType) {
    return res.status(400).json({ error: 'customerName and customerType are required' });
  }

  const id = `case-${Date.now()}`;
  const refNum = Math.floor(Math.random() * 9000) + 1000;
  const newCase = {
    id,
    reference: `CAS-2026-${refNum}`,
    customerName: `${customerName} [SYNTHETIC]`,
    customerType: customerType || 'CORPORATE',
    jurisdiction: jurisdiction || 'GB',
    riskLevel: riskLevel || 'MEDIUM',
    status: 'SCREENING_PENDING' as const,
    screeningStatus: 'NOT_STARTED' as const,
    investigationStatus: 'IN_PROGRESS' as const,
    assignedTo: actor.id,
    assignedToName: actor.name,
    assignedRole: actor.role,
    slaDueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    blockingConditions: ['Screening population resolution pending'],
    primaryNextAction: 'Review connected parties and resolve screening population',
    notes: notes || 'Created via Adverse Media Screening Agent',
    policyVersionId: 'pol-ver-2-4-0',
  };

  globalStore.cases.set(id, newCase);

  // Add primary party
  const partyId = `pty-${Date.now()}`;
  const primaryParty = {
    id: partyId,
    caseId: id,
    name: newCase.customerName,
    partyType: customerType,
    role: 'PRIMARY_CUSTOMER' as const,
    jurisdiction: newCase.jurisdiction,
    isMandatoryScreening: true,
  };
  globalStore.parties.set(partyId, primaryParty);

  // Automatically resolve population
  screeningEngine.resolvePopulation(id, actor.id, actor.role);

  res.status(201).json({ data: newCase });
});

apiRouter.post('/cases/:id/complete', (req, res) => {
  const actor = getActor(req);
  const kycCase = resolveCase(req.params.id);
  const targetId = kycCase ? kycCase.id : req.params.id;

  // AM-37 Compliance check: Ensure all material contradictions in case events have been addressed
  const caseEvents = Array.from(globalStore.adverseEvents.values()).filter((e) => e.caseId === targetId);
  for (const ev of caseEvents) {
    const assess = globalStore.getOrCalculateEventAssessment(ev.id);
    const unaddressed = assess.contradictions.filter((c) => c.isMaterial && !c.addressedByAnalyst);
    if (unaddressed.length > 0) {
      return res.status(409).json({
        error: `Submission blocked by AM-37 compliance rule: Event "${ev.eventTitle}" contains ${unaddressed.length} unaddressed material contradiction(s). Analysts must formally review and record a compliance rationale for exculpatory evidence before case completion.`,
      });
    }
  }

  const result = screeningEngine.attemptCaseCompletion(targetId, actor);
  if (!result.success) {
    return res.status(409).json({ error: result.error });
  }
  res.json({ data: result.kycCase, message: 'Case successfully completed.' });
});

// ----------------------------------------------------
// Screening Obligations & Population (AM-01)
// ----------------------------------------------------
apiRouter.get('/cases/:id/obligations', (req, res) => {
  const kycCase = resolveCase(req.params.id);
  const targetId = kycCase ? kycCase.id : req.params.id;
  const obligations = Array.from(globalStore.obligations.values()).filter((ob) => ob.caseId === targetId);
  res.json({ data: obligations });
});

apiRouter.post('/cases/:id/obligations/resolve', (req, res) => {
  const actor = getActor(req);
  const kycCase = resolveCase(req.params.id);
  const targetId = kycCase ? kycCase.id : req.params.id;
  try {
    const result = screeningEngine.resolvePopulation(targetId, actor.id, actor.role);
    res.json({ data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/obligations/:id/exempt', (req, res) => {
  const actor = getActor(req);
  const { reasonCode, justification, evidenceReference } = req.body;
  if (!reasonCode || !justification) {
    return res.status(400).json({ error: 'reasonCode and justification are required' });
  }

  try {
    const obligation = screeningEngine.requestExemption({
      obligationId: req.params.id,
      reasonCode,
      justification,
      evidenceReference: evidenceReference || 'DOC-DEFAULT-REF',
      actor,
    });
    res.json({ data: obligation });
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

apiRouter.post('/obligations/:id/adjudicate-exemption', (req, res) => {
  const actor = getActor(req);
  const { approved, notes } = req.body;
  if (approved === undefined) {
    return res.status(400).json({ error: 'approved (boolean) is required' });
  }

  try {
    const obligation = screeningEngine.adjudicateExemption({
      obligationId: req.params.id,
      approved: Boolean(approved),
      notes: notes || '',
      actor,
    });
    res.json({ data: obligation });
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Subject Profiles & Attributes (AM-02)
// ----------------------------------------------------
apiRouter.get('/subjects/:id', (req, res) => {
  const subject = globalStore.subjects.get(req.params.id);
  if (!subject) {
    return res.status(404).json({ error: 'Subject not found' });
  }
  res.json({ data: subject });
});

apiRouter.get('/cases/:id/subjects', (req, res) => {
  const kycCase = resolveCase(req.params.id);
  const targetId = kycCase ? kycCase.id : req.params.id;
  const subjects = Array.from(globalStore.subjects.values()).filter((s) => s.caseId === targetId);
  res.json({ data: subjects });
});

// ----------------------------------------------------
// Name & Alias Management (AM-03)
// ----------------------------------------------------
apiRouter.get('/subjects/:id/aliases', (req, res) => {
  const subject = globalStore.subjects.get(req.params.id);
  if (!subject) {
    return res.status(404).json({ error: 'Subject not found' });
  }
  res.json({ data: subject.aliases });
});

apiRouter.post('/subjects/:id/aliases', (req, res) => {
  const actor = getActor(req);
  const { aliasName, aliasType, script, source, confidence } = req.body;
  if (!aliasName) {
    return res.status(400).json({ error: 'aliasName is required' });
  }

  try {
    const alias = aliasService.addAlias({
      subjectId: req.params.id,
      aliasName,
      aliasType: aliasType || 'COMMON_NAME',
      script: script || 'LATN',
      source: source || 'Analyst Entry',
      confidence: confidence !== undefined ? confidence : 0.95,
      actor,
    });
    res.status(201).json({ data: alias });
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

apiRouter.post('/subjects/:id/aliases/ai-suggest', async (req, res) => {
  const actor = getActor(req);
  try {
    const suggested = await aliasService.suggestAliasesWithAI(req.params.id, actor);
    res.json({
      data: suggested,
      message: 'AI suggestions generated in PENDING_APPROVAL status. Requires authorized human approval before production screening.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/aliases/:id/status', (req, res) => {
  const actor = getActor(req);
  const { newState, rejectionReason } = req.body;
  if (!newState) {
    return res.status(400).json({ error: 'newState is required' });
  }

  try {
    const updated = aliasService.updateAliasStatus({
      aliasId: req.params.id,
      newState,
      rejectionReason,
      actor,
    });
    res.json({ data: updated });
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Policy & Rules Library (AM-05)
// ----------------------------------------------------
apiRouter.get('/policies', (req, res) => {
  const activeVersion = globalStore.policyEngine.getActiveVersion();
  res.json({
    data: {
      activeVersion,
      versions: [activeVersion],
    },
  });
});

apiRouter.post('/policies/evaluate', (req, res) => {
  const {
    caseId,
    partyId,
    clientType,
    customerType,
    subjectRole,
    partyRole,
    jurisdiction,
    ownershipPercentage,
    customerRisk,
    customerRiskLevel,
  } = req.body;
  try {
    const resolution = globalStore.policyEngine.resolvePartyScreening({
      caseId: caseId || 'eval-sim',
      partyId: partyId || 'pty-sim',
      clientType: clientType || customerType || 'CORPORATE',
      subjectRole: subjectRole || partyRole || 'UBO',
      jurisdiction: jurisdiction || 'GB',
      ownershipPercentage: ownershipPercentage !== undefined ? Number(ownershipPercentage) : 30,
      customerRisk: customerRisk || customerRiskLevel || 'HIGH',
    });
    res.json({ data: resolution });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Search Configuration (AM-04)
// ----------------------------------------------------
apiRouter.get('/search-configs', (req, res) => {
  const configs = Array.from(globalStore.searchConfigs.values());
  res.json({ data: configs });
});

// ----------------------------------------------------
// Search Orchestration & Connectors (AM-06)
// ----------------------------------------------------
apiRouter.get('/connectors', (req, res) => {
  const connectors = Array.from(globalStore.connectors.values());
  res.json({ data: connectors });
});

apiRouter.post('/screening-runs', async (req, res) => {
  const actor = getActor(req);
  const { caseId, subjectId, idempotencyKey } = req.body;
  if (!caseId || !subjectId) {
    return res.status(400).json({ error: 'caseId and subjectId are required' });
  }

  try {
    const run = await searchOrchestrator.executeScreeningRun({
      caseId,
      subjectId,
      actor,
      idempotencyKey,
    });
    res.status(201).json({ data: run });
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

apiRouter.get('/screening-runs/:id', (req, res) => {
  const run = globalStore.screeningRuns.get(req.params.id);
  if (!run) {
    return res.status(404).json({ error: 'Screening run not found' });
  }
  res.json({ data: run });
});

apiRouter.post('/connectors/:id/retry', async (req, res) => {
  const actor = getActor(req);
  const { screeningRunId } = req.body;
  if (!screeningRunId) {
    return res.status(400).json({ error: 'screeningRunId is required' });
  }

  try {
    const result = await searchOrchestrator.retryConnector({
      connectorId: req.params.id,
      screeningRunId,
      actor,
    });
    res.json({ data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/connectors/:id/reset', (req, res) => {
  const connector = globalStore.connectors.get(req.params.id);
  if (!connector) {
    return res.status(404).json({ error: 'Connector not found' });
  }
  connector.status = 'ACTIVE';
  connector.consecutiveFailures = 0;
  res.json({ data: connector, message: 'Circuit breaker reset to ACTIVE' });
});

apiRouter.get('/cases/:id/articles', (req, res) => {
  const kycCase = resolveCase(req.params.id);
  const targetId = kycCase ? kycCase.id : req.params.id;
  const caseRuns = Array.from(globalStore.screeningRuns.values()).filter((r) => r.caseId === targetId);
  const articles = caseRuns.flatMap((r) => r.articles);
  res.json({ data: articles });
});

apiRouter.get('/cases/:id/runs', (req, res) => {
  const kycCase = resolveCase(req.params.id);
  const targetId = kycCase ? kycCase.id : req.params.id;
  const runs = Array.from(globalStore.screeningRuns.values()).filter((r) => r.caseId === targetId);
  res.json({ data: runs });
});

// ----------------------------------------------------
// Work Queues & Monitoring
// ----------------------------------------------------
apiRouter.get('/work-items', (req, res) => {
  const actor = getActor(req);
  const { queue } = req.query;
  let items = Array.from(globalStore.workItems.values());

  if (queue === 'assigned') {
    items = items.filter((w) => w.assignedTo === actor.id);
  } else if (queue === 'unassigned') {
    items = items.filter((w) => !w.assignedTo);
  } else if (queue === 'awaiting_review') {
    items = items.filter((w) => w.type === 'CHECKER_REVIEW' || w.type === 'EXEMPTION_REQUEST');
  } else if (queue === 'escalated') {
    items = items.filter((w) => w.riskLevel === 'HIGH' || w.priority === 'URGENT');
  } else if (queue === 'failed_connector') {
    items = items.filter((w) => w.type === 'FAILED_CONNECTOR');
  }

  res.json({ data: items, count: items.length });
});

apiRouter.get('/work-items/summary', (req, res) => {
  const actor = getActor(req);
  const all = Array.from(globalStore.workItems.values());
  res.json({
    assignedToMe: all.filter((w) => w.assignedTo === actor.id).length,
    unassigned: all.filter((w) => !w.assignedTo).length,
    awaitingReview: all.filter((w) => w.type === 'CHECKER_REVIEW' || w.type === 'EXEMPTION_REQUEST').length,
    escalated: all.filter((w) => w.riskLevel === 'HIGH').length,
    failedConnectors: all.filter((w) => w.type === 'FAILED_CONNECTOR').length,
  });
});

// ----------------------------------------------------
// AM-07: Multilingual Query Preview Endpoint
// ----------------------------------------------------
apiRouter.post('/screening/query-preview', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'case:view')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot preview queries` });
  }

  const { subjectId, targetLanguages, eventCategories } = req.body;
  const subject = globalStore.subjects.get(subjectId);
  if (!subject) {
    return res.status(404).json({ error: `Subject ${subjectId} not found` });
  }

  const variants = queryExpansionService.expandMultilingualQueries({
    runId: 'preview-run',
    subject,
    targetLanguages: targetLanguages || ['en', 'ar', 'hi', 'ml', 'es', 'ru'],
    eventCategories: eventCategories || ['BRIBERY_CORRUPTION', 'FINANCIAL_CRIME_FRAUD', 'SANCTIONS_EVASION', 'COURT_RECORDS'],
  });

  res.json({
    subjectId,
    subjectName: subject.primaryName,
    variantsCount: variants.length,
    variants,
  });
});

// ----------------------------------------------------
// AM-08: Immutable Search Manifests & Audit Records
// ----------------------------------------------------
apiRouter.get('/manifests/:id', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'manifest:view')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot view manifests` });
  }

  const manifest = globalStore.searchManifests.get(req.params.id);
  if (!manifest) {
    return res.status(404).json({ error: `Manifest ${req.params.id} not found` });
  }

  res.json({ data: manifest });
});

apiRouter.get('/cases/:caseId/manifests', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'manifest:view')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot view manifests` });
  }

  const caseObj = resolveCase(req.params.caseId);
  if (!caseObj) {
    return res.status(404).json({ error: `Case ${req.params.caseId} not found` });
  }

  const manifests = Array.from(globalStore.searchManifests.values()).filter(
    (m) => m.caseId === caseObj.id
  );

  res.json({ data: manifests, count: manifests.length });
});

apiRouter.post('/manifests/:id/revisions', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'manifest:revise')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot revise manifests` });
  }

  const manifest = globalStore.searchManifests.get(req.params.id);
  if (!manifest) {
    return res.status(404).json({ error: `Manifest ${req.params.id} not found` });
  }

  const { changeReason, deltaSummary } = req.body;
  if (!changeReason || !deltaSummary) {
    return res.status(400).json({ error: 'changeReason and deltaSummary are required to revise manifest' });
  }

  const result = searchManifestEngine.addRevision({
    manifest,
    actor,
    changeReason,
    deltaSummary,
  });

  globalStore.searchManifests.set(manifest.id, result.manifest);

  globalStore.recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'MANIFEST_REVISED',
    entityType: 'SEARCH_MANIFEST',
    entityId: manifest.id,
    correlationId: manifest.correlationId,
    details: `Appended revision #${result.revision.revisionNumber} to sealed manifest: ${changeReason}. ${deltaSummary}`,
  });

  res.json({ data: result.manifest, newRevision: result.revision });
});

// ----------------------------------------------------
// AM-09 & AM-11: Articles & Retrieval Provenance
// ----------------------------------------------------
apiRouter.get('/articles', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'case:view')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot view articles` });
  }

  const { caseId, subjectId, language, severity, accessStatus, eventCategory, search, assessment } = req.query;
  let list = Array.from(globalStore.articles.values());

  if (caseId && typeof caseId === 'string') {
    const caseObj = resolveCase(caseId);
    if (caseObj) {
      list = list.filter((a) => a.caseId === caseObj.id);
    }
  }

  if (subjectId && typeof subjectId === 'string') {
    list = list.filter((a) => a.subjectId === subjectId);
  }

  if (language && typeof language === 'string') {
    const langs = language.split(',');
    list = list.filter((a) => langs.includes(a.language));
  }

  if (severity && typeof severity === 'string') {
    const sevs = severity.split(',');
    list = list.filter((a) => sevs.includes(a.severity));
  }

  if (accessStatus && typeof accessStatus === 'string') {
    const accs = accessStatus.split(',');
    list = list.filter((a) => accs.includes(a.accessStatus));
  }

  if (assessment && typeof assessment === 'string') {
    const assesses = assessment.split(',');
    list = list.filter((a) => assesses.includes(a.identityAssessment));
  }

  if (eventCategory && typeof eventCategory === 'string') {
    const cats = eventCategory.split(',');
    list = list.filter((a) => a.metadata.normalizedMetadata.eventCategories.some((c) => cats.includes(c)));
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.publisher.toLowerCase().includes(q) ||
        (a.author && a.author.toLowerCase().includes(q)) ||
        a.domain.toLowerCase().includes(q)
    );
  }

  res.json({ data: list, count: list.length });
});

apiRouter.get('/articles/:id', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'case:view')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot view articles` });
  }

  const article = globalStore.articles.get(req.params.id);
  if (!article) {
    return res.status(404).json({ error: `Article ${req.params.id} not found` });
  }

  res.json({ data: article });
});

apiRouter.get('/articles/:id/retrieval-record', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'manifest:view')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot view retrieval records` });
  }

  const article = globalStore.articles.get(req.params.id);
  if (!article || !article.retrievalRecordId) {
    return res.status(404).json({ error: `Retrieval record for article ${req.params.id} not found` });
  }

  const record = globalStore.retrievalRecords.get(article.retrievalRecordId);
  res.json({ data: record });
});

apiRouter.patch('/articles/:id/review', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'case:edit')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot review or adjudicate articles` });
  }

  const article = globalStore.articles.get(req.params.id);
  if (!article) {
    return res.status(404).json({ error: `Article ${req.params.id} not found` });
  }

  const { identityAssessment, legalStatus, notes } = req.body;
  if (identityAssessment) {
    article.identityAssessment = identityAssessment;
  }
  if (legalStatus) {
    article.legalStatus = legalStatus;
  }
  if (notes) {
    article.materiality = notes;
  }
  article.updatedAt = new Date().toISOString();

  globalStore.articles.set(article.id, article);

  globalStore.recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'ARTICLE_ADJUDICATED',
    entityType: 'ARTICLE',
    entityId: article.id,
    correlationId: article.screeningRunId || 'audit-corr',
    details: `Adjudicated finding "${article.title.slice(0, 40)}..." as ${identityAssessment || 'UPDATED'}. Notes: ${notes || 'None'}`,
  });

  res.json({ data: article });
});

// ----------------------------------------------------
// AM-10: Historical Period Policies & Authorized Exceptions
// ----------------------------------------------------
apiRouter.get('/historical-period/rules', (req, res) => {
  res.json({ data: globalStore.historicalRules });
});

apiRouter.post('/historical-period/resolve', (req, res) => {
  const { clientType, subjectRole, riskLevel, jurisdiction, reviewType, subjectId } = req.body;
  const existingException = subjectId ? globalStore.historicalExceptions.get(subjectId) : undefined;

  const resolution = historicalPeriodEngine.resolveLookbackPeriod({
    clientType: clientType || 'CORPORATE',
    subjectRole: subjectRole || 'PRIMARY_CUSTOMER',
    riskLevel: riskLevel || 'HIGH',
    jurisdiction: jurisdiction || 'GB',
    reviewType: reviewType || 'PERIODIC',
    policyVersion: '2.4.0',
    authorizedException: existingException,
  });

  res.json({ data: resolution });
});

apiRouter.post('/historical-period/exceptions', (req, res) => {
  const actor = getActor(req);
  const { action, subjectId, originalMonths, overrideMonths, justification, exceptionId } = req.body;

  if (action === 'REQUEST') {
    if (!hasPermission(actor.role, 'historical_exception:request')) {
      return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot request historical exceptions` });
    }

    const exceptionRecord = {
      id: `hex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      subjectId,
      originalMonths: Number(originalMonths) || 60,
      overrideMonths: Number(overrideMonths) || 120,
      justification: justification || 'Regulatory EDD inquiry requires lookback expansion',
      requestedBy: actor.id,
      requestedByName: actor.name,
      requestedAt: new Date().toISOString(),
      status: 'PENDING',
    };

    globalStore.historicalExceptions.set(subjectId, exceptionRecord);

    globalStore.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'HISTORICAL_EXCEPTION_REQUESTED',
      entityType: 'HISTORICAL_PERIOD',
      entityId: exceptionRecord.id,
      correlationId: subjectId,
      details: `Requested historical lookback override from ${originalMonths}m to ${overrideMonths}m for subject ${subjectId}: "${justification}".`,
    });

    return res.status(201).json({ data: exceptionRecord });
  }

  if (action === 'APPROVE') {
    if (!hasPermission(actor.role, 'historical_exception:approve')) {
      return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot approve historical exceptions (4-eyes segregation required)` });
    }

    const existing = globalStore.historicalExceptions.get(subjectId);
    if (!existing) {
      return res.status(404).json({ error: `No pending exception for subject ${subjectId}` });
    }

    // Segregation of Duties: Requestor cannot approve their own exception
    if (existing.requestedBy === actor.id) {
      return res.status(400).json({
        error: 'Segregation of duties violation: The requesting analyst cannot approve their own historical exception.',
      });
    }

    existing.status = 'APPROVED';
    existing.approvedBy = actor.id;
    existing.approvedByName = actor.name;
    existing.approvedAt = new Date().toISOString();

    globalStore.historicalExceptions.set(subjectId, existing);

    globalStore.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'HISTORICAL_EXCEPTION_APPROVED',
      entityType: 'HISTORICAL_PERIOD',
      entityId: existing.id,
      correlationId: subjectId,
      details: `Approved historical lookback override of ${existing.overrideMonths}m requested by ${existing.requestedByName}.`,
    });

    return res.json({ data: existing });
  }

  res.status(400).json({ error: 'Invalid action. Must be REQUEST or APPROVE' });
});

// ----------------------------------------------------
// AM-11: Saved Views Service
// ----------------------------------------------------
apiRouter.get('/saved-views', (req, res) => {
  const views = Array.from(globalStore.savedViews.values());
  res.json({ data: views });
});

apiRouter.post('/saved-views', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'saved_view:manage')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot manage saved views` });
  }

  const saved = savedViewsService.saveView({
    ...req.body,
    ownerId: actor.id,
  });

  globalStore.savedViews.set(saved.id, saved);
  res.status(201).json({ data: saved });
});

apiRouter.delete('/saved-views/:id', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'saved_view:manage')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot delete saved views` });
  }

  const success = savedViewsService.deleteView(req.params.id);
  if (!success) {
    return res.status(400).json({ error: 'Cannot delete default system views or view not found' });
  }

  globalStore.savedViews.delete(req.params.id);
  res.json({ success: true, message: `View ${req.params.id} removed` });
});

// ----------------------------------------------------
// Audit Trail
// ----------------------------------------------------
apiRouter.get('/audit-events', (req, res) => {
  const { caseReference, entityType } = req.query;
  let events = globalStore.auditEvents;

  if (caseReference && typeof caseReference === 'string') {
    events = events.filter((e) => e.caseReference === caseReference);
  }
  if (entityType && typeof entityType === 'string') {
    events = events.filter((e) => e.entityType === entityType);
  }

  res.json({ data: events.slice(0, 50), total: events.length });
});

// ====================================================
// AM-16 to AM-20: Event Clustering & Timeline Endpoints
// ====================================================

// 1. List Adverse Events
apiRouter.get('/events', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:view')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot view events` });
  }

  const { caseId, category, status, legalStatus, search } = req.query;
  let events = Array.from(globalStore.adverseEvents.values());

  if (caseId && typeof caseId === 'string') {
    events = events.filter((e) => e.caseId === caseId);
  }
  if (category && typeof category === 'string') {
    events = events.filter((e) => e.primaryCategory === category || e.categories.includes(category as any));
  }
  if (status && typeof status === 'string') {
    events = events.filter((e) => e.reviewStatus === status);
  }
  if (legalStatus && typeof legalStatus === 'string') {
    events = events.filter((e) => e.legalStatus === legalStatus);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    events = events.filter(
      (e) =>
        e.eventTitle.toLowerCase().includes(q) ||
        e.eventSummary.toLowerCase().includes(q) ||
        e.jurisdiction.toLowerCase().includes(q)
    );
  }

  // Sort by updatedAt descending
  events.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  res.json({ data: events, total: events.length });
});

// 2. Get Adverse Event Details
apiRouter.get('/events/:id', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:view')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot view events` });
  }

  const event = globalStore.adverseEvents.get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: `Event ${req.params.id} not found` });
  }

  res.json({ data: event });
});

// 3. Create Adverse Event
apiRouter.post('/events', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:edit')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot create events` });
  }

  const {
    caseId,
    eventTitle,
    eventSummary,
    primaryCategory,
    categories,
    legalStatus,
    jurisdiction,
    investigatingAuthorities,
    dateRange,
    subjects,
    articles,
    timeline,
    primaryNextAction,
  } = req.body;

  if (!caseId || !eventTitle || !primaryCategory || !jurisdiction) {
    return res.status(400).json({ error: 'Missing mandatory fields: caseId, eventTitle, primaryCategory, jurisdiction' });
  }

  const newEvent = createAdverseEventRecord({
    caseId,
    eventTitle,
    eventSummary: eventSummary || '',
    primaryCategory,
    categories: categories || [primaryCategory],
    legalStatus: legalStatus || 'NOT_ASSESSED',
    jurisdiction,
    investigatingAuthorities: investigatingAuthorities || [],
    dateRange: dateRange || { startDate: null, endDate: null, isOngoing: false, confidence: 'UNKNOWN' },
    subjects: subjects || [],
    articles: articles || [],
    timeline: timeline || [],
    primaryNextAction,
    actor,
  });

  globalStore.adverseEvents.set(newEvent.id, newEvent);

  globalStore.recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'EVENT_CREATED',
    entityType: 'ADVERSE_EVENT',
    entityId: newEvent.id,
    details: `Created new adverse event "${newEvent.eventTitle}" in jurisdiction ${newEvent.jurisdiction} with ${newEvent.articles.length} evidentiary articles.`,
  });

  res.status(201).json({ data: newEvent });
});

// 4. Update Adverse Event Metadata / Review Status (Confirm / Dismiss)
apiRouter.patch('/events/:id', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:edit')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot edit events` });
  }

  const event = globalStore.adverseEvents.get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: `Event ${req.params.id} not found` });
  }

  const {
    eventTitle,
    eventSummary,
    primaryCategory,
    categories,
    legalStatus,
    jurisdiction,
    investigatingAuthorities,
    dateRange,
    reviewStatus,
    primaryNextAction,
  } = req.body;

  const previousSnapshot = { ...event };
  const changeSummaries: string[] = [];

  if (eventTitle && eventTitle !== event.eventTitle) {
    changeSummaries.push(`Title changed to "${eventTitle}"`);
    event.eventTitle = eventTitle;
  }
  if (eventSummary !== undefined) {
    event.eventSummary = eventSummary;
  }
  if (primaryCategory && primaryCategory !== event.primaryCategory) {
    changeSummaries.push(`Primary category updated to ${primaryCategory}`);
    event.primaryCategory = primaryCategory;
  }
  if (categories) event.categories = categories;
  if (legalStatus && legalStatus !== event.legalStatus) {
    changeSummaries.push(`Legal status updated to ${legalStatus}`);
    event.legalStatus = legalStatus;
  }
  if (jurisdiction && jurisdiction !== event.jurisdiction) {
    changeSummaries.push(`Jurisdiction updated to ${jurisdiction}`);
    event.jurisdiction = jurisdiction;
  }
  if (investigatingAuthorities) event.investigatingAuthorities = investigatingAuthorities;
  if (dateRange) event.dateRange = dateRange;
  if (primaryNextAction) event.primaryNextAction = primaryNextAction;

  if (reviewStatus && reviewStatus !== event.reviewStatus) {
    changeSummaries.push(`Review status updated from ${event.reviewStatus} to ${reviewStatus}`);
    event.reviewStatus = reviewStatus;
    if (reviewStatus === 'CONFIRMED') {
      event.confirmedBy = actor.id;
      event.confirmedByName = actor.name;
      event.confirmedAt = new Date().toISOString();
    }
  }

  event.updatedAt = new Date().toISOString();

  const revision: EventRevision = {
    id: `rev-${event.id}-${event.revisions.length + 1}`,
    eventId: event.id,
    revisionNumber: event.revisions.length + 1,
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    changeType: reviewStatus === 'CONFIRMED' ? 'CONFIRMED' : 'METADATA_UPDATED',
    changeSummary: changeSummaries.length ? changeSummaries.join('; ') : 'Updated event attributes',
    previousSnapshot,
  };

  event.revisions.push(revision);
  globalStore.adverseEvents.set(event.id, event);

  globalStore.recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: reviewStatus === 'CONFIRMED' ? 'EVENT_CONFIRMED' : 'EVENT_UPDATED',
    entityType: 'ADVERSE_EVENT',
    entityId: event.id,
    details: revision.changeSummary,
  });

  res.json({ data: event, revision });
});

// 5. Merge Two Events (Reversible)
apiRouter.post('/events/merge', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:merge_split')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot merge events` });
  }

  const { primaryEventId, secondaryEventId, rationale } = req.body;
  if (!primaryEventId || !secondaryEventId || !rationale) {
    return res.status(400).json({ error: 'Missing primaryEventId, secondaryEventId, or rationale' });
  }

  const primary = globalStore.adverseEvents.get(primaryEventId);
  const secondary = globalStore.adverseEvents.get(secondaryEventId);

  if (!primary || !secondary) {
    return res.status(404).json({ error: 'Primary or secondary event not found' });
  }

  const { updatedPrimary, archivedSecondary, operation } = executeMergeEvents(primary, secondary, actor, rationale);

  globalStore.adverseEvents.set(updatedPrimary.id, updatedPrimary);
  globalStore.adverseEvents.set(archivedSecondary.id, archivedSecondary);
  globalStore.eventOperations.set(operation.id, operation);

  globalStore.recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'EVENTS_MERGED',
    entityType: 'ADVERSE_EVENT',
    entityId: updatedPrimary.id,
    details: `Merged event "${secondary.eventTitle}" (${secondary.id}) into "${primary.eventTitle}" (${primary.id}). Rationale: ${rationale}. Reversible operation ID: ${operation.id}`,
  });

  res.json({ data: updatedPrimary, archivedEvent: archivedSecondary, operation });
});

// 6. Split Event Articles into New Event (Reversible)
apiRouter.post('/events/split', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:merge_split')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot split events` });
  }

  const { sourceEventId, splitArticleIds, newEventTitle, rationale } = req.body;
  if (!sourceEventId || !Array.isArray(splitArticleIds) || !splitArticleIds.length || !newEventTitle || !rationale) {
    return res.status(400).json({ error: 'Missing sourceEventId, splitArticleIds, newEventTitle, or rationale' });
  }

  const sourceEvent = globalStore.adverseEvents.get(sourceEventId);
  if (!sourceEvent) {
    return res.status(404).json({ error: `Source event ${sourceEventId} not found` });
  }

  const { updatedSource, newEvent, operation } = executeSplitEvent(sourceEvent, splitArticleIds, newEventTitle, actor, rationale);

  globalStore.adverseEvents.set(updatedSource.id, updatedSource);
  globalStore.adverseEvents.set(newEvent.id, newEvent);
  globalStore.eventOperations.set(operation.id, operation);

  globalStore.recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'EVENT_SPLIT',
    entityType: 'ADVERSE_EVENT',
    entityId: newEvent.id,
    details: `Split ${splitArticleIds.length} articles from "${sourceEvent.eventTitle}" into new event "${newEvent.eventTitle}". Rationale: ${rationale}. Reversible operation ID: ${operation.id}`,
  });

  res.json({ data: updatedSource, newEvent, operation });
});

// 7. Reassign Article between Events
apiRouter.post('/events/reassign-article', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:edit')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot reassign articles` });
  }

  const { articleId, fromEventId, toEventId, rationale } = req.body;
  if (!articleId || !fromEventId || !toEventId || !rationale) {
    return res.status(400).json({ error: 'Missing articleId, fromEventId, toEventId, or rationale' });
  }

  const fromEvent = globalStore.adverseEvents.get(fromEventId);
  const toEvent = globalStore.adverseEvents.get(toEventId);

  if (!fromEvent || !toEvent) {
    return res.status(404).json({ error: 'Source or target event not found' });
  }

  const articleItem = fromEvent.articles.find((a) => a.articleId === articleId);
  if (!articleItem) {
    return res.status(404).json({ error: `Article ${articleId} not found in source event ${fromEventId}` });
  }

  // Remove from source event
  fromEvent.articles = fromEvent.articles.filter((a) => a.articleId !== articleId);
  fromEvent.sourceCount = fromEvent.articles.length;
  fromEvent.independentSourceCount = Math.max(1, fromEvent.articles.filter((a) => a.isIndependent).length);
  fromEvent.updatedAt = new Date().toISOString();

  // Add to target event
  toEvent.articles.push(articleItem);
  toEvent.sourceCount = toEvent.articles.length;
  toEvent.independentSourceCount = Math.max(1, toEvent.articles.filter((a) => a.isIndependent).length);
  toEvent.updatedAt = new Date().toISOString();

  const operation: ReassignmentOperation = {
    id: `op-reassign-${Date.now()}`,
    operationType: 'REASSIGNMENT',
    articleId,
    fromEventId,
    toEventId,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    timestamp: new Date().toISOString(),
    rationale,
  };

  fromEvent.revisions.push({
    id: `rev-${fromEvent.id}-${fromEvent.revisions.length + 1}`,
    eventId: fromEvent.id,
    revisionNumber: fromEvent.revisions.length + 1,
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    changeType: 'ARTICLE_REMOVED',
    changeSummary: `Reassigned article ${articleId} to event "${toEvent.eventTitle}". Reason: ${rationale}`,
  });

  toEvent.revisions.push({
    id: `rev-${toEvent.id}-${toEvent.revisions.length + 1}`,
    eventId: toEvent.id,
    revisionNumber: toEvent.revisions.length + 1,
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    changeType: 'ARTICLE_ADDED',
    changeSummary: `Received reassigned article ${articleId} from event "${fromEvent.eventTitle}". Reason: ${rationale}`,
  });

  globalStore.adverseEvents.set(fromEvent.id, fromEvent);
  globalStore.adverseEvents.set(toEvent.id, toEvent);
  globalStore.eventOperations.set(operation.id, operation);

  globalStore.recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'ARTICLE_REASSIGNED',
    entityType: 'ADVERSE_EVENT',
    entityId: toEvent.id,
    details: `Reassigned article ${articleId} from "${fromEvent.eventTitle}" to "${toEvent.eventTitle}". Rationale: ${rationale}`,
  });

  res.json({ fromEvent, toEvent, operation });
});

// 8. Add Timeline Entry (AM-20)
apiRouter.post('/events/:id/timeline', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'timeline:edit')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot edit timeline` });
  }

  const event = globalStore.adverseEvents.get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: `Event ${req.params.id} not found` });
  }

  const {
    entryType,
    date,
    dateConfidence,
    title,
    description,
    evidenceArticleId,
    evidenceArticleTitle,
    evidenceSnippet,
    unverified,
    unverifiedReason,
    jurisdiction,
    authority,
  } = req.body;

  if (!entryType || !title || !description) {
    return res.status(400).json({ error: 'Missing entryType, title, or description' });
  }

  const newEntry: TimelineEntry = {
    id: `tle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    eventId: event.id,
    entryType,
    date: date || null,
    dateConfidence: dateConfidence || (date ? 'VERIFIED' : 'UNKNOWN'),
    title,
    description,
    evidenceArticleId,
    evidenceArticleTitle,
    evidenceSnippet,
    unverified: Boolean(unverified),
    unverifiedReason,
    jurisdiction: jurisdiction || event.jurisdiction,
    authority,
    sequenceOrder: event.timeline.length + 1,
  };

  event.timeline.push(newEntry);
  // Sort timeline chronologically
  event.timeline.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  event.updatedAt = new Date().toISOString();
  event.revisions.push({
    id: `rev-${event.id}-${event.revisions.length + 1}`,
    eventId: event.id,
    revisionNumber: event.revisions.length + 1,
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    changeType: 'TIMELINE_MODIFIED',
    changeSummary: `Added ${newEntry.entryType} entry: "${newEntry.title}" (${newEntry.date || 'No Date'}). Linked to evidence: ${newEntry.evidenceArticleTitle || 'None'}.`,
  });

  globalStore.adverseEvents.set(event.id, event);

  globalStore.recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'TIMELINE_ENTRY_ADDED',
    entityType: 'ADVERSE_EVENT',
    entityId: event.id,
    details: `Added timeline entry "${newEntry.title}" of type ${newEntry.entryType}`,
  });

  res.status(201).json({ data: newEntry, event });
});

// 9. Update Timeline Entry (AM-20)
apiRouter.patch('/events/:id/timeline/:entryId', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'timeline:edit')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot edit timeline` });
  }

  const event = globalStore.adverseEvents.get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: `Event ${req.params.id} not found` });
  }

  const entry = event.timeline.find((t) => t.id === req.params.entryId);
  if (!entry) {
    return res.status(404).json({ error: `Timeline entry ${req.params.entryId} not found` });
  }

  const { title, description, entryType, date, dateConfidence, unverified, unverifiedReason, authority, evidenceSnippet } = req.body;

  if (title) entry.title = title;
  if (description) entry.description = description;
  if (entryType) entry.entryType = entryType;
  if (date !== undefined) entry.date = date;
  if (dateConfidence) entry.dateConfidence = dateConfidence;
  if (unverified !== undefined) entry.unverified = unverified;
  if (unverifiedReason !== undefined) entry.unverifiedReason = unverifiedReason;
  if (authority !== undefined) entry.authority = authority;
  if (evidenceSnippet !== undefined) entry.evidenceSnippet = evidenceSnippet;

  event.updatedAt = new Date().toISOString();
  event.revisions.push({
    id: `rev-${event.id}-${event.revisions.length + 1}`,
    eventId: event.id,
    revisionNumber: event.revisions.length + 1,
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    changeType: 'TIMELINE_MODIFIED',
    changeSummary: `Updated timeline entry "${entry.title}" (${entry.id}).`,
  });

  globalStore.adverseEvents.set(event.id, event);

  globalStore.recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'TIMELINE_ENTRY_UPDATED',
    entityType: 'ADVERSE_EVENT',
    entityId: event.id,
    details: `Updated timeline entry ${entry.id}`,
  });

  res.json({ data: entry, event });
});

// 10. Delete Timeline Entry (AM-20)
apiRouter.delete('/events/:id/timeline/:entryId', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'timeline:edit')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot edit timeline` });
  }

  const event = globalStore.adverseEvents.get(req.params.id);
  if (!event) {
    return res.status(404).json({ error: `Event ${req.params.id} not found` });
  }

  const deletedEntry = event.timeline.find((t) => t.id === req.params.entryId);
  if (!deletedEntry) {
    return res.status(404).json({ error: `Timeline entry ${req.params.entryId} not found` });
  }

  event.timeline = event.timeline.filter((t) => t.id !== req.params.entryId);
  event.updatedAt = new Date().toISOString();
  event.revisions.push({
    id: `rev-${event.id}-${event.revisions.length + 1}`,
    eventId: event.id,
    revisionNumber: event.revisions.length + 1,
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    changeType: 'TIMELINE_MODIFIED',
    changeSummary: `Deleted timeline entry "${deletedEntry.title}" (${deletedEntry.id}).`,
  });

  globalStore.adverseEvents.set(event.id, event);

  globalStore.recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'TIMELINE_ENTRY_DELETED',
    entityType: 'ADVERSE_EVENT',
    entityId: event.id,
    details: `Removed timeline entry ${deletedEntry.id}`,
  });

  res.json({ success: true, deletedEntryId: req.params.entryId });
});

// 11. List Duplicate Assessments (AM-16)
apiRouter.get('/duplicates', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:view')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot view duplicates` });
  }

  const dups = Array.from(globalStore.duplicateAssessments.values());
  res.json({ data: dups, total: dups.length });
});

// 12. Human Adjudication of Duplicate Assessment (AM-16 - Reversible)
apiRouter.post('/duplicates/override', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:edit')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot adjudicate duplicates` });
  }

  const { assessmentId, status, rationale } = req.body;
  if (!assessmentId || !status || !rationale) {
    return res.status(400).json({ error: 'Missing assessmentId, status, or rationale' });
  }

  const assessment = globalStore.duplicateAssessments.get(assessmentId);
  if (!assessment) {
    return res.status(404).json({ error: `Duplicate assessment ${assessmentId} not found` });
  }

  assessment.status = status;
  assessment.adjudicatedBy = actor.id;
  assessment.adjudicatedByName = actor.name;
  assessment.adjudicatedAt = new Date().toISOString();
  assessment.rationale = rationale;

  globalStore.duplicateAssessments.set(assessment.id, assessment);

  globalStore.recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'DUPLICATE_ADJUDICATED',
    entityType: 'ARTICLE',
    entityId: assessment.articleId,
    details: `Human investigator adjudicated duplicate relationship to status ${status}. Rationale: ${rationale}`,
  });

  res.json({ data: assessment });
});

// 13. List Syndication Clusters (AM-17)
apiRouter.get('/clusters', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:view')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot view clusters` });
  }

  const clusters = Array.from(globalStore.articleClusters.values());
  res.json({ data: clusters, total: clusters.length });
});

// 14. List Source Roles (AM-18)
apiRouter.get('/source-roles', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:view')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot view source roles` });
  }

  const roles = Array.from(globalStore.sourceRoleAssessments.values());
  res.json({ data: roles, total: roles.length });
});

// 15. Human Override of Source Role (AM-18)
apiRouter.post('/source-roles/:articleId/override', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:edit')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot edit source roles` });
  }

  const { assignedRole, rationale } = req.body;
  if (!assignedRole || !rationale) {
    return res.status(400).json({ error: 'Missing assignedRole or rationale' });
  }

  let assessment = globalStore.sourceRoleAssessments.get(req.params.articleId);
  if (!assessment) {
    assessment = {
      articleId: req.params.articleId,
      assignedRole,
      confidence: 1.0,
      rationales: [rationale],
      attributionDetected: false,
      publicationTimeRank: 1,
      uncertaintyLevel: 'LOW',
      humanReviewed: true,
      reviewedBy: actor.id,
      reviewedByName: actor.name,
      reviewedAt: new Date().toISOString(),
    };
  } else {
    assessment.assignedRole = assignedRole;
    assessment.confidence = 1.0;
    assessment.rationales.push(`[Human Override by ${actor.name}]: ${rationale}`);
    assessment.humanReviewed = true;
    assessment.reviewedBy = actor.id;
    assessment.reviewedByName = actor.name;
    assessment.reviewedAt = new Date().toISOString();
  }

  globalStore.sourceRoleAssessments.set(req.params.articleId, assessment);

  // Update in all events where this article appears and recompute independent count!
  for (const event of globalStore.adverseEvents.values()) {
    const artItem = event.articles.find((a) => a.articleId === req.params.articleId);
    if (artItem) {
      artItem.sourceRole = assignedRole;
      artItem.isOriginal = assignedRole === 'ORIGINAL' || assignedRole === 'LIKELY_ORIGINAL';
      artItem.isIndependent =
        assignedRole === 'ORIGINAL' ||
        assignedRole === 'LIKELY_ORIGINAL' ||
        assignedRole === 'INDEPENDENT_CORROBORATION';
      
      event.independentSourceCount = Math.max(1, event.articles.filter((a) => a.isIndependent).length);
      event.updatedAt = new Date().toISOString();
      event.revisions.push({
        id: `rev-${event.id}-${event.revisions.length + 1}`,
        eventId: event.id,
        revisionNumber: event.revisions.length + 1,
        timestamp: new Date().toISOString(),
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        changeType: 'SOURCE_ROLE_UPDATED',
        changeSummary: `Source role for article ${req.params.articleId} overridden to ${assignedRole}. Independent sources recalculated to ${event.independentSourceCount}.`,
      });
      globalStore.adverseEvents.set(event.id, event);
    }
  }

  globalStore.recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'SOURCE_ROLE_OVERRIDDEN',
    entityType: 'ARTICLE',
    entityId: req.params.articleId,
    details: `Overrode source role to ${assignedRole}. Rationale: ${rationale}`,
  });

  res.json({ data: assessment });
});

// 16. Re-cluster Events (AM-17 & AM-19)
apiRouter.post('/recluster', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:recluster')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot recluster events` });
  }

  const { caseId } = req.body;
  const allArticles = Array.from(globalStore.articles.values());
  const dupsList = Array.from(globalStore.duplicateAssessments.values());

  const clusters = buildSyndicationClusters(caseId || 'case-sample-01', allArticles, dupsList, globalStore.sourceRoleAssessments);
  clusters.forEach((c) => globalStore.articleClusters.set(c.id, c));

  globalStore.recordAudit({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action: 'CLUSTERS_REGENERATED',
    entityType: 'CASE',
    entityId: caseId || 'case-sample-01',
    details: `Triggered algorithmic re-clustering across ${allArticles.length} evidentiary articles resulting in ${clusters.length} clusters.`,
  });

  res.json({
    data: {
      clusterCount: clusters.length,
      clusters,
    },
  });
});

// ====================================================
// AM-21 through AM-27 Grounded Extraction & Review APIs
// ====================================================

// 1. Get or execute article extraction bundle (AM-21 through AM-27)
apiRouter.get('/articles/:id/extraction', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:view')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot view evidence extraction` });
  }

  const articleId = req.params.id;
  const article = globalStore.articles.get(articleId);
  if (!article) {
    return res.status(404).json({ error: `Article ${articleId} not found` });
  }

  try {
    const bundle = globalStore.getOrExtractBundle(articleId);
    const rawContent = globalStore.getArticleRawContent(articleId);
    const translation = globalStore.getArticleTranslation(articleId);

    res.json({
      data: {
        bundle,
        article,
        rawContent,
        translation,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Trigger re-extraction with custom parameters (AM-21 through AM-27)
apiRouter.post('/articles/:id/extract', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:edit')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot trigger extraction jobs` });
  }

  const articleId = req.params.id;
  const article = globalStore.articles.get(articleId);
  if (!article) {
    return res.status(404).json({ error: `Article ${articleId} not found` });
  }

  const { promptVersion, modelVersion } = req.body || {};

  try {
    const bundle = globalStore.getOrExtractBundle(articleId, {
      forceReExtract: true,
      promptVersion,
      modelVersion,
    });
    const rawContent = globalStore.getArticleRawContent(articleId);
    const translation = globalStore.getArticleTranslation(articleId);

    globalStore.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'ARTICLE_RE_EXTRACTED',
      entityType: 'ARTICLE',
      entityId: articleId,
      details: `Re-extracted grounded evidence using model ${modelVersion || 'gemini-2.5-pro-extract-hybrid'} and prompt ${promptVersion || 'prompt-aml-extract-v3.2'}. Validation: ${bundle.lastExtractionRun.status}.`,
    });

    res.json({
      data: {
        bundle,
        article,
        rawContent,
        translation,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get raw and translated content (AM-27, Split-Pane view)
apiRouter.get('/articles/:id/content', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:view')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot view article content` });
  }

  const articleId = req.params.id;
  const article = globalStore.articles.get(articleId);
  if (!article) {
    return res.status(404).json({ error: `Article ${articleId} not found` });
  }

  const rawContent = globalStore.getArticleRawContent(articleId);
  const translation = globalStore.getArticleTranslation(articleId);

  res.json({
    data: {
      articleId,
      language: article.language || 'en',
      isRTL: article.isRTL || false,
      rawContent,
      translation,
      contentLength: rawContent.length,
      versionNumber: article.currentVersion || 1,
    },
  });
});

// 4. Get citation-backed summary and claims (AM-21)
apiRouter.get('/articles/:id/summary', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:view')) {
    return res.status(403).json({ error: `Forbidden` });
  }

  const articleId = req.params.id;
  try {
    const bundle = globalStore.getOrExtractBundle(articleId);
    res.json({ data: bundle.summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get adverse-event classifications (AM-22)
apiRouter.get('/articles/:id/classifications', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:view')) {
    return res.status(403).json({ error: `Forbidden` });
  }

  const articleId = req.params.id;
  try {
    const bundle = globalStore.getOrExtractBundle(articleId);
    res.json({ data: bundle.classifications });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Get legal and procedural status assertion (AM-23)
apiRouter.get('/articles/:id/legal-status', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:view')) {
    return res.status(403).json({ error: `Forbidden` });
  }

  const articleId = req.params.id;
  try {
    const bundle = globalStore.getOrExtractBundle(articleId);
    res.json({ data: bundle.legalStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Adjudicate / transition legal status assertion (AM-23)
apiRouter.post('/articles/:id/legal-status', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:edit')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot update legal status` });
  }

  const articleId = req.params.id;
  const { newStatus, rationale, authority, jurisdiction, evidencePassageIds } = req.body;

  if (!newStatus || !rationale) {
    return res.status(400).json({ error: 'newStatus and rationale are required.' });
  }

  try {
    const bundle = globalStore.getOrExtractBundle(articleId);
    const result = globalStore.applyCorrection(articleId, {
      targetType: 'LEGAL_STATUS',
      targetId: bundle.legalStatus?.id || `lgs-${articleId}`,
      operation: 'OVERRIDE',
      previousValue: bundle.legalStatus?.status,
      correctedValue: newStatus,
      rationale,
      actor,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    if (bundle.legalStatus) {
      if (authority) bundle.legalStatus.authority = authority;
      if (jurisdiction) bundle.legalStatus.jurisdiction = jurisdiction;
      if (evidencePassageIds) bundle.legalStatus.evidencePassageIds = evidencePassageIds;
    }

    res.json({ data: bundle.legalStatus, correction: result.correction });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Get extracted entities and participants (AM-24)
apiRouter.get('/articles/:id/entities', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:view')) {
    return res.status(403).json({ error: `Forbidden` });
  }

  const articleId = req.params.id;
  try {
    const bundle = globalStore.getOrExtractBundle(articleId);
    res.json({ data: bundle.entities });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Get disentangled jurisdictions and locations (AM-25)
apiRouter.get('/articles/:id/jurisdictions', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:view')) {
    return res.status(403).json({ error: `Forbidden` });
  }

  const articleId = req.params.id;
  try {
    const bundle = globalStore.getOrExtractBundle(articleId);
    res.json({ data: bundle.jurisdictions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Get material facts (AM-26)
apiRouter.get('/articles/:id/facts', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:view')) {
    return res.status(403).json({ error: `Forbidden` });
  }

  const articleId = req.params.id;
  try {
    const bundle = globalStore.getOrExtractBundle(articleId);
    res.json({ data: bundle.materialFacts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Get supporting evidence passages with exact character offsets (AM-27)
apiRouter.get('/articles/:id/passages', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:view')) {
    return res.status(403).json({ error: `Forbidden` });
  }

  const articleId = req.params.id;
  try {
    const bundle = globalStore.getOrExtractBundle(articleId);
    res.json({ data: bundle.passages });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Submit human correction on any extraction item (AM-21 through AM-27)
apiRouter.post('/articles/:id/corrections', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:edit')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot submit corrections` });
  }

  const articleId = req.params.id;
  const { targetType, targetId, operation, previousValue, correctedValue, rationale } = req.body;

  if (!targetType || !targetId || !operation || !rationale) {
    return res.status(400).json({
      error: 'targetType, targetId, operation, and rationale are mandatory for human corrections.',
    });
  }

  try {
    const result = globalStore.applyCorrection(articleId, {
      targetType,
      targetId,
      operation,
      previousValue,
      correctedValue,
      rationale,
      actor,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const bundle = globalStore.getOrExtractBundle(articleId);
    res.status(201).json({
      data: {
        correction: result.correction,
        bundle,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Revert human correction (AM-21 through AM-27)
apiRouter.post('/articles/:id/corrections/:correctionId/revert', (req, res) => {
  const actor = getActor(req);
  if (!hasPermission(actor.role, 'event:edit')) {
    return res.status(403).json({ error: `Forbidden: Role ${actor.role} cannot revert corrections` });
  }

  const { id: articleId, correctionId } = req.params;
  const { rationale } = req.body || {};

  if (!rationale) {
    return res.status(400).json({ error: 'A rationale is required to revert a correction.' });
  }

  try {
    const bundle = globalStore.getOrExtractBundle(articleId);
    const result = CorrectionWorkflowService.revertCorrection(bundle, correctionId, actor, rationale);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    globalStore.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'HUMAN_CORRECTION_REVERTED',
      entityType: 'ARTICLE',
      entityId: articleId,
      details: `Reverted correction ${correctionId}: ${rationale}`,
    });

    res.json({
      data: {
        success: true,
        bundle,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Query taxonomies (AM-22)
apiRouter.get('/taxonomies', (req, res) => {
  res.json({
    data: globalStore.taxonomyService.getAllVersions(),
    currentVersion: globalStore.taxonomyService.getCurrentVersion(),
  });
});

// ============================================================================
// STAGE 4: AM-28 to AM-37 EXPLAINABLE EVENT ASSESSMENT ENDPOINTS
// ============================================================================

// 1. Get or calculate explainable assessment for an event (AM-28 through AM-37)
apiRouter.get('/events/:id/assessment', (req, res) => {
  const actor = getActor(req);
  const eventId = req.params.id;
  try {
    const policyVersion = req.query.policyVersion as string | undefined;
    const assessment = globalStore.getOrCalculateEventAssessment(eventId, policyVersion, actor);
    res.json({ data: assessment });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// 2. Trigger deterministic recalculation with reason (AM-36)
apiRouter.post('/events/:id/assessment/recalculate', (req, res) => {
  const actor = getActor(req);
  const eventId = req.params.id;
  const { triggerReason, policyVersion } = req.body;
  try {
    const assessment = globalStore.recalculateEventAssessment(
      eventId,
      triggerReason || 'MANUAL_RECALCULATION',
      actor,
      policyVersion
    );
    res.json({ data: assessment });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Apply analyst or checker override with dual-authorization enforcement
apiRouter.post('/events/:id/assessment/override', (req, res) => {
  const actor = getActor(req);
  const eventId = req.params.id;
  const { field, overriddenValue, rationale } = req.body;
  if (!field || overriddenValue === undefined || !rationale) {
    return res.status(400).json({ error: 'field, overriddenValue, and rationale are required.' });
  }

  try {
    const result = globalStore.applyAssessmentOverride(eventId, {
      field,
      overriddenValue,
      rationale,
      actor,
    });
    res.json({ data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Secondary authorization for pending overrides (Checker / Compliance role)
apiRouter.post('/events/:id/assessment/override/authorize', (req, res) => {
  const actor = getActor(req);
  const eventId = req.params.id;
  const { overrideId, approved, notes } = req.body;
  if (!overrideId || approved === undefined) {
    return res.status(400).json({ error: 'overrideId and approved boolean are required.' });
  }

  try {
    const result = globalStore.authorizeAssessmentOverride(
      eventId,
      overrideId,
      actor,
      Boolean(approved),
      notes || 'Authorized per policy review.'
    );
    res.json({ data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Resolve contradictory / exculpatory evidence item (AM-37)
apiRouter.post('/events/:id/contradictions/:contradictionId/resolve', (req, res) => {
  const actor = getActor(req);
  const { id: eventId, contradictionId } = req.params;
  const { action, notes } = req.body;

  if (!action || !notes) {
    return res.status(400).json({ error: 'action and detailed compliance notes are required.' });
  }

  try {
    const resolved = globalStore.resolveContradiction(eventId, contradictionId, action, notes, actor);
    res.json({ data: resolved });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Ingest content update / retraction (AM-31)
apiRouter.post('/events/:id/content-updates', (req, res) => {
  const actor = getActor(req);
  const eventId = req.params.id;
  const { articleId, updateType, severity, originalTextSnippet, updatedTextSnippet, rationale } = req.body;

  if (!articleId || !updateType || !rationale) {
    return res.status(400).json({ error: 'articleId, updateType, and rationale are required.' });
  }

  try {
    const result = globalStore.ingestContentUpdate(
      {
        articleId,
        eventId,
        updateType,
        severity,
        originalTextSnippet,
        updatedTextSnippet,
        rationale,
        actorId: actor.id,
      },
      actor.id
    );
    res.json({ data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Historical policy replay (AM-36)
apiRouter.get('/events/:id/assessment/replay', (req, res) => {
  const eventId = req.params.id;
  const targetPolicyVersion = (req.query.targetPolicyVersion as string) || 'POL-MAT-2024.1';

  try {
    const replayResult = globalStore.replayHistoricalAssessment(eventId, targetPolicyVersion);
    res.json({ data: replayResult });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ====================================================
// AM-38 through AM-44: Unified Investigation Workflow Endpoints
// ====================================================

// 1. List Investigations & Work Queues (AM-38)
apiRouter.get('/investigations', (req, res) => {
  const actor = getActor(req);
  const queue = req.query.queue as string;
  const status = req.query.status as string;
  const priority = req.query.priority as string;
  const search = (req.query.search as string || '').toLowerCase();

  globalInvestigationStore.refreshQueueItems();
  let list = Array.from(globalInvestigationStore.investigations.values());

  if (queue) {
    const matchingQueueIds = new Set(
      Array.from(globalInvestigationStore.queueItems.values())
        .filter((q) => q.queueType === queue)
        .map((q) => q.investigationId)
    );
    list = list.filter((inv) => matchingQueueIds.has(inv.id));
  }

  if (status) {
    list = list.filter((inv) => inv.status === status);
  }

  if (priority) {
    list = list.filter((inv) => inv.priority === priority);
  }

  if (search) {
    list = list.filter(
      (inv) =>
        inv.subjectName.toLowerCase().includes(search) ||
        inv.caseReference.toLowerCase().includes(search) ||
        inv.summary.toLowerCase().includes(search)
    );
  }

  const queueSummary = {
    ANALYST_TRIAGE: Array.from(globalInvestigationStore.queueItems.values()).filter(
      (q) => q.queueType === 'ANALYST_TRIAGE'
    ).length,
    CHECKER_REVIEW: Array.from(globalInvestigationStore.queueItems.values()).filter(
      (q) => q.queueType === 'CHECKER_REVIEW'
    ).length,
    COMPLIANCE_ESCALATIONS: Array.from(globalInvestigationStore.queueItems.values()).filter(
      (q) => q.queueType === 'COMPLIANCE_ESCALATIONS'
    ).length,
    MLRO_ESCALATIONS: Array.from(globalInvestigationStore.queueItems.values()).filter(
      (q) => q.queueType === 'MLRO_ESCALATIONS'
    ).length,
    REWORK_QUEUE: Array.from(globalInvestigationStore.queueItems.values()).filter(
      (q) => q.queueType === 'REWORK_QUEUE'
    ).length,
  };

  res.json({
    data: list,
    queueItems: Array.from(globalInvestigationStore.queueItems.values()),
    queueSummary,
    actor,
  });
});

// 2. Full Hydrated Workspace Context (AM-38)
apiRouter.get('/investigations/:id/workspace', (req, res) => {
  const actor = getActor(req);
  const invId = req.params.id;
  const inv = globalInvestigationStore.investigations.get(invId);

  if (!inv) {
    return res.status(404).json({ error: `Investigation ${invId} not found.` });
  }

  const kycCase = globalStore.cases.get(inv.caseId);
  const subject = globalStore.subjects.get(inv.subjectId) || {
    id: inv.subjectId,
    caseId: inv.caseId,
    name: inv.subjectName,
    type: 'INDIVIDUAL',
    country: 'CH',
    riskScore: 82,
    screeningStatus: 'ALERT_ACTIVE',
    screeningObligations: [],
  };

  const caseEvents = Array.from(globalStore.adverseEvents.values()).filter((ev) => ev.caseId === inv.caseId);
  const assessments = caseEvents.map((ev) => globalStore.eventAssessments.get(ev.id)).filter(Boolean);
  const timeline = caseEvents.flatMap((ev) => ev.timeline || []);
  const tasks = globalInvestigationStore.taskService.getTasksForInvestigation(invId);
  const activeDraft = globalInvestigationStore.draftService.getDraft(invId, actor.id);
  const decisionLedger = globalInvestigationStore.decisionLedger.getFullAuditLedger(invId);
  const comments = globalInvestigationStore.comments.get(invId) || [];
  const overrides = globalInvestigationStore.decisionLedger.getOverrides(invId);
  const escalations = globalInvestigationStore.escalationEngine.getEscalationsForInvestigation(invId);
  const activeEscalation = escalations.find((e) => e.status === 'OPEN' || e.status === 'IN_REVIEW');

  // Compute permission-aware primary next action and validity
  let actionAvailability = {
    canSubmitDisposition: actor.role === 'ANALYST' && (inv.status === 'IN_PROGRESS' || inv.status === 'REWORK_REQUESTED'),
    dispositionDisabledReason:
      actor.role !== 'ANALYST'
        ? 'Only Analysts can author and submit structured dispositions.'
        : inv.status !== 'IN_PROGRESS' && inv.status !== 'REWORK_REQUESTED'
        ? `Investigation is currently in ${inv.status} state.`
        : null,

    canReview:
      (actor.role === 'CHECKER' || actor.role === 'COMPLIANCE_OFFICER') && inv.status === 'AWAITING_CHECKER',
    reviewDisabledReason:
      actor.role !== 'CHECKER' && actor.role !== 'COMPLIANCE_OFFICER'
        ? 'Four-Eyes Review requires Checker or Compliance Officer role.'
        : inv.status !== 'AWAITING_CHECKER'
        ? 'Investigation is not currently awaiting QA review.'
        : inv.currentAnalystConclusion?.submittedBy === actor.id
        ? 'Segregation of Duties Violation: You cannot review a disposition you authored (Maker != Checker).'
        : null,

    canEscalateCompliance:
      (actor.role === 'ANALYST' || actor.role === 'CHECKER' || actor.role === 'COMPLIANCE_OFFICER') &&
      inv.status !== 'COMPLETED' &&
      inv.status !== 'CLOSED',

    canAdjudicateCompliance:
      (actor.role === 'COMPLIANCE_OFFICER' || actor.role === 'MLRO') && inv.status === 'ESCALATED_COMPLIANCE',

    canExecuteMlro: actor.role === 'MLRO' && (inv.status === 'ESCALATED_MLRO' || inv.status === 'ESCALATED_COMPLIANCE'),
    mlroDisabledReason: actor.role !== 'MLRO' ? 'Statutory SAR determinations are reserved strictly to the designated MLRO.' : null,

    canManageTasks: true,
    canOverride: true,
  };

  res.json({
    data: {
      investigation: inv,
      case: kycCase,
      subject,
      events: caseEvents,
      assessments,
      timeline,
      tasks,
      activeDraft,
      decisionLedger,
      comments,
      overrides,
      escalations,
      activeEscalation,
      actionAvailability,
      actor,
    },
  });
});

// 3. Draft Autosave & Recovery (AM-38, AM-39)
apiRouter.post('/investigations/:id/draft', (req, res) => {
  const actor = getActor(req);
  const invId = req.params.id;
  const { caseId, draftType, payload } = req.body;

  try {
    const draft = globalInvestigationStore.draftService.saveDraft(
      invId,
      caseId || 'case-apex-corp-01',
      actor.id,
      actor.role,
      draftType || 'ANALYST_DISPOSITION',
      payload
    );
    res.json({ data: draft });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/investigations/:id/draft', (req, res) => {
  const actor = getActor(req);
  const invId = req.params.id;
  const draftType = req.query.draftType as any;
  const draft = globalInvestigationStore.draftService.getDraft(invId, actor.id, draftType);
  res.json({ data: draft || null });
});

// 4. Submit Structured Analyst Disposition (AM-39, AM-43)
apiRouter.post('/investigations/:id/disposition', (req, res) => {
  const actor = getActor(req);
  const invId = req.params.id;

  try {
    const result = globalInvestigationStore.submitAnalystDisposition(invId, req.body, actor);
    res.json({ data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Reviewer Four-Eyes Adjudication (AM-41, AM-43)
apiRouter.post('/investigations/:id/review', (req, res) => {
  const actor = getActor(req);
  const invId = req.params.id;

  try {
    const result = globalInvestigationStore.reviewAnalystSubmission(invId, req.body, actor);
    res.json({ data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Compliance Adjudication (AM-42, AM-43)
apiRouter.post('/investigations/:id/compliance-decision', (req, res) => {
  const actor = getActor(req);
  const invId = req.params.id;

  try {
    const result = globalInvestigationStore.adjudicateCompliance(invId, req.body, actor);
    res.json({ data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Statutory MLRO Determination (AM-42, AM-43)
apiRouter.post('/investigations/:id/mlro-decision', (req, res) => {
  const actor = getActor(req);
  const invId = req.params.id;

  try {
    const result = globalInvestigationStore.executeMlroDetermination(invId, req.body, actor);
    res.json({ data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 8. Human Corrections & Overrides (AM-40, AM-43)
apiRouter.post('/investigations/:id/overrides', (req, res) => {
  const actor = getActor(req);
  const invId = req.params.id;
  const inv = globalInvestigationStore.investigations.get(invId);

  if (!inv) {
    return res.status(404).json({ error: `Investigation ${invId} not found.` });
  }

  try {
    const override = globalInvestigationStore.decisionLedger.recordOverride(
      {
        ...req.body,
        investigationId: invId,
        caseId: inv.caseId,
      },
      actor
    );
    res.json({ data: override });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/investigations/:id/overrides/:overrideId/approve', (req, res) => {
  const actor = getActor(req);
  const { id: invId, overrideId } = req.params;
  const { notes } = req.body;

  try {
    const result = globalInvestigationStore.decisionLedger.approveOverride(
      invId,
      overrideId,
      actor,
      notes || 'Approved following four-eyes policy review.'
    );
    res.json({ data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 9. Investigation Tasks (AM-44)
apiRouter.get('/investigations/:id/tasks', (req, res) => {
  const invId = req.params.id;
  const tasks = globalInvestigationStore.taskService.getTasksForInvestigation(invId);
  res.json({ data: tasks });
});

apiRouter.post('/investigations/:id/tasks', (req, res) => {
  const actor = getActor(req);
  const invId = req.params.id;
  const inv = globalInvestigationStore.investigations.get(invId);

  if (!inv) {
    return res.status(404).json({ error: `Investigation ${invId} not found.` });
  }

  try {
    const task = globalInvestigationStore.taskService.createTask({
      ...req.body,
      investigationId: invId,
      caseId: inv.caseId,
      subjectId: inv.subjectId,
      ownerId: req.body.ownerId || actor.id,
      ownerName: req.body.ownerName || actor.name,
      ownerRole: req.body.ownerRole || actor.role,
    });
    inv.pendingTasksCount = globalInvestigationStore.taskService.getPendingTaskCount(invId);
    res.json({ data: task });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.patch('/investigations/:id/tasks/:taskId', (req, res) => {
  const actor = getActor(req);
  const { id: invId, taskId } = req.params;

  try {
    const task = globalInvestigationStore.taskService.updateTaskStatus(
      taskId,
      req.body.status,
      req.body.evidence,
      actor
    );
    const inv = globalInvestigationStore.investigations.get(invId);
    if (inv) {
      inv.pendingTasksCount = globalInvestigationStore.taskService.getPendingTaskCount(invId);
    }
    res.json({ data: task });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 10. Comments & Audit Notes (AM-38)
apiRouter.post('/investigations/:id/comments', (req, res) => {
  const actor = getActor(req);
  const invId = req.params.id;
  const inv = globalInvestigationStore.investigations.get(invId);

  if (!inv) {
    return res.status(404).json({ error: `Investigation ${invId} not found.` });
  }

  const { text, isInternal, mentions } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Comment text cannot be empty.' });
  }

  const comment = {
    id: `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    investigationId: invId,
    caseId: inv.caseId,
    authorId: actor.id,
    authorName: actor.name,
    authorRole: actor.role,
    text: text.trim(),
    mentions: mentions || [],
    isInternal: !!isInternal,
    createdAt: new Date().toISOString(),
  };

  const list = globalInvestigationStore.comments.get(invId) || [];
  list.push(comment);
  globalInvestigationStore.comments.set(invId, list);

  res.json({ data: comment });
});

// 11. Cryptographic Decision Ledger Audit Chain (AM-43)
apiRouter.get('/investigations/:id/audit-chain', (req, res) => {
  const invId = req.params.id;
  const ledger = globalInvestigationStore.decisionLedger.getFullAuditLedger(invId);
  res.json({
    data: {
      investigationId: invId,
      chain: ledger.decisionChain,
      isChainValid: ledger.isChainValid,
      totalDecisions: ledger.decisionChain.length,
      analystConclusionsCount: ledger.analystConclusions.length,
      reviewDecisionsCount: ledger.reviewDecisions.length,
      complianceDecisionsCount: ledger.complianceDecisions.length,
      mlroDecisionsCount: ledger.mlroDecisions.length,
      overridesCount: ledger.overrides.length,
    },
  });
});

// ---------------------------------------------------------------------------
// AM-45: KYC Case Integration & Reconciliation Routes
// ---------------------------------------------------------------------------
apiRouter.get('/investigations/:id/kyc-link', (req, res) => {
  const invId = req.params.id;
  let link = globalIntegrationHub.getKycCaseLink(invId);
  if (!link) {
    const inv = globalInvestigationStore.investigations.get(invId);
    if (inv) {
      // Bootstrap default link if not yet explicitly keyed
      link = {
        id: `link-${inv.caseId}`,
        caseId: inv.caseId,
        caseReference: inv.caseReference,
        screeningRunIds: ['run-default-01'],
        subjectIds: [inv.subjectId],
        eventIds: [],
        evidenceIds: [],
        conclusionIds: [],
        taskIds: [],
        approvalIds: [],
        blockers: inv.blockingConditions || [],
        conditionIds: [],
        integrationStatus: 'SYNCED',
        lastReconciledAt: new Date().toISOString(),
        reconciliationChecksum: 'sha256-default-synced',
        contractVersion: 'v2.4',
        outboxStatus: 'ACKNOWLEDGED',
      };
      globalIntegrationHub.kycCaseLinks.set(invId, link);
    }
  }
  res.json({ data: link });
});

apiRouter.post('/investigations/:id/kyc-link/reconcile', (req, res) => {
  const actor = getActor(req);
  try {
    const link = globalIntegrationHub.reconcileKycCase(req.params.id, actor);
    res.json({ data: link, message: 'KYC Case artifacts successfully reconciled with Core Platform.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AM-46 & AM-47: Risk-Factor Integration & Explanation Routes
// ---------------------------------------------------------------------------
apiRouter.get('/investigations/:id/risk-impact', (req, res) => {
  const explanation = globalIntegrationHub.getRiskImpactExplanation(req.params.id);
  res.json({ data: explanation });
});

apiRouter.get('/investigations/:id/approved-findings', (req, res) => {
  const findings = globalIntegrationHub.getApprovedFindings(req.params.id);
  res.json({ data: findings });
});

apiRouter.post('/investigations/:id/approved-findings/:findingId/transmit-risk', (req, res) => {
  const actor = getActor(req);
  try {
    const result = globalIntegrationHub.transmitApprovedFindingToRiskEngine(
      req.params.id,
      req.params.findingId,
      actor
    );
    res.json({
      data: result,
      message: 'Approved finding securely transmitted to Risk Engine via Anti-Corruption Layer.',
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AM-48: EDD Triggers & Investigation Plans Routes
// ---------------------------------------------------------------------------
apiRouter.get('/investigations/:id/edd-case', (req, res) => {
  const edd = globalIntegrationHub.getEddCase(req.params.id);
  res.json({ data: edd || null });
});

apiRouter.post('/investigations/:id/edd-case/trigger', (req, res) => {
  const actor = getActor(req);
  const inv = globalInvestigationStore.investigations.get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Investigation not found.' });

  const edd = globalIntegrationHub.triggerEddCase(
    req.params.id,
    inv.caseId,
    req.body.triggerReason || 'Severe adverse media match on UBO triggering mandatory EDD policy.',
    actor
  );
  res.json({ data: edd });
});

apiRouter.post('/investigations/:id/edd-case/ai-draft-questions', (req, res) => {
  const inv = globalInvestigationStore.investigations.get(req.params.id);
  const subjectName = inv ? inv.subjectName : 'Subject Entity';
  const questions = globalIntegrationHub.aiDraftEddQuestions(
    req.params.id,
    subjectName,
    req.body.adverseEvents || ['Bribery & Corruption Indictment']
  );
  res.json({ data: questions });
});

apiRouter.post('/investigations/:id/edd-case/questions/:qId/approve', (req, res) => {
  const actor = getActor(req);
  try {
    const q = globalIntegrationHub.approveEddQuestion(req.params.id, req.params.qId, actor);
    res.json({ data: q, message: 'EDD Question approved by human reviewer.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AM-49: Client Information Requests (CIR) Routes
// ---------------------------------------------------------------------------
apiRouter.get('/investigations/:id/information-requests', (req, res) => {
  const requests = globalIntegrationHub.getInformationRequests(req.params.id);
  res.json({ data: requests });
});

apiRouter.post('/investigations/:id/information-requests', (req, res) => {
  const actor = getActor(req);
  const inv = globalInvestigationStore.investigations.get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Investigation not found.' });

  const cir = globalIntegrationHub.createInformationRequestDraft(
    req.params.id,
    inv.caseId,
    req.body,
    actor
  );
  res.json({ data: cir });
});

apiRouter.post('/investigations/:id/information-requests/:reqId/approve-transmit', (req, res) => {
  const actor = getActor(req);
  try {
    const cir = globalIntegrationHub.approveAndTransmitRequest(req.params.id, req.params.reqId, actor);
    res.json({ data: cir, message: 'Client Information Request approved and dispatched via Secure Channel.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/investigations/:id/information-requests/:reqId/record-response', (req, res) => {
  try {
    const cir = globalIntegrationHub.recordClientResponse(req.params.id, req.params.reqId, req.body);
    res.json({ data: cir, message: 'Client response and verified evidence recorded.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AM-50: Compliance Decision Pack Routes
// ---------------------------------------------------------------------------
apiRouter.get('/investigations/:id/decision-packs', (req, res) => {
  const packs = globalIntegrationHub.getDecisionPacks(req.params.id);
  res.json({ data: packs });
});

apiRouter.post('/investigations/:id/decision-packs/generate', (req, res) => {
  const actor = getActor(req);
  const inv = globalInvestigationStore.investigations.get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Investigation not found.' });

  try {
    const pack = globalIntegrationHub.generateDecisionPack(
      req.params.id,
      inv.caseId,
      req.body,
      actor
    );
    res.json({
      data: pack,
      message: `Version ${pack.version} Decision Pack generated and cryptographically sealed with SHA-256 manifest.`,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AM-51: Acceptance Conditions Routes
// ---------------------------------------------------------------------------
apiRouter.get('/investigations/:id/acceptance-conditions', (req, res) => {
  const conditions = globalIntegrationHub.getAcceptanceConditions(req.params.id);
  res.json({ data: conditions });
});

apiRouter.post('/investigations/:id/acceptance-conditions', (req, res) => {
  const actor = getActor(req);
  const inv = globalInvestigationStore.investigations.get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Investigation not found.' });

  const cond = globalIntegrationHub.createAcceptanceCondition(
    req.params.id,
    inv.caseId,
    req.body,
    actor
  );
  res.json({ data: cond });
});

apiRouter.post('/investigations/:id/acceptance-conditions/:condId/evidence', (req, res) => {
  const actor = getActor(req);
  try {
    const cond = globalIntegrationHub.attachConditionEvidence(
      req.params.id,
      req.params.condId,
      req.body,
      actor
    );
    res.json({ data: cond, message: 'Verification evidence attached to condition.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/investigations/:id/acceptance-conditions/:condId/approve-closure', (req, res) => {
  const actor = getActor(req);
  try {
    const cond = globalIntegrationHub.approveConditionClosure(req.params.id, req.params.condId, actor);
    res.json({ data: cond, message: 'Condition closure approved under 4-Eyes governance.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/investigations/:id/acceptance-conditions/:condId/escalate-breach', (req, res) => {
  try {
    const cond = globalIntegrationHub.escalateConditionBreach(
      req.params.id,
      req.params.condId,
      req.body.reason || 'SLA breached without mandatory evidence.'
    );
    res.json({ data: cond, message: 'Condition breach escalated to Compliance & MLRO.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AM-52: BAU Handover Routes
// ---------------------------------------------------------------------------
apiRouter.get('/investigations/:id/handover-packages', (req, res) => {
  const packages = globalIntegrationHub.getHandoverPackages(req.params.id);
  res.json({ data: packages });
});

apiRouter.post('/investigations/:id/handover-packages', (req, res) => {
  const actor = getActor(req);
  const inv = globalInvestigationStore.investigations.get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Investigation not found.' });

  try {
    const pkg = globalIntegrationHub.createAndTransmitHandover(
      req.params.id,
      inv.caseId,
      req.body,
      actor
    );
    res.json({ data: pkg, message: 'BAU Handover package dispatched with data minimization rules applied.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/investigations/:id/handover-packages/:hndId/replay', (req, res) => {
  try {
    const pkg = globalIntegrationHub.replayHandoverDelivery(
      req.params.id,
      req.params.hndId,
      !!req.body.simulateFailure
    );
    res.json({ data: pkg, message: 'Handover delivery attempt processed via Transactional Outbox.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/outbox/:outboxId/attempts', (req, res) => {
  const attempts = globalIntegrationHub.getOutboxAttempts(req.params.outboxId);
  res.json({ data: attempts });
});

// ============================================================================
// AM-53 through AM-59: Continuous Monitoring & Delta Intelligence API
// ============================================================================

// Metrics (AM-53 to AM-59)
apiRouter.get('/monitoring/metrics', (req, res) => {
  const metrics = globalMonitoringMaster.getMetrics();
  res.json({ data: metrics });
});

apiRouter.get('/monitoring/overview', (req, res) => {
  const metrics = globalMonitoringMaster.getMetrics();
  res.json({
    metrics,
    statusCounts: {
      activeAlerts: metrics.activeAlertsCount,
      criticalAlerts: metrics.criticalAlertsCount,
      upcomingSchedules: metrics.upcomingSchedulesCount,
      overdueSchedules: metrics.overdueSchedulesCount,
      materialUpdates: metrics.materialUpdatesCount,
      reopenedEvents: metrics.reopenedEventsCount,
    },
  });
});

apiRouter.get('/monitoring/connectors/health', (req, res) => {
  res.json({
    connectors: [
      { id: 'CONN-LEXIS-01', name: 'LexisNexis Adverse Media', status: 'HEALTHY', latencyMs: 140, circuitBreaker: 'CLOSED' },
      { id: 'CONN-REUTERS-02', name: 'Reuters News Feed', status: 'HEALTHY', latencyMs: 95, circuitBreaker: 'CLOSED' },
      { id: 'CONN-DOWJONES-03', name: 'Dow Jones Factiva Direct', status: 'HEALTHY', latencyMs: 110, circuitBreaker: 'CLOSED' },
      { id: 'CONN-COURT-REG-04', name: 'Judicial Court Dockets API', status: 'HEALTHY', latencyMs: 180, circuitBreaker: 'CLOSED' },
    ],
    queueLagSeconds: 12,
    workerStatus: 'ACTIVE_HEALTHY',
  });
});

apiRouter.post('/monitoring/demo/run-multi-cycle', async (req, res) => {
  try {
    const subs = globalMonitoringMaster.subscriptionService.getAllSubscriptions();
    const summaries: string[] = [];
    for (const sub of subs.slice(0, 3)) {
      const result = await globalMonitoringMaster.executeMonitoringCycle(sub.id);
      summaries.push(`Subscription ${sub.id} (${sub.subjectName}): ${result.articlesProcessed} articles processed, ${result.newAlerts.length} alert(s), ${result.suppressedCount} suppressed.`);
    }
    res.json({ success: true, cyclesExecuted: Math.min(3, subs.length), summaries });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Schedules (AM-53)
apiRouter.get('/monitoring/schedules', (req, res) => {
  const schedules = globalMonitoringMaster.scheduleService.getAllSchedules();
  res.json({ data: schedules });
});

apiRouter.post('/monitoring/schedules/:id/recalculate', (req, res) => {
  try {
    const actor = getActor(req);
    const updated = globalMonitoringMaster.scheduleService.recalculateSchedule(req.params.id, {
      newRisk: req.body.newRisk,
      newPriorFindingCount: req.body.newPriorFindingCount,
      newPolicyVersion: req.body.newPolicyVersion,
      authorizedExceptionDays: req.body.authorizedExceptionDays,
      authorizedExceptionRef: req.body.authorizedExceptionRef,
      triggerReason: req.body.triggerReason || 'MANUAL_OVERRIDE',
      changedBy: actor.name,
      rationale: req.body.rationale || 'Authorized schedule recalculation',
    });
    res.json({ data: updated, message: 'Schedule recalculated successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/monitoring/schedules/:id/pause', (req, res) => {
  try {
    const actor = getActor(req);
    const paused = globalMonitoringMaster.scheduleService.pauseSchedule(
      req.params.id,
      req.body.reason || 'Operational review pause',
      actor.name
    );
    res.json({ data: paused, message: 'Schedule paused.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/monitoring/schedules/:id/resume', (req, res) => {
  try {
    const actor = getActor(req);
    const resumed = globalMonitoringMaster.scheduleService.resumeSchedule(req.params.id, actor.name);
    res.json({ data: resumed, message: 'Schedule resumed.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/monitoring/schedules/:id/revisions', (req, res) => {
  const revisions = globalMonitoringMaster.scheduleService.getScheduleRevisions(req.params.id);
  res.json({ data: revisions });
});

// Subscriptions & Cycles (AM-54)
apiRouter.get('/monitoring/subscriptions', (req, res) => {
  const subs = globalMonitoringMaster.subscriptionService.getAllSubscriptions();
  res.json({ data: subs });
});

apiRouter.post('/monitoring/subscriptions', (req, res) => {
  const actor = getActor(req);
  const sub = globalMonitoringMaster.subscriptionService.createSubscription({
    caseId: req.body.caseId,
    subjectId: req.body.subjectId,
    subjectName: req.body.subjectName,
    riskLevel: req.body.riskLevel || 'MEDIUM',
    relationshipType: req.body.relationshipType || 'DIRECTOR',
    frequency: req.body.frequency,
    connectors: req.body.connectors,
    searchDepth: req.body.searchDepth,
    createdBy: actor.name,
  });
  // Also create linked schedule
  globalMonitoringMaster.scheduleService.createSchedule(
    {
      caseId: req.body.caseId,
      subjectId: req.body.subjectId,
      customerRisk: req.body.riskLevel || 'MEDIUM',
      relationshipType: req.body.relationshipType || 'DIRECTOR',
    },
    sub.id
  );
  res.status(201).json({ data: sub });
});

apiRouter.post('/monitoring/subscriptions/:id/run-cycle', async (req, res) => {
  try {
    const result = await globalMonitoringMaster.executeMonitoringCycle(req.params.id);
    res.json({ data: result, message: 'Monitoring cycle executed successfully.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/monitoring/cycles', (req, res) => {
  const cycles = globalMonitoringMaster.subscriptionService.getAllCycles();
  res.json({ data: cycles });
});

// Delta Sets (AM-55)
apiRouter.get('/monitoring/deltas', (req, res) => {
  const deltas = globalMonitoringMaster.deltaEngine.getAllDeltaSets();
  res.json({ data: deltas });
});

apiRouter.get('/monitoring/deltas/:id', (req, res) => {
  const delta = globalMonitoringMaster.deltaEngine.getDeltaSet(req.params.id);
  if (!delta) return res.status(404).json({ error: 'Delta set not found' });
  res.json({ data: delta });
});

// Suppressions (AM-56)
apiRouter.get('/monitoring/suppressions', (req, res) => {
  const suppressions = globalMonitoringMaster.suppressionEngine.getAllDecisions();
  res.json({ data: suppressions });
});

apiRouter.post('/monitoring/suppressions/:id/reopen', (req, res) => {
  try {
    const actor = getActor(req);
    const decision = globalMonitoringMaster.suppressionEngine.reopenSuppression(
      req.params.id,
      req.body.reason || 'Manual analyst revocation upon new external information',
      actor.name
    );
    res.json({ data: decision, message: 'Suppressed result reopened.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Material Updates (AM-57)
apiRouter.get('/monitoring/material-updates', (req, res) => {
  const updates = globalMonitoringMaster.materialRules.getAllMaterialUpdates();
  res.json({ data: updates });
});

// Triggers & Triggered Cases (AM-58)
apiRouter.get('/monitoring/triggers/rules', (req, res) => {
  const rules = globalMonitoringMaster.triggerOrchestrator.getRules();
  res.json({ data: rules });
});

apiRouter.get('/monitoring/triggers/cases', (req, res) => {
  const cases = globalMonitoringMaster.triggerOrchestrator.getAllTriggeredCases();
  res.json({ data: cases });
});

apiRouter.post('/monitoring/triggers/cases', (req, res) => {
  try {
    const triggeredCase = globalMonitoringMaster.triggerOrchestrator.evaluateAndTriggerCase({
      originalCaseId: req.body.originalCaseId,
      subjectId: req.body.subjectId,
      subjectName: req.body.subjectName,
      sourceAlertId: req.body.sourceAlertId,
      sourceMaterialUpdateId: req.body.sourceMaterialUpdateId,
      triggerEventCategory: req.body.triggerEventCategory,
      evidenceSummary: req.body.evidenceSummary || 'Ad-hoc triggered case from monitoring review',
    });
    if (!triggeredCase) {
      return res.status(409).json({ error: 'Trigger evaluated but duplicate case prevented by idempotency rule.' });
    }
    res.status(201).json({ data: triggeredCase });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Monitoring Alerts & Prioritization (AM-59)
apiRouter.get('/monitoring/alerts', (req, res) => {
  const alerts = globalMonitoringMaster.getAllAlerts();
  res.json({ data: alerts });
});

apiRouter.patch('/monitoring/alerts/:id', (req, res) => {
  try {
    const actor = getActor(req);
    const updated = globalMonitoringMaster.updateAlertStatus(
      req.params.id,
      req.body.status,
      req.body.resolutionDisposition,
      req.body.assignedTo || actor.name
    );
    res.json({ data: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/monitoring/alerts/:id/convert-to-case', (req, res) => {
  try {
    const alert = globalMonitoringMaster.getAlert(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    const triggeredCase = globalMonitoringMaster.triggerOrchestrator.evaluateAndTriggerCase({
      originalCaseId: alert.caseId,
      subjectId: alert.subjectId,
      subjectName: alert.subjectName,
      sourceAlertId: alert.id,
      triggerEventCategory: alert.alertType === 'MATERIAL_EVENT_UPDATE' ? 'CHARGE' : 'OTHER_MATERIAL',
      evidenceSummary: `${alert.title}. ${alert.deltaExplanation}`,
    });

    if (triggeredCase) {
      globalMonitoringMaster.updateAlertStatus(alert.id, 'CONVERTED_TO_CASE', `Converted to ${triggeredCase.targetWorkflow} case ${triggeredCase.workflowReference}`);
    }

    res.json({ data: triggeredCase, message: 'Alert converted to authorized case.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Alias & helper endpoints for monitoring UI client compatibility
apiRouter.patch('/monitoring/schedules/:id/status', (req, res) => {
  try {
    const actor = getActor(req);
    const { status, reason } = req.body;
    let schedule;
    if (status === 'PAUSED') {
      schedule = globalMonitoringMaster.scheduleService.pauseSchedule(req.params.id, reason || 'Manual pause', actor.name);
    } else {
      schedule = globalMonitoringMaster.scheduleService.resumeSchedule(req.params.id, actor.name);
    }
    res.json({ data: schedule });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/monitoring/schedules/:id/run-job', async (req, res) => {
  try {
    const schedule = globalMonitoringMaster.scheduleService.getSchedule(req.params.id);
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    const result = await globalMonitoringMaster.executeMonitoringCycle(schedule.subscriptionId);
    res.json({ data: schedule, cycle: result, message: 'Rescreening job completed.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.patch('/monitoring/subscriptions/:id/pause', (req, res) => {
  try {
    const sub = globalMonitoringMaster.subscriptionService.updateSubscriptionStatus(
      req.params.id,
      req.body.paused ? 'PAUSED' : 'ACTIVE',
      req.body.reason
    );
    res.json({ data: sub });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/monitoring/trigger-rules', (req, res) => {
  const rules = globalMonitoringMaster.triggerOrchestrator.getRules();
  res.json({ data: rules });
});

apiRouter.get('/monitoring/triggered-cases', (req, res) => {
  const cases = globalMonitoringMaster.triggerOrchestrator.getAllTriggeredCases();
  res.json({ data: cases });
});

apiRouter.patch('/monitoring/alerts/:id/status', (req, res) => {
  try {
    const actor = getActor(req);
    const updated = globalMonitoringMaster.updateAlertStatus(
      req.params.id,
      req.body.status,
      req.body.notes,
      actor.name
    );
    res.json({ data: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/monitoring/deltas/:id/ai-summary', (req, res) => {
  const delta = globalMonitoringMaster.deltaEngine.getDeltaSet(req.params.id);
  res.json({
    summary: delta?.summary
      ? `AI Advisory Summary: Evaluated ${delta.totalItemsCount} delta elements (${delta.summary.newCount} newly retrieved, ${delta.summary.updatedCount} altered, ${delta.summary.reopenedCount} reopened). Advisory only; human review required for all risk actions.`
      : 'AI Advisory Summary: No significant delta items identified.',
    advisoryOnly: true,
  });
});

// ----------------------------------------------------
// OpenAPI 3.1 Contract Specification Endpoint
// ----------------------------------------------------
// ----------------------------------------------------
apiRouter.get('/docs/openapi.json', (req, res) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Adverse Media Screening Agent API',
      version: '1.0.0-stage1',
      description: 'Enterprise AML/KYC Adverse Media Screening Engine API covering AM-01 to AM-06 with server-side authorization.',
    },
    paths: {
      '/api/v1/cases': { get: { summary: 'List KYC cases' }, post: { summary: 'Create new KYC case' } },
      '/api/v1/cases/{id}': { get: { summary: 'Get case by ID' } },
      '/api/v1/cases/{id}/complete': { post: { summary: 'Complete case (blocks if mandatory obligations unresolved)' } },
      '/api/v1/cases/{id}/obligations': { get: { summary: 'List screening obligations' } },
      '/api/v1/obligations/{id}/exempt': { post: { summary: 'Request policy exemption' } },
      '/api/v1/obligations/{id}/adjudicate-exemption': { post: { summary: 'Approve or reject exemption (No self-approval)' } },
      '/api/v1/subjects/{id}/aliases': { get: { summary: 'List aliases' }, post: { summary: 'Add alias' } },
      '/api/v1/subjects/{id}/aliases/ai-suggest': { post: { summary: 'Generate AI alias suggestions' } },
      '/api/v1/screening-runs': { post: { summary: 'Execute approved-source screening run' } },
      '/api/v1/connectors': { get: { summary: 'List approved source connectors & health' } },
      '/api/v1/connectors/{id}/retry': { post: { summary: 'Retry failed connector' } },
      '/api/v1/policies': { get: { summary: 'Get active screening policy rules' } },
      '/api/v1/audit-events': { get: { summary: 'Query immutable audit trail' } },
    },
  });
});

/**
 * Investigation Store & Workflow Service (AM-38 through AM-44)
 * Manages full lifecycle for Case Workspace, Structured Dispositions, Four-Eyes Review,
 * Compliance/MLRO Escalations, Separate Human Decision Capture, and Tasks.
 */

import {
  AnalystConclusion,
  ComplianceAuthorizedOutcome,
  ComplianceDecision,
  DispositionOutcome,
  Escalation,
  Investigation,
  InvestigationComment,
  InvestigationOverride,
  InvestigationStatus,
  InvestigationTask,
  MlroDecision,
  MlroDetermination,
  QueueItem,
  QueueItemType,
  RecommendedNextAction,
  ReviewDecision,
  RoleId,
  WorkflowTransition,
  WorkspaceState,
} from '../../types/index.ts';
import { DEMO_USERS } from '../rbac.ts';
import { AuthorizationPolicyEngine } from './authorization-engine.ts';
import { DecisionLedger } from './decision-ledger.ts';
import { EscalationEngine } from './escalation-engine.ts';
import { DraftService } from './draft-service.ts';
import { WorkflowStateMachine } from './state-machine.ts';
import { TaskService } from './task-service.ts';

export interface UserContext {
  id: string;
  name: string;
  role: RoleId;
  isAi?: boolean;
}

export class InvestigationWorkflowStore {
  public investigations: Map<string, Investigation> = new Map();
  public decisionLedger: DecisionLedger = new DecisionLedger();
  public taskService: TaskService = new TaskService();
  public escalationEngine: EscalationEngine = new EscalationEngine();
  public draftService: DraftService = new DraftService();
  public comments: Map<string, InvestigationComment[]> = new Map();
  public queueItems: Map<string, QueueItem> = new Map();
  public workspaceStates: Map<string, WorkspaceState> = new Map();
  public workflowTransitions: WorkflowTransition[] = [];

  constructor() {
    this.seedSyntheticInvestigations();
  }

  /**
   * Seeds comprehensive synthetic investigation records representing all required enterprise journeys.
   */
  public seedSyntheticInvestigations() {
    const now = new Date();

    // -------------------------------------------------------------
    // 1. inv-apex-01: Active Investigation (In Progress)
    // Primary subject: Maximilian Alexander Vance (High Risk PEP/Sanctions/Bribery)
    // -------------------------------------------------------------
    const inv1Id = 'inv-apex-01';
    const inv1: Investigation = {
      id: inv1Id,
      caseId: 'case-apex-corp-01',
      caseReference: 'CAS-2026-0891',
      subjectId: 'sbj-apex-01',
      subjectName: 'Maximilian Alexander Vance [SYNTHETIC]',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assignedAnalystId: DEMO_USERS.ANALYST.id,
      assignedAnalystName: DEMO_USERS.ANALYST.name,
      assignedReviewerId: DEMO_USERS.CHECKER.id,
      assignedReviewerName: DEMO_USERS.CHECKER.name,
      slaDueDate: new Date(now.getTime() + 38 * 3600 * 1000).toISOString(),
      slaBreached: false,
      slaRemainingMs: 38 * 3600 * 1000,
      totalEventsCount: 2,
      unresolvedContradictionsCount: 1,
      pendingTasksCount: 2,
      reworkCount: 0,
      createdAt: '2026-09-01T08:30:00Z',
      updatedAt: '2026-09-07T14:15:00Z',
      summary: 'Cross-border energy advisory fee inquiry involving Geneva prosecutors and Cyprus escrow structures.',
      blockingConditions: [
        'Mandatory screening obligation unresolved for Director Sir Arthur Pendelton',
        'Court registry coverage connector degraded during initial ingestion',
      ],
      tags: ['Bribery', 'UBO', 'Swiss Inquiry', 'Energy Transit'],
      aiRecommendation: {
        id: 'ai-rec-01',
        materialityRecommendation: 'MATCH_HIGH_RISK_EDD',
        confidenceScore: 0.88,
        summaryRationale:
          'High materiality adverse event detected: Formal Swiss cantonal inquest into $45M energy advisory commissions routed via Cyprus holding structures. Significant bribery/fraud nexus substantiated across independent investigative reports.',
        calculatedAt: '2026-09-07T14:15:00Z',
        modelVersion: 'gemini-1.5-pro-aml-v3.2',
        promptVersion: 'prom-aml-mat-v2.1',
        isHumanDecision: false,
      },
      primaryNextAction: 'Review contradictory court dismissal evidence & draft formal disposition',
    };
    this.investigations.set(inv1Id, inv1);

    // Seed draft for inv-apex-01
    this.draftService.saveDraft(
      inv1Id,
      'case-apex-corp-01',
      DEMO_USERS.ANALYST.id,
      'ANALYST',
      'ANALYST_DISPOSITION',
      {
        outcome: 'TRUE_POSITIVE_MATERIAL',
        rationale:
          'Swiss federal inquest confirmed active regarding advisory fees. However, NZZ court report suggests asset freeze lifted. Requiring full Swiss criminal docket review before final determination.',
        confidence: 'HIGH',
        missingInformationNotes:
          'Direct confirmation from Geneva Cantonal Public Prosecutor office on inquest closure.',
        recommendedNextAction: 'ENHANCED_DUE_DILIGENCE',
        contradictionsNoted:
          'Contradiction between FT report of criminal inquest and NZZ report of freeze order lifting.',
      }
    );

    // Seed tasks for inv-apex-01
    const t1 = this.taskService.createTask({
      investigationId: inv1Id,
      caseId: 'case-apex-corp-01',
      subjectId: 'sbj-apex-01',
      eventId: 'evt-apex-01',
      taskType: 'PUBLIC_RECORD_SEARCH',
      title: 'Verify Swiss Federal Criminal Court Docket Ruling',
      description: 'Obtain certified copy of the April 2025 decision regarding lifting of account restrictions.',
      ownerId: DEMO_USERS.ANALYST.id,
      ownerName: DEMO_USERS.ANALYST.name,
      ownerRole: 'ANALYST',
      dueDate: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
      priority: 'HIGH',
    });

    this.taskService.createTask({
      investigationId: inv1Id,
      caseId: 'case-apex-corp-01',
      subjectId: 'sbj-apex-01',
      eventId: 'evt-apex-01',
      taskType: 'EDD_REPORT',
      title: 'Commission Forensic Corporate Intelligence Report',
      description: 'Engage specialized forensic investigator to map Nicosia feeder corporate registry.',
      ownerId: DEMO_USERS.ANALYST.id,
      ownerName: DEMO_USERS.ANALYST.name,
      ownerRole: 'ANALYST',
      dueDate: new Date(now.getTime() + 72 * 3600 * 1000).toISOString(),
      priority: 'MEDIUM',
      dependencies: [t1.id],
    });

    // Seed an overdue task to demonstrate AM-44 overdue alerts
    const tOverdue = this.taskService.createTask({
      investigationId: inv1Id,
      caseId: 'case-apex-corp-01',
      subjectId: 'sbj-apex-01',
      taskType: 'DOCUMENT_REQUEST',
      title: 'Request Client Wealth Origin Affirmation (OVERDUE)',
      description: 'Request signed Source of Wealth declaration from Apex Global Energy compliance director.',
      ownerId: DEMO_USERS.ANALYST.id,
      ownerName: DEMO_USERS.ANALYST.name,
      ownerRole: 'ANALYST',
      dueDate: new Date(now.getTime() - 26 * 3600 * 1000).toISOString(),
      priority: 'URGENT',
    });
    tOverdue.isOverdue = true;

    // Seed an override for inv-apex-01
    this.decisionLedger.recordOverride(
      {
        investigationId: inv1Id,
        caseId: 'case-apex-corp-01',
        field: 'recency_decay_factor',
        originalValue: 0.95,
        revisedValue: 0.75,
        reason: 'Event occurrences occurred in 2022-2024; procedural dismissal in 2025 reduces acute recency weight.',
        evidenceCitations: ['art-02', 'art-16-indep-investigation'],
        approvalRequirement: 'FOUR_EYES_CHECKER',
        downstreamImpact: 'Recalculates composite event materiality score from 0.91 to 0.82.',
      },
      { id: DEMO_USERS.ANALYST.id, name: DEMO_USERS.ANALYST.name, role: 'ANALYST' }
    );

    // Seed Comments for inv-apex-01
    this.comments.set(inv1Id, [
      {
        id: 'cmt-01',
        investigationId: inv1Id,
        caseId: 'case-apex-corp-01',
        authorId: DEMO_USERS.ANALYST.id,
        authorName: DEMO_USERS.ANALYST.name,
        authorRole: 'ANALYST',
        createdAt: '2026-09-06T10:15:00Z',
        text:
          'Initial screening review indicates multi-jurisdictional adverse media involving Swiss prosecutors. Cross-referencing with Cyprus litigation records.',
        mentions: [],
        isInternal: false,
      },
      {
        id: 'cmt-02',
        investigationId: inv1Id,
        caseId: 'case-apex-corp-01',
        authorId: DEMO_USERS.CHECKER.id,
        authorName: DEMO_USERS.CHECKER.name,
        authorRole: 'CHECKER',
        createdAt: '2026-09-06T14:30:00Z',
        text:
          'Ensure the court dismissal in art-02 is independently corroborated before submitting final disposition.',
        mentions: [],
        isInternal: true,
      },
    ]);

    // -------------------------------------------------------------
    // 2. inv-apex-02: Awaiting Checker Review (Four-Eyes SoD Ready)
    // Primary subject: Elena Rostova (UBO, 22% Equity)
    // Maker: Sarah Chen (ANALYST), Checker: Marcus Vance (CHECKER)
    // -------------------------------------------------------------
    const inv2Id = 'inv-apex-02';
    const inv2: Investigation = {
      id: inv2Id,
      caseId: 'case-apex-corp-01',
      caseReference: 'CAS-2026-0891',
      subjectId: 'sbj-apex-02',
      subjectName: 'Elena Rostova [SYNTHETIC]',
      status: 'AWAITING_CHECKER',
      priority: 'HIGH',
      assignedAnalystId: DEMO_USERS.ANALYST.id,
      assignedAnalystName: DEMO_USERS.ANALYST.name,
      assignedReviewerId: DEMO_USERS.CHECKER.id,
      assignedReviewerName: DEMO_USERS.CHECKER.name,
      slaDueDate: new Date(now.getTime() + 18 * 3600 * 1000).toISOString(),
      slaBreached: false,
      slaRemainingMs: 18 * 3600 * 1000,
      totalEventsCount: 1,
      unresolvedContradictionsCount: 0,
      pendingTasksCount: 0,
      reworkCount: 0,
      createdAt: '2026-09-02T09:00:00Z',
      updatedAt: '2026-09-07T11:00:00Z',
      summary: 'UBO with Cyprus trust holding company. Linked to Nicosia commercial guarantee freezes.',
      blockingConditions: [],
      tags: ['UBO', 'Cyprus', 'Commercial Freeze'],
      aiRecommendation: {
        id: 'ai-rec-02',
        materialityRecommendation: 'MATCH_HIGH_RISK_EDD',
        confidenceScore: 0.85,
        summaryRationale:
          'UBO with Cyprus trust holding company. Linked to Nicosia commercial guarantee freezes and offshore corporate directors.',
        calculatedAt: '2026-09-05T12:00:00Z',
        modelVersion: 'gemini-1.5-pro-aml-v3.2',
        promptVersion: 'prom-aml-mat-v2.1',
        isHumanDecision: false,
      },
      primaryNextAction: 'Checker Four-Eyes Adjudication: Approve or Return for Rework',
    };
    this.investigations.set(inv2Id, inv2);

    // Record Analyst structured disposition for inv-apex-02
    const conc2 = this.decisionLedger.recordAnalystConclusion(
      {
        investigationId: inv2Id,
        caseId: 'case-apex-corp-01',
        subjectId: 'sbj-apex-02',
        outcome: 'TRUE_POSITIVE_MATERIAL',
        rationale:
          'Confirmed true match to subject Elena Rostova regarding executive governance rights in Apex Cyprus holding entities. Commercial guarantee freezes verified via Cyprus Law Gazette (art-18). Enhanced due diligence and source of funds verification required.',
        evidenceConsidered: ['art-18-cyprus-court'],
        contradictionsConsidered: [
          {
            contradictionId: 'none',
            resolutionSummary: 'No contradictory legal dismissals found for Cyprus civil freeze proceedings.',
          },
        ],
        missingInformationNotes: 'Awaiting official Cyprus corporate registrar trust beneficiary confirmation.',
        recommendedNextAction: 'ENHANCED_DUE_DILIGENCE',
        policyRequiredFields: {
          customerTenureVerified: true,
          pepStatusConfirmed: false,
          financialScaleAssessed: true,
          dualIndependentSourcesChecked: true,
          mitigatingEvidenceWeighed: true,
        },
        confidence: 'HIGH',
        submissionStatus: 'SUBMITTED_FOR_REVIEW',
      },
      { id: DEMO_USERS.ANALYST.id, name: DEMO_USERS.ANALYST.name, role: 'ANALYST' }
    );
    inv2.currentAnalystConclusion = conc2;

    // -------------------------------------------------------------
    // 3. inv-apex-03: Escalated to Compliance
    // Subject: Sir Arthur Pendelton (Director, PEP Ties)
    // -------------------------------------------------------------
    const inv3Id = 'inv-apex-03';
    const inv3: Investigation = {
      id: inv3Id,
      caseId: 'case-apex-corp-01',
      caseReference: 'CAS-2026-0891',
      subjectId: 'sbj-apex-03',
      subjectName: 'Sir Arthur Pendelton [SYNTHETIC]',
      status: 'ESCALATED_COMPLIANCE',
      priority: 'HIGH',
      assignedAnalystId: DEMO_USERS.ANALYST.id,
      assignedAnalystName: DEMO_USERS.ANALYST.name,
      assignedReviewerId: DEMO_USERS.CHECKER.id,
      assignedReviewerName: DEMO_USERS.CHECKER.name,
      slaDueDate: new Date(now.getTime() + 30 * 3600 * 1000).toISOString(),
      slaBreached: false,
      slaRemainingMs: 30 * 3600 * 1000,
      totalEventsCount: 1,
      unresolvedContradictionsCount: 0,
      pendingTasksCount: 1,
      reworkCount: 0,
      createdAt: '2026-09-03T11:00:00Z',
      updatedAt: '2026-09-07T16:00:00Z',
      summary: 'Executive Board Director with parliamentary advisory roles and defense committee ties.',
      blockingConditions: ['Mandatory PEP registry declaration missing'],
      tags: ['PEP', 'Director', 'Parliamentary Advisory'],
      aiRecommendation: {
        id: 'ai-rec-03',
        materialityRecommendation: 'MATCH_HIGH_RISK_EDD',
        confidenceScore: 0.79,
        summaryRationale:
          'Executive Board Director with parliamentary ties and international defense consulting links.',
        calculatedAt: '2026-09-04T10:00:00Z',
        modelVersion: 'gemini-1.5-pro-aml-v3.2',
        promptVersion: 'prom-aml-mat-v2.1',
        isHumanDecision: false,
      },
      primaryNextAction: 'Compliance Officer Adjudication: Approve with Conditions or Escalate to MLRO',
    };
    this.investigations.set(inv3Id, inv3);

    // Create Compliance Escalation
    const esc3 = this.escalationEngine.createEscalation({
      investigationId: inv3Id,
      caseId: 'case-apex-corp-01',
      caseReference: 'CAS-2026-0891',
      customerName: 'Sir Arthur Pendelton',
      priority: 'HIGH',
      reason: 'PEP_INVOLVEMENT',
      queue: 'ESCALATIONS_COMPLIANCE',
      requiredEvidence: ['art-01'],
      rationaleNotes:
        'Director occupies politically sensitive advisory roles in UK parliament committees whilst holding board seat in investigated energy trading group.',
      actor: { id: DEMO_USERS.CHECKER.id, name: DEMO_USERS.CHECKER.name, role: 'CHECKER' },
    });
    inv3.activeEscalationId = esc3.id;

    // -------------------------------------------------------------
    // 4. inv-apex-04: Escalated to MLRO (Statutory SAR Queue)
    // Subject: Carlos Mendez-Silva (Signatory, Sanctions Nexus)
    // -------------------------------------------------------------
    const inv4Id = 'inv-apex-04';
    const inv4: Investigation = {
      id: inv4Id,
      caseId: 'case-apex-corp-01',
      caseReference: 'CAS-2026-0891',
      subjectId: 'sbj-apex-04',
      subjectName: 'Carlos Mendez-Silva [SYNTHETIC]',
      status: 'ESCALATED_MLRO',
      priority: 'URGENT',
      assignedAnalystId: DEMO_USERS.ANALYST.id,
      assignedAnalystName: DEMO_USERS.ANALYST.name,
      assignedReviewerId: DEMO_USERS.CHECKER.id,
      assignedReviewerName: DEMO_USERS.CHECKER.name,
      slaDueDate: new Date(now.getTime() + 12 * 3600 * 1000).toISOString(),
      slaBreached: false,
      slaRemainingMs: 12 * 3600 * 1000,
      totalEventsCount: 1,
      unresolvedContradictionsCount: 0,
      pendingTasksCount: 1,
      reworkCount: 0,
      createdAt: '2026-09-04T08:00:00Z',
      updatedAt: '2026-09-07T17:30:00Z',
      summary: 'Authorized signatory linked to Gulf of Oman crude transshipments and maritime sanctions.',
      blockingConditions: ['Critical sanctions screening match identified'],
      tags: ['Sanctions', 'Maritime', 'Signatory', 'Critical'],
      aiRecommendation: {
        id: 'ai-rec-04',
        materialityRecommendation: 'MATCH_CRITICAL_SAR_CONSIDERATION',
        confidenceScore: 0.95,
        summaryRationale:
          'Signatory associated with maritime shipping manifests to sanctioned ports and suspected oil price-cap evasion feeder transfers.',
        calculatedAt: '2026-09-05T08:00:00Z',
        modelVersion: 'gemini-1.5-pro-aml-v3.2',
        promptVersion: 'prom-aml-mat-v2.1',
        isHumanDecision: false,
      },
      primaryNextAction: 'Statutory MLRO Adjudication: SAR Filing Determination',
    };
    this.investigations.set(inv4Id, inv4);

    const esc4 = this.escalationEngine.createEscalation({
      investigationId: inv4Id,
      caseId: 'case-apex-corp-01',
      caseReference: 'CAS-2026-0891',
      customerName: 'Carlos Mendez-Silva',
      priority: 'CRITICAL',
      reason: 'SANCTIONS_EXPOSURE',
      queue: 'ESCALATIONS_MLRO',
      requiredEvidence: ['art-03-ar'],
      rationaleNotes:
        'Maritime shipping intelligence indicates authorized signatory facilitated crude oil transshipments in Gulf of Oman potentially breaching international sanctions regimes.',
      actor: {
        id: DEMO_USERS.COMPLIANCE_OFFICER.id,
        name: DEMO_USERS.COMPLIANCE_OFFICER.name,
        role: 'COMPLIANCE_OFFICER',
      },
    });
    inv4.activeEscalationId = esc4.id;

    // -------------------------------------------------------------
    // 5. inv-apex-05: Rework Requested (Returned by Checker)
    // -------------------------------------------------------------
    const inv5Id = 'inv-apex-05';
    const inv5: Investigation = {
      id: inv5Id,
      caseId: 'case-apex-corp-01',
      caseReference: 'CAS-2026-0891',
      subjectId: 'sbj-apex-01',
      subjectName: 'Alexander Vance (Historical Review)',
      status: 'REWORK_REQUESTED',
      priority: 'MEDIUM',
      assignedAnalystId: DEMO_USERS.ANALYST.id,
      assignedAnalystName: DEMO_USERS.ANALYST.name,
      assignedReviewerId: DEMO_USERS.CHECKER.id,
      assignedReviewerName: DEMO_USERS.CHECKER.name,
      slaDueDate: new Date(now.getTime() + 20 * 3600 * 1000).toISOString(),
      slaBreached: false,
      slaRemainingMs: 20 * 3600 * 1000,
      totalEventsCount: 1,
      unresolvedContradictionsCount: 1,
      pendingTasksCount: 1,
      reworkCount: 1,
      createdAt: '2026-09-02T10:00:00Z',
      updatedAt: '2026-09-06T18:00:00Z',
      summary: 'Historical adverse media review returned by Checker for missing court order validation.',
      blockingConditions: [],
      tags: ['Historical', 'Rework', 'Court Order Required'],
      aiRecommendation: {
        id: 'ai-rec-05',
        materialityRecommendation: 'POTENTIAL_MATCH_REVIEW_REQUIRED',
        confidenceScore: 0.72,
        summaryRationale: 'Adverse press allegations require corroboration.',
        calculatedAt: '2026-09-03T10:00:00Z',
        modelVersion: 'gemini-1.5-pro-aml-v3.2',
        promptVersion: 'prom-aml-mat-v2.1',
        isHumanDecision: false,
      },
      primaryNextAction: 'Address Checker Rework Checklist & Resubmit',
    };
    this.investigations.set(inv5Id, inv5);

    // Record review decision that returned for rework
    const reworkDecision = this.decisionLedger.recordReviewDecision(
      {
        investigationId: inv5Id,
        caseId: 'case-apex-corp-01',
        makerId: DEMO_USERS.ANALYST.id,
        decisionType: 'RETURN_FOR_REWORK',
        decisionNotes:
          'The initial submission failed to evaluate the primary Swiss Federal Court dismissal ruling in art-02, creating an incomplete picture of current legal status.',
        reworkReason: 'Missing independent verification of court dismissal order in Swiss cantonal docket.',
        reworkChecklist: [
          'Verify court dismissal docket number in Swiss Federal Criminal Court',
          'Document contradictory timeline between prosecution and court order',
          'Clarify whether client is currently subject to travel or asset restrictions',
        ],
        previousAnalystConclusionId: 'anc-prev-05',
        approvalEvidenceSummary: 'Returned: evidence adequacy checklist failed on contradictory court ruling.',
      },
      { id: DEMO_USERS.CHECKER.id, name: DEMO_USERS.CHECKER.name, role: 'CHECKER' }
    );
    inv5.currentReviewDecision = reworkDecision;

    // -------------------------------------------------------------
    // 6. inv-apex-06: Completed Adjudication (Full Audit Trail)
    // -------------------------------------------------------------
    const inv6Id = 'inv-apex-06';
    const inv6: Investigation = {
      id: inv6Id,
      caseId: 'case-apex-corp-01',
      caseReference: 'CAS-2026-0891',
      subjectId: 'sbj-apex-sig-dup',
      subjectName: 'Carlos Mendez Silva (Duplicate Ingestion)',
      status: 'COMPLETED',
      priority: 'LOW',
      assignedAnalystId: DEMO_USERS.ANALYST.id,
      assignedAnalystName: DEMO_USERS.ANALYST.name,
      assignedReviewerId: DEMO_USERS.CHECKER.id,
      assignedReviewerName: DEMO_USERS.CHECKER.name,
      slaDueDate: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
      slaBreached: false,
      slaRemainingMs: 0,
      totalEventsCount: 0,
      unresolvedContradictionsCount: 0,
      pendingTasksCount: 0,
      reworkCount: 0,
      createdAt: '2026-09-01T09:00:00Z',
      updatedAt: '2026-09-03T15:00:00Z',
      closedAt: '2026-09-03T15:00:00Z',
      summary: 'Duplicate internal KYC record from legacy core system migration. Exemption approved.',
      blockingConditions: [],
      tags: ['Duplicate', 'Legacy Merge', 'Closed'],
      aiRecommendation: {
        id: 'ai-rec-06',
        materialityRecommendation: 'DISMISSED_FALSE_POSITIVE',
        confidenceScore: 0.99,
        summaryRationale: 'Duplicate internal KYC record from legacy core system migration.',
        calculatedAt: '2026-09-01T09:00:00Z',
        modelVersion: 'gemini-1.5-pro-aml-v3.2',
        promptVersion: 'prom-aml-mat-v2.1',
        isHumanDecision: false,
      },
      primaryNextAction: 'None (Investigation Approved and Sign-off Complete)',
    };
    this.investigations.set(inv6Id, inv6);

    const conc6 = this.decisionLedger.recordAnalystConclusion(
      {
        investigationId: inv6Id,
        caseId: 'case-apex-corp-01',
        subjectId: 'sbj-apex-sig-dup',
        outcome: 'FALSE_POSITIVE',
        rationale:
          'Confirmed legacy duplicate record. No distinct customer exposure. In-scope for exemption merge.',
        evidenceConsidered: ['art-01'],
        contradictionsConsidered: [],
        recommendedNextAction: 'CLOSE_CASE',
        policyRequiredFields: {
          customerTenureVerified: true,
          pepStatusConfirmed: false,
          financialScaleAssessed: true,
          dualIndependentSourcesChecked: true,
          mitigatingEvidenceWeighed: true,
        },
        confidence: 'HIGH',
        submissionStatus: 'ACCEPTED',
      },
      { id: DEMO_USERS.ANALYST.id, name: DEMO_USERS.ANALYST.name, role: 'ANALYST' }
    );
    inv6.currentAnalystConclusion = conc6;

    const rev6 = this.decisionLedger.recordReviewDecision(
      {
        investigationId: inv6Id,
        caseId: 'case-apex-corp-01',
        makerId: DEMO_USERS.ANALYST.id,
        decisionType: 'APPROVE',
        decisionNotes: 'Four-eyes verification confirmed duplicate record status. Exemption approved.',
        previousAnalystConclusionId: conc6.id,
        approvalEvidenceSummary: 'Duplicate party verified via legacy core banking ID cross-reference.',
      },
      { id: DEMO_USERS.CHECKER.id, name: DEMO_USERS.CHECKER.name, role: 'CHECKER' }
    );
    inv6.currentReviewDecision = rev6;

    // Populate Initial Queue Items
    this.refreshQueueItems();
  }

  /**
   * Recompute work queues based on role assignment, status, and SLAs.
   */
  public refreshQueueItems() {
    this.queueItems.clear();

    for (const inv of this.investigations.values()) {
      let queueType: QueueItemType = 'ANALYST_TRIAGE';
      let assigneeId = inv.assignedAnalystId;

      if (inv.status === 'AWAITING_CHECKER') {
        queueType = 'CHECKER_REVIEW';
        assigneeId = inv.assignedReviewerId;
      } else if (inv.status === 'ESCALATED_COMPLIANCE') {
        queueType = 'COMPLIANCE_ESCALATIONS';
        assigneeId = DEMO_USERS.COMPLIANCE_OFFICER.id;
      } else if (inv.status === 'ESCALATED_MLRO') {
        queueType = 'MLRO_ESCALATIONS';
        assigneeId = DEMO_USERS.MLRO.id;
      } else if (inv.status === 'REWORK_REQUESTED') {
        queueType = 'REWORK_QUEUE';
        assigneeId = inv.assignedAnalystId;
      }

      const item: QueueItem = {
        id: `qitem-${inv.id}`,
        investigationId: inv.id,
        caseId: inv.caseId,
        caseReference: inv.caseReference,
        customerName: inv.subjectName,
        queueType,
        priority: inv.priority,
        assignedToId: assigneeId,
        assignedToName:
          assigneeId === DEMO_USERS.ANALYST.id
            ? DEMO_USERS.ANALYST.name
            : assigneeId === DEMO_USERS.CHECKER.id
            ? DEMO_USERS.CHECKER.name
            : assigneeId === DEMO_USERS.COMPLIANCE_OFFICER.id
            ? DEMO_USERS.COMPLIANCE_OFFICER.name
            : DEMO_USERS.MLRO.name,
        assignedRole:
          inv.status === 'AWAITING_CHECKER'
            ? 'CHECKER'
            : inv.status === 'ESCALATED_COMPLIANCE'
            ? 'COMPLIANCE_OFFICER'
            : inv.status === 'ESCALATED_MLRO'
            ? 'MLRO'
            : 'ANALYST',
        slaDueDate: inv.slaDueDate,
        slaBreached: inv.slaBreached,
        slaRemainingMs: Math.max(0, new Date(inv.slaDueDate).getTime() - Date.now()),
        status:
          inv.status === 'COMPLETED' || inv.status === 'CLOSED'
            ? 'COMPLETED'
            : inv.status === 'UNASSIGNED'
            ? 'PENDING'
            : 'IN_PROGRESS',
        investigationStatus: inv.status,
        summary: inv.summary,
        blockingConditionsCount: inv.blockingConditions.length,
        primaryNextAction: inv.primaryNextAction,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
      };

      this.queueItems.set(item.id, item);
    }
  }

  /**
   * Submit Analyst Disposition (AM-39).
   */
  public submitAnalystDisposition(
    investigationId: string,
    conclusionData: {
      outcome: DispositionOutcome;
      rationale: string;
      evidenceConsidered: string[];
      contradictionsConsidered?: Array<{ contradictionId: string; resolutionSummary: string }>;
      missingInformationNotes?: string;
      recommendedNextAction: RecommendedNextAction;
      policyRequiredFields: {
        customerTenureVerified: boolean;
        pepStatusConfirmed: boolean;
        financialScaleAssessed: boolean;
        dualIndependentSourcesChecked: boolean;
        mitigatingEvidenceWeighed: boolean;
      };
      confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    },
    actor: UserContext
  ): { investigation: Investigation; conclusion: AnalystConclusion } {
    const inv = this.investigations.get(investigationId);
    if (!inv) throw new Error(`Investigation ${investigationId} not found.`);

    if (!AuthorizationPolicyEngine.canSubmitAnalystDisposition(actor.role)) {
      throw new Error(`Role ${actor.role} is not authorized to submit structured analyst dispositions.`);
    }

    // Validate state machine transition to AWAITING_CHECKER
    const validation = WorkflowStateMachine.validateTransition(inv.status, 'AWAITING_CHECKER', actor, {
      hasDisposition: true,
      blockingConditions: inv.blockingConditions,
    });

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Record conclusion in decision ledger
    const conclusion = this.decisionLedger.recordAnalystConclusion(
      {
        ...conclusionData,
        investigationId,
        caseId: inv.caseId,
        subjectId: inv.subjectId,
        submissionStatus: 'SUBMITTED_FOR_REVIEW',
        contradictionsConsidered: conclusionData.contradictionsConsidered || [],
      },
      actor
    );

    // Update investigation status
    const prevStatus = inv.status;
    inv.status = 'AWAITING_CHECKER';
    inv.currentAnalystConclusion = conclusion;
    inv.updatedAt = new Date().toISOString();
    inv.primaryNextAction = 'Awaiting QA Checker Four-Eyes review and sign-off';

    // Clear autosaved draft upon successful submission
    this.draftService.clearDraft(investigationId, actor.id, 'ANALYST_DISPOSITION');

    // Audit transition
    const transition = WorkflowStateMachine.createTransitionRecord(
      investigationId,
      inv.caseId,
      prevStatus,
      'AWAITING_CHECKER',
      'SUBMIT_FOR_CHECKER_REVIEW',
      actor,
      conclusion.rationale,
      validation.checklist
    );
    this.workflowTransitions.push(transition);

    this.refreshQueueItems();
    return { investigation: inv, conclusion };
  }

  /**
   * Reviewer Four-Eyes Adjudication (AM-41).
   * Enforces Maker-Checker Segregation of Duties server-side: Checker != Maker!
   */
  public reviewAnalystSubmission(
    investigationId: string,
    reviewData: {
      decisionType: 'APPROVE' | 'RETURN_FOR_REWORK' | 'REASSIGN' | 'ESCALATE';
      decisionNotes: string;
      reworkReason?: string;
      reworkChecklist?: string[];
      escalateToQueue?: 'ESCALATIONS_COMPLIANCE' | 'ESCALATIONS_MLRO';
      approvalEvidenceSummary?: string;
    },
    actor: UserContext
  ): { investigation: Investigation; decision: ReviewDecision } {
    const inv = this.investigations.get(investigationId);
    if (!inv) throw new Error(`Investigation ${investigationId} not found.`);

    if (!AuthorizationPolicyEngine.canReviewAndApprove(actor.role)) {
      throw new Error(`Role ${actor.role} lacks QA Checker adjudication authority.`);
    }

    const makerId = inv.currentAnalystConclusion?.submittedBy || inv.assignedAnalystId || '';

    // Enforce Maker-Checker SoD: Checker cannot be the Maker!
    AuthorizationPolicyEngine.assertNoSelfApproval(makerId, actor.id, 'approve or review this investigation submission');

    const targetStatus: InvestigationStatus =
      reviewData.decisionType === 'APPROVE'
        ? 'COMPLETED'
        : reviewData.decisionType === 'RETURN_FOR_REWORK'
        ? 'REWORK_REQUESTED'
        : reviewData.escalateToQueue === 'ESCALATIONS_MLRO'
        ? 'ESCALATED_MLRO'
        : 'ESCALATED_COMPLIANCE';

    const validation = WorkflowStateMachine.validateTransition(inv.status, targetStatus, actor, {
      makerId,
      blockingConditions: inv.blockingConditions,
      reworkReasonProvided: !!reviewData.reworkReason,
    });

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Record review decision
    const decision = this.decisionLedger.recordReviewDecision(
      {
        investigationId,
        caseId: inv.caseId,
        makerId,
        decisionType: reviewData.decisionType,
        decisionNotes: reviewData.decisionNotes,
        reworkReason: reviewData.reworkReason,
        reworkChecklist: reviewData.reworkChecklist,
        previousAnalystConclusionId: inv.currentAnalystConclusion?.id || 'none',
        approvalEvidenceSummary:
          reviewData.approvalEvidenceSummary || 'Verified independent corroboration and policy requirements.',
      },
      actor
    );

    const prevStatus = inv.status;
    inv.status = targetStatus;
    inv.currentReviewDecision = decision;
    inv.updatedAt = new Date().toISOString();

    if (targetStatus === 'COMPLETED') {
      inv.primaryNextAction = 'Investigation approved and completed. Case is ready for final archiving.';
    } else if (targetStatus === 'REWORK_REQUESTED') {
      inv.reworkCount = (inv.reworkCount || 0) + 1;
      inv.primaryNextAction = `Rework requested by ${actor.name}. Review feedback and resubmit.`;
    } else {
      inv.primaryNextAction = `Escalated to ${targetStatus === 'ESCALATED_MLRO' ? 'MLRO' : 'Compliance'} queue.`;
    }

    // Record transition
    const transition = WorkflowStateMachine.createTransitionRecord(
      investigationId,
      inv.caseId,
      prevStatus,
      targetStatus,
      `REVIEWER_${reviewData.decisionType}`,
      actor,
      reviewData.decisionNotes,
      validation.checklist
    );
    this.workflowTransitions.push(transition);

    this.refreshQueueItems();
    return { investigation: inv, decision };
  }

  /**
   * Compliance Adjudication (AM-42).
   */
  public adjudicateCompliance(
    investigationId: string,
    decisionData: {
      outcome: ComplianceAuthorizedOutcome;
      rationale: string;
      conditionsAttached?: string[];
      furtherActions?: string[];
    },
    actor: UserContext
  ): { investigation: Investigation; decision: ComplianceDecision } {
    const inv = this.investigations.get(investigationId);
    if (!inv) throw new Error(`Investigation ${investigationId} not found.`);

    if (!AuthorizationPolicyEngine.canAuthorizeComplianceEscalation(actor.role)) {
      throw new Error(`Role ${actor.role} is not authorized to execute Compliance Adjudications.`);
    }

    const decision = this.decisionLedger.recordComplianceDecision(
      {
        investigationId,
        caseId: inv.caseId,
        escalationId: inv.activeEscalationId || 'esc-general',
        outcome: decisionData.outcome,
        rationale: decisionData.rationale,
        conditionsAttached: decisionData.conditionsAttached || [],
        furtherActions: decisionData.furtherActions || [],
        status: decisionData.outcome === 'SAR_FILING_RECOMMENDED' ? 'PENDING_MLRO' : 'FINAL',
      },
      actor
    );

    const prevStatus = inv.status;
    if (decisionData.outcome === 'SAR_FILING_RECOMMENDED') {
      inv.status = 'ESCALATED_MLRO';
      inv.primaryNextAction = 'Pending statutory SAR determination from MLRO';
    } else if (decisionData.outcome === 'DISMISS_ESCALATION') {
      inv.status = 'IN_PROGRESS';
      inv.primaryNextAction = 'Escalation dismissed by Compliance. Resume standard investigation.';
    } else {
      inv.status = 'COMPLETED';
      inv.primaryNextAction = `Compliance determination executed: ${decisionData.outcome}`;
    }

    inv.updatedAt = new Date().toISOString();

    const transition = WorkflowStateMachine.createTransitionRecord(
      investigationId,
      inv.caseId,
      prevStatus,
      inv.status,
      `COMPLIANCE_${decisionData.outcome}`,
      actor,
      decisionData.rationale
    );
    this.workflowTransitions.push(transition);

    this.refreshQueueItems();
    return { investigation: inv, decision };
  }

  /**
   * Statutory MLRO Determination (AM-42).
   */
  public executeMlroDetermination(
    investigationId: string,
    decisionData: {
      determination: MlroDetermination;
      sarFilingRequired: boolean;
      sarFilingReference?: string;
      rationale: string;
      regulatoryNoticeReference?: string;
    },
    actor: UserContext
  ): { investigation: Investigation; decision: MlroDecision } {
    const inv = this.investigations.get(investigationId);
    if (!inv) throw new Error(`Investigation ${investigationId} not found.`);

    if (!AuthorizationPolicyEngine.canExecuteMlroDetermination(actor.role)) {
      throw new Error(`Only the designated MLRO can execute statutory SAR determinations.`);
    }

    const decision = this.decisionLedger.recordMlroDecision(
      {
        investigationId,
        caseId: inv.caseId,
        escalationId: inv.activeEscalationId || 'esc-mlro-general',
        determination: decisionData.determination,
        sarFilingRequired: decisionData.sarFilingRequired,
        sarFilingReference: decisionData.sarFilingReference,
        rationale: decisionData.rationale,
        regulatoryNoticeReference: decisionData.regulatoryNoticeReference,
      },
      actor
    );

    const prevStatus = inv.status;
    inv.status = 'COMPLETED';
    inv.primaryNextAction = `Statutory MLRO determination recorded: ${decisionData.determination} (SAR Ref: ${
      decisionData.sarFilingReference || 'N/A'
    })`;
    inv.updatedAt = new Date().toISOString();

    const transition = WorkflowStateMachine.createTransitionRecord(
      investigationId,
      inv.caseId,
      prevStatus,
      'COMPLETED',
      `MLRO_${decisionData.determination}`,
      actor,
      decisionData.rationale
    );
    this.workflowTransitions.push(transition);

    this.refreshQueueItems();
    return { investigation: inv, decision };
  }
}

export const globalInvestigationStore = new InvestigationWorkflowStore();

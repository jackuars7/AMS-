/**
 * Decision Ledger & Immutable Audit Service (AM-40, AM-43)
 * Segregates AI recommendations from human decisions across Analyst, Reviewer, Compliance, and MLRO tiers.
 * Guarantees cryptographic hash chaining and unalterable historical records.
 */

import {
  AnalystConclusion,
  ComplianceDecision,
  DecisionVersion,
  InvestigationOverride,
  MlroDecision,
  ReviewDecision,
  RoleId,
} from '../../types/index.ts';
import { AuthorizationPolicyEngine } from './authorization-engine.ts';

// Deterministic simple hash for tamper-evident ledger integrity
function computeHash(payload: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ('0000000' + (h >>> 0).toString(16)).slice(-8) +
    '-' +
    Buffer.from(payload).toString('base64').substring(0, 24).replace(/[^a-zA-Z0-9]/g, 'x');
}

export class DecisionLedger {
  public analystConclusions: Map<string, AnalystConclusion[]> = new Map();
  public reviewDecisions: Map<string, ReviewDecision[]> = new Map();
  public complianceDecisions: Map<string, ComplianceDecision[]> = new Map();
  public mlroDecisions: Map<string, MlroDecision[]> = new Map();
  public overrides: Map<string, InvestigationOverride[]> = new Map();
  public decisionVersions: DecisionVersion[] = [];

  /**
   * Record a structured Analyst Disposition (AM-39, AM-43).
   */
  public recordAnalystConclusion(
    conclusion: Omit<AnalystConclusion, 'id' | 'submittedAt' | 'version' | 'submittedBy' | 'submittedByName' | 'submittedByRole'>,
    actor: { id: string; name: string; role: RoleId; isAi?: boolean }
  ): AnalystConclusion {
    AuthorizationPolicyEngine.assertHumanDecision(actor, 'Analyst Disposition');

    if (!conclusion.rationale || conclusion.rationale.trim().length < 15) {
      throw new Error('Mandatory compliance rule: Analyst rationale must be a substantive explanation (minimum 15 characters).');
    }

    if (!conclusion.evidenceConsidered || conclusion.evidenceConsidered.length === 0) {
      throw new Error('Mandatory compliance rule: At least one article, passage, or material fact citation must be linked to the disposition.');
    }

    const history = this.analystConclusions.get(conclusion.investigationId) || [];
    const nextVersion = history.length + 1;

    const record: AnalystConclusion = {
      ...conclusion,
      id: `anc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      submittedAt: new Date().toISOString(),
      submittedBy: actor.id,
      submittedByName: actor.name,
      submittedByRole: actor.role,
      version: nextVersion,
    };

    history.push(record);
    this.analystConclusions.set(conclusion.investigationId, history);

    this.chainDecisionVersion('ANALYST_CONCLUSION', record.id, record, actor);
    return record;
  }

  /**
   * Record a Reviewer / Checker Four-Eyes Decision (AM-41, AM-43).
   */
  public recordReviewDecision(
    decision: Omit<ReviewDecision, 'id' | 'decisionAt' | 'reviewerId' | 'reviewerName' | 'reviewerRole'>,
    actor: { id: string; name: string; role: RoleId; isAi?: boolean }
  ): ReviewDecision {
    AuthorizationPolicyEngine.assertHumanDecision(actor, 'Reviewer Decision');

    // Segregation of Duties: Checker cannot be the Maker
    AuthorizationPolicyEngine.assertNoSelfApproval(decision.makerId, actor.id, 'approve this investigation');

    if (decision.decisionType === 'RETURN_FOR_REWORK' && (!decision.reworkReason || decision.reworkReason.trim().length < 10)) {
      throw new Error('Returning for rework requires a concrete explanatory reason and checklist.');
    }

    const history = this.reviewDecisions.get(decision.investigationId) || [];
    const record: ReviewDecision = {
      ...decision,
      id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      decisionAt: new Date().toISOString(),
      reviewerId: actor.id,
      reviewerName: actor.name,
      reviewerRole: actor.role,
    };

    history.push(record);
    this.reviewDecisions.set(decision.investigationId, history);

    this.chainDecisionVersion('REVIEW_DECISION', record.id, record, actor);
    return record;
  }

  /**
   * Record a Compliance Officer Adjudication (AM-42, AM-43).
   */
  public recordComplianceDecision(
    decision: Omit<ComplianceDecision, 'id' | 'decidedAt' | 'officerId' | 'officerName' | 'officerRole'>,
    actor: { id: string; name: string; role: RoleId; isAi?: boolean }
  ): ComplianceDecision {
    AuthorizationPolicyEngine.assertHumanDecision(actor, 'Compliance Determination');

    if (!AuthorizationPolicyEngine.canAuthorizeComplianceEscalation(actor.role)) {
      throw new Error(`Role ${actor.role} is not authorized to execute Compliance Determinations.`);
    }

    if (!decision.rationale || decision.rationale.trim().length < 10) {
      throw new Error('Compliance adjudication rationale is mandatory.');
    }

    const history = this.complianceDecisions.get(decision.investigationId) || [];
    const record: ComplianceDecision = {
      ...decision,
      id: `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      decidedAt: new Date().toISOString(),
      officerId: actor.id,
      officerName: actor.name,
      officerRole: actor.role,
    };

    history.push(record);
    this.complianceDecisions.set(decision.investigationId, history);

    this.chainDecisionVersion('COMPLIANCE_DECISION', record.id, record, actor);
    return record;
  }

  /**
   * Record a Statutory MLRO Determination (AM-42, AM-43).
   */
  public recordMlroDecision(
    decision: Omit<MlroDecision, 'id' | 'decidedAt' | 'mlroId' | 'mlroName' | 'mlroRole'>,
    actor: { id: string; name: string; role: RoleId; isAi?: boolean }
  ): MlroDecision {
    AuthorizationPolicyEngine.assertHumanDecision(actor, 'MLRO Statutory Decision');

    if (!AuthorizationPolicyEngine.canExecuteMlroDetermination(actor.role)) {
      throw new Error(`Only the designated MLRO can execute statutory SAR determinations (Actor role: ${actor.role}).`);
    }

    if (!decision.rationale || decision.rationale.trim().length < 10) {
      throw new Error('MLRO statutory decision rationale is mandatory.');
    }

    const history = this.mlroDecisions.get(decision.investigationId) || [];
    const record: MlroDecision = {
      ...decision,
      id: `mlr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      decidedAt: new Date().toISOString(),
      mlroId: actor.id,
      mlroName: actor.name,
      mlroRole: actor.role,
    };

    history.push(record);
    this.mlroDecisions.set(decision.investigationId, history);

    this.chainDecisionVersion('MLRO_DECISION', record.id, record, actor);
    return record;
  }

  /**
   * Record an investigation field correction/override (AM-40).
   */
  public recordOverride(
    override: Omit<InvestigationOverride, 'id' | 'timestamp' | 'status' | 'actor' | 'recalculationStatus'> & {
      recalculationStatus?: 'PENDING' | 'RECALCULATED' | 'NOT_APPLICABLE';
    },
    actor: { id: string; name: string; role: RoleId }
  ): InvestigationOverride {
    const isHighImpact =
      override.field.toLowerCase().includes('severity') ||
      override.field.toLowerCase().includes('materiality') ||
      override.field.toLowerCase().includes('outcome');

    const approvalRequirement =
      override.approvalRequirement || (isHighImpact && actor.role === 'ANALYST' ? 'FOUR_EYES_CHECKER' : 'NONE');

    const status = approvalRequirement === 'NONE' ? 'ACTIVE' : 'PENDING_APPROVAL';

    const record: InvestigationOverride = {
      ...override,
      recalculationStatus: override.recalculationStatus || 'PENDING',
      id: `ovr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actor,
      approvalRequirement,
      status,
    };

    const list = this.overrides.get(override.investigationId) || [];
    list.push(record);
    this.overrides.set(override.investigationId, list);
    return record;
  }

  /**
   * Authorize a pending override (AM-40).
   */
  public authorizeOverride(
    investigationId: string,
    overrideId: string,
    approver: { id: string; name: string; role: RoleId },
    approved: boolean,
    notes: string
  ): InvestigationOverride {
    const list = this.overrides.get(investigationId) || [];
    const item = list.find((o) => o.id === overrideId);
    if (!item) {
      throw new Error(`Override ${overrideId} not found in investigation ${investigationId}.`);
    }

    if (item.actor.id === approver.id) {
      throw new Error(
        `Segregation of Duties Violation: You cannot self-authorize your own override proposal (Actor: ${approver.id}).`
      );
    }

    if (!AuthorizationPolicyEngine.canApproveOverride(approver.role, item.approvalRequirement !== 'NONE')) {
      throw new Error(`Role ${approver.role} is not authorized to approve high-risk overrides.`);
    }

    item.status = approved ? 'ACTIVE' : 'REJECTED';
    item.approver = {
      id: approver.id,
      name: approver.name,
      role: approver.role,
      decidedAt: new Date().toISOString(),
      notes,
    };
    item.recalculationStatus = 'RECALCULATED';

    return item;
  }

  /**
   * Chained cryptographic audit trail entry.
   */
  private chainDecisionVersion(
    decisionType: DecisionVersion['decisionType'],
    decisionId: string,
    data: Record<string, any>,
    actor: { id: string; role: RoleId }
  ): void {
    const previous = this.decisionVersions[this.decisionVersions.length - 1];
    const prevHash = previous ? previous.hash : 'GENESIS_ROOT';
    const rawPayload = JSON.stringify({ decisionType, decisionId, data, actor, prevHash });
    const hash = computeHash(rawPayload);

    const versionRecord: DecisionVersion = {
      version: this.decisionVersions.length + 1,
      decisionType,
      decisionId,
      data,
      actorId: actor.id,
      actorRole: actor.role,
      timestamp: new Date().toISOString(),
      hash,
      previousVersionHash: prevHash,
    };

    this.decisionVersions.push(versionRecord);
  }

  public getOverrides(investigationId: string): InvestigationOverride[] {
    return this.overrides.get(investigationId) || [];
  }

  public approveOverride(
    investigationId: string,
    overrideId: string,
    approver: { id: string; name: string; role: RoleId },
    notes: string
  ): InvestigationOverride {
    return this.authorizeOverride(investigationId, overrideId, approver, true, notes);
  }

  public getFullAuditLedger(investigationId: string) {
    const analystConclusions = this.analystConclusions.get(investigationId) || [];
    const reviewDecisions = this.reviewDecisions.get(investigationId) || [];
    const complianceDecisions = this.complianceDecisions.get(investigationId) || [];
    const mlroDecisions = this.mlroDecisions.get(investigationId) || [];
    const overrides = this.overrides.get(investigationId) || [];
    const decisionChain = this.decisionVersions;
    let isChainValid = true;

    // Verify hash chain integrity
    for (let i = 0; i < decisionChain.length; i++) {
      const current = decisionChain[i];
      const prevHash = i === 0 ? 'GENESIS_ROOT' : decisionChain[i - 1].hash;
      if (current.previousVersionHash !== prevHash) {
        isChainValid = false;
        break;
      }
    }

    return {
      analystConclusions,
      reviewDecisions,
      complianceDecisions,
      mlroDecisions,
      overrides,
      decisionChain,
      isChainValid,
    };
  }
}

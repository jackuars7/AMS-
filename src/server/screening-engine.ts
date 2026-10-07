/**
 * AM-01: Screening Population Management & Case Completion Blocker Engine
 */
import { KycCase, ObligationStatus, ScreeningObligation } from '../types/index.ts';
import { hasPermission, validateNoSelfApproval } from './rbac.ts';
import { AppStore } from './store.ts';

export class ScreeningEngine {
  constructor(private store: AppStore) {}

  /**
   * Resolves connected parties for a case against active policy version
   */
  public resolvePopulation(caseId: string, actorId: string, actorRole: any): { obligations: ScreeningObligation[]; blockingConditions: string[] } {
    const kycCase = this.store.cases.get(caseId);
    if (!kycCase) {
      throw new Error(`Case ${caseId} not found`);
    }

    const parties = Array.from(this.store.parties.values()).filter((p) => p.caseId === caseId);
    const generatedObligations: ScreeningObligation[] = [];

    for (const party of parties) {
      // Find or create subject
      let subject = Array.from(this.store.subjects.values()).find((s) => s.partyId === party.id);
      if (!subject) {
        subject = {
          id: `sbj-${party.id}`,
          caseId,
          partyId: party.id,
          primaryName: party.name,
          subjectType: party.partyType === 'INDIVIDUAL' ? 'NATURAL_PERSON' : 'LEGAL_ENTITY',
          role: party.role,
          ownershipPercentage: party.ownershipPercentage,
          jurisdiction: party.jurisdiction,
          attributes: [],
          aliases: [],
          completenessScore: 50,
          hasConflicts: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.store.subjects.set(subject.id, subject);
      }

      // Evaluate against policy engine
      const resolution = this.store.policyEngine.resolvePartyScreening({
        caseId,
        partyId: party.id,
        clientType: kycCase.customerType,
        subjectRole: party.role,
        jurisdiction: party.jurisdiction,
        ownershipPercentage: party.ownershipPercentage,
        customerRisk: kycCase.riskLevel,
      });

      if (resolution.requiresScreening) {
        // Check if obligation already exists
        let obligation = Array.from(this.store.obligations.values()).find(
          (ob) => ob.caseId === caseId && ob.partyId === party.id
        );

        if (!obligation) {
          obligation = {
            id: `ob-${party.id}`,
            caseId,
            partyId: party.id,
            subjectId: subject.id,
            partyName: party.name,
            partyRole: party.role,
            policyVersion: resolution.policyVersion,
            ruleId: resolution.matchedRules[0] || 'RULE-DEFAULT',
            mandatory: resolution.mandatory,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          this.store.obligations.set(obligation.id, obligation);
        }
        generatedObligations.push(obligation);
      }
    }

    const blockingConditions = this.evaluateBlockingConditions(caseId);
    kycCase.blockingConditions = blockingConditions;
    this.store.cases.set(caseId, kycCase);

    this.store.recordAudit({
      actorId,
      actorName: 'Screening Population Service',
      actorRole,
      action: 'POPULATION_RESOLVED',
      entityType: 'CASE',
      entityId: caseId,
      caseReference: kycCase.reference,
      correlationId: `corr-pop-${Date.now()}`,
      details: `Resolved ${generatedObligations.length} screening obligations for case ${kycCase.reference}. Active blockers: ${blockingConditions.length}.`,
    });

    return { obligations: generatedObligations, blockingConditions };
  }

  /**
   * Evaluates blocking conditions that prevent case completion
   */
  public evaluateBlockingConditions(caseId: string): string[] {
    const obligations = Array.from(this.store.obligations.values()).filter((ob) => ob.caseId === caseId);
    const blockers: string[] = [];

    for (const ob of obligations) {
      if (ob.mandatory) {
        if (ob.status === 'PENDING') {
          blockers.push(`Mandatory screening pending for ${ob.partyRole.replace('_', ' ')}: ${ob.partyName}`);
        } else if (ob.status === 'FAILED') {
          blockers.push(`Screening failed for ${ob.partyRole.replace('_', ' ')}: ${ob.partyName} (Source coverage or connector error)`);
        } else if (ob.status === 'RUNNING') {
          blockers.push(`Screening currently in progress for ${ob.partyName}`);
        } else if (ob.status === 'BLOCKED') {
          if (ob.exemption && ob.exemption.status === 'PENDING_APPROVAL') {
            blockers.push(`Exemption request pending secondary review for ${ob.partyName}`);
          } else {
            blockers.push(`Screening blocked for ${ob.partyName}`);
          }
        }
      }
    }

    return blockers;
  }

  /**
   * Request an exemption for a screening obligation
   */
  public requestExemption(params: {
    obligationId: string;
    reasonCode: 'LEGACY_CLEARED' | 'REGULATORY_CARVE_OUT' | 'DUPLICATE_ENTITY' | 'LOW_RISK_SUBSIDIARY' | 'OTHER';
    justification: string;
    evidenceReference: string;
    actor: { id: string; name: string; role: any };
  }): ScreeningObligation {
    const obligation = this.store.obligations.get(params.obligationId);
    if (!obligation) {
      throw new Error(`Obligation ${params.obligationId} not found`);
    }

    if (!hasPermission(params.actor.role, 'exemption:request')) {
      throw new Error(`User does not have permission 'exemption:request'`);
    }

    obligation.status = 'BLOCKED';
    obligation.exemption = {
      id: `ex-${Date.now()}`,
      obligationId: obligation.id,
      status: 'PENDING_APPROVAL',
      reasonCode: params.reasonCode,
      justification: params.justification,
      evidenceReference: params.evidenceReference,
      requestedBy: params.actor.id,
      requestedByName: params.actor.name,
      requestedAt: new Date().toISOString(),
    };
    obligation.updatedAt = new Date().toISOString();
    this.store.obligations.set(obligation.id, obligation);

    // Update case blocking conditions
    const kycCase = this.store.cases.get(obligation.caseId);
    if (kycCase) {
      kycCase.blockingConditions = this.evaluateBlockingConditions(kycCase.id);
      this.store.cases.set(kycCase.id, kycCase);
    }

    this.store.recordAudit({
      actorId: params.actor.id,
      actorName: params.actor.name,
      actorRole: params.actor.role,
      action: 'EXEMPTION_REQUESTED',
      entityType: 'EXEMPTION',
      entityId: obligation.exemption.id,
      caseReference: kycCase?.reference,
      correlationId: `corr-exreq-${Date.now()}`,
      details: `Exemption requested for ${obligation.partyName} (${params.reasonCode}): ${params.justification}`,
    });

    return obligation;
  }

  /**
   * Approve or reject an exemption (Enforces Segregation of Duties & permissions)
   */
  public adjudicateExemption(params: {
    obligationId: string;
    approved: boolean;
    notes: string;
    actor: { id: string; name: string; role: any };
  }): ScreeningObligation {
    const obligation = this.store.obligations.get(params.obligationId);
    if (!obligation || !obligation.exemption) {
      throw new Error(`Exemption request for obligation ${params.obligationId} not found`);
    }

    if (!hasPermission(params.actor.role, 'exemption:approve')) {
      throw new Error(`User does not have permission 'exemption:approve' to adjudicate exemptions`);
    }

    // Segregation of Duties Check: No self-approval!
    const sodCheck = validateNoSelfApproval(params.actor.id, obligation.exemption.requestedBy, 'exemption approval');
    if (!sodCheck.valid) {
      throw new Error(sodCheck.error);
    }

    if (params.approved) {
      obligation.exemption.status = 'APPROVED';
      obligation.exemption.approvedBy = params.actor.id;
      obligation.exemption.approvedByName = params.actor.name;
      obligation.exemption.approvedAt = new Date().toISOString();
      obligation.exemption.approvalNotes = params.notes;
      obligation.status = 'EXEMPTED'; // Valid state to unblock case completion
    } else {
      obligation.exemption.status = 'REJECTED';
      obligation.exemption.approvalNotes = params.notes;
      obligation.status = 'PENDING'; // Returns to pending screening
    }

    obligation.updatedAt = new Date().toISOString();
    this.store.obligations.set(obligation.id, obligation);

    // Update case blockers
    const kycCase = this.store.cases.get(obligation.caseId);
    if (kycCase) {
      kycCase.blockingConditions = this.evaluateBlockingConditions(kycCase.id);
      this.store.cases.set(kycCase.id, kycCase);
    }

    this.store.recordAudit({
      actorId: params.actor.id,
      actorName: params.actor.name,
      actorRole: params.actor.role,
      action: params.approved ? 'EXEMPTION_APPROVED' : 'EXEMPTION_REJECTED',
      entityType: 'EXEMPTION',
      entityId: obligation.exemption.id,
      caseReference: kycCase?.reference,
      correlationId: `corr-exadj-${Date.now()}`,
      details: `Exemption ${params.approved ? 'approved' : 'rejected'} for ${obligation.partyName} by ${params.actor.name}. Notes: ${params.notes}`,
    });

    return obligation;
  }

  /**
   * Attempt case completion; checks blocking invariants
   */
  public attemptCaseCompletion(caseId: string, actor: { id: string; name: string; role: any }): { success: boolean; kycCase?: KycCase; error?: string } {
    const kycCase = this.store.cases.get(caseId);
    if (!kycCase) {
      return { success: false, error: `Case ${caseId} not found` };
    }

    if (!hasPermission(actor.role, 'case:approve_close')) {
      return { success: false, error: `Role ${actor.role} does not have 'case:approve_close' permission` };
    }

    const blockers = this.evaluateBlockingConditions(caseId);
    if (blockers.length > 0) {
      return {
        success: false,
        error: `Case Completion BLOCKED: ${blockers.length} mandatory screening obligation(s) unresolved:\n- ${blockers.join('\n- ')}`,
      };
    }

    kycCase.status = 'COMPLETED';
    kycCase.investigationStatus = 'CLOSED';
    kycCase.screeningStatus = 'COMPLETED';
    kycCase.updatedAt = new Date().toISOString();
    kycCase.blockingConditions = [];
    kycCase.primaryNextAction = 'Case successfully completed and archived with full audit pack';
    this.store.cases.set(caseId, kycCase);

    this.store.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CASE_COMPLETED',
      entityType: 'CASE',
      entityId: caseId,
      caseReference: kycCase.reference,
      correlationId: `corr-complete-${Date.now()}`,
      details: `Case ${kycCase.reference} marked as COMPLETED by ${actor.name} (${actor.role}). All mandatory screening obligations satisfied.`,
    });

    return { success: true, kycCase };
  }
}

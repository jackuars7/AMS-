/**
 * Workflow State Machine (AM-38 to AM-41)
 * Enforces valid lifecycle transitions, role authorizations, maker-checker separation, and auditability.
 */

import {
  Investigation,
  InvestigationStatus,
  RoleId,
  WorkflowTransition,
} from '../../types/index.ts';

export interface TransitionValidationResult {
  valid: boolean;
  error?: string;
  checklist: Record<string, boolean>;
}

export class WorkflowStateMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<InvestigationStatus, InvestigationStatus[]> = {
    UNASSIGNED: ['TRIAGE', 'IN_PROGRESS'],
    TRIAGE: ['IN_PROGRESS', 'UNASSIGNED', 'ESCALATED_COMPLIANCE'],
    IN_PROGRESS: ['AWAITING_CHECKER', 'ESCALATED_COMPLIANCE', 'ESCALATED_MLRO', 'PENDING_EXEMPTIONS'],
    PENDING_EXEMPTIONS: ['IN_PROGRESS', 'AWAITING_CHECKER'],
    AWAITING_CHECKER: ['COMPLETED', 'REWORK_REQUESTED', 'ESCALATED_COMPLIANCE', 'ESCALATED_MLRO', 'IN_PROGRESS'],
    REWORK_REQUESTED: ['IN_PROGRESS', 'AWAITING_CHECKER'],
    ESCALATED_COMPLIANCE: ['ESCALATED_MLRO', 'COMPLETED', 'CLOSED', 'READY_FOR_DECISION', 'IN_PROGRESS'],
    ESCALATED_MLRO: ['COMPLETED', 'CLOSED', 'ESCALATED_COMPLIANCE', 'READY_FOR_DECISION'],
    READY_FOR_DECISION: ['COMPLETED', 'CLOSED', 'ESCALATED_MLRO'],
    COMPLETED: ['CLOSED'],
    CLOSED: [],
  };

  /**
   * Validate if a transition is structurally and policy-permitted.
   */
  public static validateTransition(
    currentStatus: InvestigationStatus,
    targetStatus: InvestigationStatus,
    actor: { id: string; role: RoleId; name: string },
    context: {
      makerId?: string;
      hasDisposition?: boolean;
      unresolvedContradictions?: number;
      pendingMandatoryTasks?: number;
      blockingConditions?: string[];
      reworkReasonProvided?: boolean;
      complianceRationaleProvided?: boolean;
    }
  ): TransitionValidationResult {
    const checklist: Record<string, boolean> = {
      isAllowedGraphPath: false,
      hasRolePermission: false,
      passesSegregationOfDuties: true,
      hasMandatoryDisposition: true,
      noBlockingConditions: true,
      noUnresolvedTasks: true,
    };

    // 1. Check graph path
    const allowedTargets = this.ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowedTargets.includes(targetStatus)) {
      return {
        valid: false,
        error: `Invalid workflow transition: cannot move investigation from ${currentStatus} to ${targetStatus}.`,
        checklist,
      };
    }
    checklist.isAllowedGraphPath = true;

    // 2. Role permissions for target states
    if (targetStatus === 'AWAITING_CHECKER') {
      if (actor.role !== 'ANALYST' && actor.role !== 'CHECKER') {
        return {
          valid: false,
          error: `Only Analysts can submit investigations for Four-Eyes review (Actor role: ${actor.role}).`,
          checklist,
        };
      }
      checklist.hasRolePermission = true;

      if (!context.hasDisposition) {
        checklist.hasMandatoryDisposition = false;
        return {
          valid: false,
          error: 'Cannot submit for review: structured analyst disposition (AM-39) is mandatory.',
          checklist,
        };
      }
    } else if (targetStatus === 'COMPLETED' || targetStatus === 'CLOSED') {
      if (
        actor.role !== 'CHECKER' &&
        actor.role !== 'COMPLIANCE_OFFICER' &&
        actor.role !== 'MLRO'
      ) {
        return {
          valid: false,
          error: `Role ${actor.role} lacks adjudication authority to approve and complete case investigations.`,
          checklist,
        };
      }
      checklist.hasRolePermission = true;

      // Segregation of Duties (Maker-Checker): No self-approval
      if (context.makerId && context.makerId === actor.id) {
        checklist.passesSegregationOfDuties = false;
        return {
          valid: false,
          error: `Segregation of Duties Violation: Maker (${context.makerId}) cannot act as Checker to approve their own investigation submission.`,
          checklist,
        };
      }

      // Check blockers
      if (context.blockingConditions && context.blockingConditions.length > 0) {
        checklist.noBlockingConditions = false;
        return {
          valid: false,
          error: `Case sign-off blocked: active screening blockers remain unfulfilled (${context.blockingConditions.join(', ')}).`,
          checklist,
        };
      }

      if (context.pendingMandatoryTasks && context.pendingMandatoryTasks > 0) {
        checklist.noUnresolvedTasks = false;
        return {
          valid: false,
          error: `Case sign-off blocked: ${context.pendingMandatoryTasks} mandatory investigation task(s) remain open.`,
          checklist,
        };
      }
    } else if (targetStatus === 'REWORK_REQUESTED') {
      if (actor.role !== 'CHECKER' && actor.role !== 'COMPLIANCE_OFFICER' && actor.role !== 'MLRO') {
        return {
          valid: false,
          error: `Only QA Checkers or Compliance Officers can return an investigation for rework.`,
          checklist,
        };
      }
      checklist.hasRolePermission = true;

      if (!context.reworkReasonProvided) {
        return {
          valid: false,
          error: 'Detailed rework reason and checklist are mandatory when returning an investigation.',
          checklist,
        };
      }
    } else if (targetStatus === 'ESCALATED_COMPLIANCE') {
      if (
        actor.role !== 'ANALYST' &&
        actor.role !== 'CHECKER' &&
        actor.role !== 'COMPLIANCE_OFFICER'
      ) {
        return {
          valid: false,
          error: `Role ${actor.role} cannot escalate to Compliance.`,
          checklist,
        };
      }
      checklist.hasRolePermission = true;
    } else if (targetStatus === 'ESCALATED_MLRO') {
      if (
        actor.role !== 'CHECKER' &&
        actor.role !== 'COMPLIANCE_OFFICER' &&
        actor.role !== 'MLRO'
      ) {
        return {
          valid: false,
          error: `Direct MLRO escalation requires Reviewer or Compliance Officer authorization.`,
          checklist,
        };
      }
      checklist.hasRolePermission = true;
    } else {
      checklist.hasRolePermission = true;
    }

    return {
      valid: true,
      checklist,
    };
  }

  /**
   * Create an immutable audit transition record.
   */
  public static createTransitionRecord(
    investigationId: string,
    caseId: string,
    fromStatus: InvestigationStatus,
    toStatus: InvestigationStatus,
    action: string,
    actor: { id: string; name: string; role: RoleId },
    rationale?: string,
    checklist: Record<string, boolean> = {}
  ): WorkflowTransition {
    return {
      id: `wft-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      investigationId,
      caseId,
      fromStatus,
      toStatus,
      action,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      timestamp: new Date().toISOString(),
      rationale,
      validationChecklist: checklist,
    };
  }
}

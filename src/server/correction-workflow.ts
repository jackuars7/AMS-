/**
 * AM-21 to AM-27 Human Correction Workflow Engine
 * Records, audits, and applies analyst and checker corrections to AI-extracted findings.
 * Ensures all modifications require rationale, capture actor provenance, and remain reversible.
 */
import {
  ArticleExtractionBundle,
  ControlledLegalStatus,
  HumanCorrection,
  RoleId,
} from '../types/index.ts';
import { LegalStatusMachine } from './legal-status-machine.ts';

export interface CorrectionRequest {
  articleId: string;
  targetType: 'CLAIM' | 'FACT' | 'ENTITY' | 'CLASSIFICATION' | 'LEGAL_STATUS' | 'PASSAGE';
  targetId: string;
  fieldModified: string;
  newValue: unknown;
  rationale: string;
  actor: {
    id: string;
    name: string;
    role: RoleId;
  };
}

export class CorrectionWorkflowService {
  public static applyCorrection(
    bundle: ArticleExtractionBundle,
    request: CorrectionRequest
  ): { success: boolean; error?: string; correction?: HumanCorrection } {
    if (!request.rationale || request.rationale.trim().length < 5) {
      return { success: false, error: 'A valid rationale (minimum 5 characters) is mandatory for human corrections.' };
    }

    let previousValue: unknown = undefined;

    switch (request.targetType) {
      case 'CLAIM': {
        const claim = bundle.summary.claims.find((c) => c.id === request.targetId);
        if (!claim) return { success: false, error: `Claim ${request.targetId} not found.` };
        previousValue = (claim as any)[request.fieldModified];
        (claim as any)[request.fieldModified] = request.newValue;
        claim.validationState = 'HUMAN_CORRECTED';
        claim.validationNotes = `Corrected by ${request.actor.name}: ${request.rationale}`;
        break;
      }

      case 'FACT': {
        const fact = bundle.materialFacts.find((f) => f.id === request.targetId);
        if (!fact) return { success: false, error: `Material fact ${request.targetId} not found.` };
        previousValue = (fact as any)[request.fieldModified];
        (fact as any)[request.fieldModified] = request.newValue;
        fact.notes = `Modified by ${request.actor.name}: ${request.rationale}`;
        break;
      }

      case 'ENTITY': {
        const entity = bundle.entities.find((e) => e.id === request.targetId);
        if (!entity) return { success: false, error: `Entity ${request.targetId} not found.` };
        previousValue = (entity as any)[request.fieldModified];
        (entity as any)[request.fieldModified] = request.newValue;
        break;
      }

      case 'CLASSIFICATION': {
        const cls = bundle.classifications.find((c) => c.id === request.targetId);
        if (!cls) return { success: false, error: `Classification ${request.targetId} not found.` };
        previousValue = (cls as any)[request.fieldModified];
        (cls as any)[request.fieldModified] = request.newValue;
        cls.assignedBy = 'HUMAN_ANALYST';
        cls.reviewNotes = `Reviewed by ${request.actor.name}: ${request.rationale}`;
        break;
      }

      case 'LEGAL_STATUS': {
        const newStatus = request.newValue as ControlledLegalStatus;
        const currentStatus = bundle.legalStatus.status;
        const check = LegalStatusMachine.isTransitionAllowed(currentStatus, newStatus);
        if (!check.allowed) {
          return { success: false, error: check.ruleDescription || 'Invalid legal status transition' };
        }

        previousValue = bundle.legalStatus.status;
        bundle.legalStatus.previousStatus = currentStatus;
        bundle.legalStatus.status = newStatus;
        bundle.legalStatus.validationState = 'HUMAN_OVERRIDDEN';
        bundle.legalStatus.transitionRationale = request.rationale;
        bundle.legalStatus.recordedBy = request.actor.name;
        bundle.legalStatus.recordedAt = new Date().toISOString();
        break;
      }

      default:
        return { success: false, error: `Unsupported targetType: ${request.targetType}` };
    }

    const correction: HumanCorrection = {
      id: `corr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      articleId: request.articleId,
      targetType: request.targetType,
      targetId: request.targetId,
      fieldModified: request.fieldModified,
      previousValue,
      newValue: request.newValue,
      rationale: request.rationale,
      actorId: request.actor.id,
      actorName: request.actor.name,
      actorRole: request.actor.role,
      timestamp: new Date().toISOString(),
      isReversible: true,
    };

    bundle.corrections.push(correction);
    bundle.summary.humanReviewed = true;
    bundle.summary.reviewedBy = request.actor.name;
    bundle.summary.reviewedAt = new Date().toISOString();

    return { success: true, correction };
  }

  public static revertCorrection(
    bundle: ArticleExtractionBundle,
    correctionId: string,
    actor: { id: string; name: string; role: RoleId },
    revertRationale: string
  ): { success: boolean; error?: string } {
    const correctionIndex = bundle.corrections.findIndex((c) => c.id === correctionId);
    if (correctionIndex === -1) {
      return { success: false, error: `Correction ${correctionId} not found.` };
    }

    const corr = bundle.corrections[correctionIndex];
    if (!corr.isReversible) {
      return { success: false, error: 'This correction is marked non-reversible.' };
    }

    // Reapply previous value
    switch (corr.targetType) {
      case 'CLAIM': {
        const claim = bundle.summary.claims.find((c) => c.id === corr.targetId);
        if (claim) {
          (claim as any)[corr.fieldModified] = corr.previousValue;
          claim.validationState = 'VALIDATED';
          claim.validationNotes = `Reverted by ${actor.name}: ${revertRationale}`;
        }
        break;
      }
      case 'FACT': {
        const fact = bundle.materialFacts.find((f) => f.id === corr.targetId);
        if (fact) {
          (fact as any)[corr.fieldModified] = corr.previousValue;
          fact.notes = `Reverted by ${actor.name}: ${revertRationale}`;
        }
        break;
      }
      case 'ENTITY': {
        const entity = bundle.entities.find((e) => e.id === corr.targetId);
        if (entity) {
          (entity as any)[corr.fieldModified] = corr.previousValue;
        }
        break;
      }
      case 'CLASSIFICATION': {
        const cls = bundle.classifications.find((c) => c.id === corr.targetId);
        if (cls) {
          (cls as any)[corr.fieldModified] = corr.previousValue;
        }
        break;
      }
      case 'LEGAL_STATUS': {
        bundle.legalStatus.status = corr.previousValue as ControlledLegalStatus;
        bundle.legalStatus.validationState = 'VALIDATED';
        bundle.legalStatus.transitionRationale = `Reverted by ${actor.name}: ${revertRationale}`;
        break;
      }
    }

    // Remove or mark reverted
    bundle.corrections.splice(correctionIndex, 1);
    return { success: true };
  }
}

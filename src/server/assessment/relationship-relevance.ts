/**
 * AM-33: Relationship Relevance Assessment Service
 * Evaluates the corporate, legal, and operational proximity of the subject to the alleged conduct.
 * Distinguishes direct culpable actors from incidental mentions or out-of-tenure executives.
 */
import {
  RelevanceAssessment,
  RelevanceTier,
  SubjectRelationshipType,
  ControlLevel,
} from '../../types/index.ts';

export interface RelationshipRelevanceInput {
  eventId: string;
  subjectId: string;
  subjectName: string;
  relationshipType: SubjectRelationshipType;
  controlLevel: ControlLevel;
  roleAtEventTime: string;
  currentRole: string;
  relationshipStartDate?: string;
  relationshipEndDate?: string;
  eventDate?: string | null;
  distanceFromCustomer?: number; // 0 = Direct customer, 1 = 1st degree, 2 = 2nd degree
  serviceContext?: string;
}

export class RelationshipRelevanceEvaluator {
  public static evaluateRelevance(input: RelationshipRelevanceInput): RelevanceAssessment {
    const rationales: string[] = [];

    // 1. Tenure Alignment Evaluation
    let eventWithinTenure = true;
    if (input.eventDate && (input.relationshipStartDate || input.relationshipEndDate)) {
      const eventYear = new Date(input.eventDate).getFullYear();
      if (input.relationshipStartDate) {
        const startYear = new Date(input.relationshipStartDate).getFullYear();
        if (eventYear < startYear) {
          eventWithinTenure = false;
          rationales.push(
            `Conduct occurred in ${eventYear}, prior to subject's tenure start (${startYear}); substantial mitigating factor.`
          );
        }
      }
      if (input.relationshipEndDate) {
        const endYear = new Date(input.relationshipEndDate).getFullYear();
        if (eventYear > endYear) {
          eventWithinTenure = false;
          rationales.push(
            `Conduct occurred in ${eventYear}, after subject departed organization (${endYear}); substantial mitigating factor.`
          );
        }
      }
      if (eventWithinTenure) {
        rationales.push(
          `Conduct occurred contemporaneously during subject's active tenure as ${input.roleAtEventTime}.`
        );
      }
    } else {
      rationales.push(
        `Subject actively associated as ${input.roleAtEventTime}; contemporaneous nexus established.`
      );
    }

    // 2. Base Relationship Type Weight (40%)
    let relWeight = 0.5;
    switch (input.relationshipType) {
      case 'DIRECT_TARGET':
        relWeight = 1.0;
        rationales.push('Subject is the named primary target / defendant of the adverse proceeding.');
        break;
      case 'BENEFICIAL_OWNER':
        relWeight = 0.95;
        rationales.push('Subject holds Ultimate Beneficial Ownership (UBO) over the implicated entity.');
        break;
      case 'OFFICER_DIRECTOR':
        relWeight = 0.85;
        rationales.push('Subject held executive fiduciary / director oversight over entity operations.');
        break;
      case 'SUBSIDIARY_ENTITY':
      case 'AFFILIATE':
        relWeight = 0.65;
        rationales.push('Entity is a direct affiliate or subsidiary within the subject corporate group.');
        break;
      case 'SHAREHOLDER':
        relWeight = 0.5;
        rationales.push('Subject holds equity interest without active executive management.');
        break;
      case 'INTERMEDIARY':
        relWeight = 0.4;
        rationales.push('Subject served as commercial intermediary or facilitator.');
        break;
      case 'INCIDENTAL_MENTION':
      default:
        relWeight = 0.15;
        rationales.push('Subject appears purely as incidental or background reference.');
        break;
    }

    // 3. Control Level Weight (30%)
    let controlWeight = 0.5;
    switch (input.controlLevel) {
      case 'DIRECT_EXECUTIVE_CONTROL':
        controlWeight = 1.0;
        rationales.push('Direct operational executive signing authority over transactions.');
        break;
      case 'SUBSTANTIAL_OWNERSHIP':
        controlWeight = 0.9;
        rationales.push('Substantial controlling interest (>25% shareholding or voting rights).');
        break;
      case 'FORMAL_GOVERNANCE':
        controlWeight = 0.7;
        rationales.push('Formal supervisory board or governance role.');
        break;
      case 'MINORITY_PASSIVE':
        controlWeight = 0.3;
        rationales.push('Passive minority stake without governance rights.');
        break;
      case 'NONE':
      default:
        controlWeight = 0.1;
        break;
    }

    // 4. Distance From Customer (15%)
    const distance = input.distanceFromCustomer ?? 0;
    const distanceFactor = distance === 0 ? 1.0 : distance === 1 ? 0.75 : 0.4;
    rationales.push(
      distance === 0
        ? 'Direct relationship (Degree 0: Customer itself or named principal).'
        : `Indirect relationship (Degree ${distance} through corporate entity chain).`
    );

    // 5. Tenure Factor (15%)
    const tenureFactor = eventWithinTenure ? 1.0 : 0.25;

    // Calculate Final Relevance Score (0.0 - 1.0)
    const rawScore =
      relWeight * 0.4 +
      controlWeight * 0.3 +
      distanceFactor * 0.15 +
      tenureFactor * 0.15;

    const relevanceScore = Math.round(Math.min(1.0, Math.max(0.0, rawScore)) * 100) / 100;

    let relevanceTier: RelevanceTier = 'MODERATE_NEXUS';
    if (relevanceScore >= 0.85) relevanceTier = 'DIRECT_PRIMARY';
    else if (relevanceScore >= 0.7) relevanceTier = 'HIGH_RELEVANCE';
    else if (relevanceScore >= 0.45) relevanceTier = 'MODERATE_NEXUS';
    else if (relevanceScore >= 0.2) relevanceTier = 'TENUOUS';
    else relevanceTier = 'IRRELEVANT';

    return {
      id: `rel-${input.eventId}-${Date.now().toString(36)}`,
      eventId: input.eventId,
      subjectId: input.subjectId,
      subjectName: input.subjectName,
      relationshipType: input.relationshipType,
      controlLevel: input.controlLevel,
      roleAtEventTime: input.roleAtEventTime,
      currentRole: input.currentRole,
      relationshipStartDate: input.relationshipStartDate,
      relationshipEndDate: input.relationshipEndDate,
      eventWithinTenure,
      distanceFromCustomer: distance,
      serviceContext: input.serviceContext || 'Commercial Energy Trading & Transit Operations',
      relevanceScore,
      relevanceTier,
      rationales,
      assessedAt: new Date().toISOString(),
    };
  }
}

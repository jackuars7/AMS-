/**
 * AM-32: Evidence Strength Assessment Service
 * Evaluates evidentiary validity and factual rigor based on objective corroboration,
 * source credibility, legal standing, identity confidence, and specificity.
 * STRICT POLICY INVARIANT: Decoupled strictly from emotional/linguistic sentiment!
 */
import {
  EvidenceStrengthAssessment,
  EvidenceStrengthTier,
  ControlledLegalStatus,
  CorroborationLevel,
} from '../../types/index.ts';

export interface EvidenceStrengthInput {
  eventId: string;
  avgCredibilityScore: number; // 0.0 - 1.0
  corroborationLevel: CorroborationLevel;
  independentSourceCount: number;
  legalStatus: ControlledLegalStatus;
  identityConfidence: number; // 0.0 - 1.0 (from Subject assessment)
  specificityCount: {
    hasSpecificMonetaryAmounts: boolean;
    hasSpecificDates: boolean;
    hasCourtDocketNumbers: boolean;
    hasNamedParticipants: boolean;
  };
  contradictionsCount: number;
  retractionsCount: number;
  sentimentScoreIgnored?: number; // Explicit proof that sentiment is excluded
}

export class EvidenceStrengthEvaluator {
  public static evaluateStrength(input: EvidenceStrengthInput): EvidenceStrengthAssessment {
    const rationales: string[] = [];

    // 1. Credibility Contribution (25% max)
    const credibilityContribution = Math.round(input.avgCredibilityScore * 0.25 * 100) / 100;
    rationales.push(
      `Source credibility profile contributes +${Math.round(credibilityContribution * 100)}% to evidentiary weight.`
    );

    // 2. Corroboration Contribution (25% max)
    let independenceContribution = 0.1;
    if (input.independentSourceCount >= 3) {
      independenceContribution = 0.25;
      rationales.push('Extensive multi-source independent corroboration contributes maximum +25% weight.');
    } else if (input.independentSourceCount === 2) {
      independenceContribution = 0.2;
      rationales.push('Dual independent reporting provides strong +20% corroborative foundation.');
    } else {
      independenceContribution = 0.1;
      rationales.push('Single reporting channel limits corroborative contribution to +10%.');
    }

    // 3. Legal Status Procedural Milestone (20% max)
    let legalStatusContribution = 0.05;
    switch (input.legalStatus) {
      case 'CONVICTION':
        legalStatusContribution = 0.2;
        rationales.push('Adjudicated judicial conviction provides highest legal evidentiary certainty (+20%).');
        break;
      case 'TRIAL_PROCEEDING':
      case 'FORMAL_CHARGES_FILED':
      case 'ARREST_WARRANT':
        legalStatusContribution = 0.17;
        rationales.push('Formal prosecutorial filing / indictment confers substantial legal standing (+17%).');
        break;
      case 'INVESTIGATION':
        legalStatusContribution = 0.12;
        rationales.push('Active official regulatory/judicial inquiry establishes credible investigative basis (+12%).');
        break;
      case 'ALLEGATION':
        legalStatusContribution = 0.06;
        rationales.push('Unverified allegation carries modest baseline procedural weight (+6%).');
        break;
      case 'ACQUITTAL':
      case 'DISMISSAL':
      case 'RETRACTED':
        legalStatusContribution = 0.01;
        rationales.push('Exculpatory legal status (dismissal/acquittal) substantially lowers adverse evidence strength (+1%).');
        break;
      default:
        legalStatusContribution = 0.05;
        break;
    }

    // 4. Identity Match Certainty (15% max)
    const identityConfidenceContribution = Math.round(input.identityConfidence * 0.15 * 100) / 100;
    rationales.push(
      `Subject identity attribution confidence (${Math.round(input.identityConfidence * 100)}%) adds +${Math.round(identityConfidenceContribution * 100)}% reliability.`
    );

    // 5. Evidence Specificity (15% max)
    let specPoints = 0;
    if (input.specificityCount.hasSpecificMonetaryAmounts) specPoints += 0.04;
    if (input.specificityCount.hasSpecificDates) specPoints += 0.04;
    if (input.specificityCount.hasCourtDocketNumbers) specPoints += 0.04;
    if (input.specificityCount.hasNamedParticipants) specPoints += 0.03;
    const evidenceSpecificityContribution = Math.round(specPoints * 100) / 100;
    rationales.push(
      `Factual specificity (concrete amounts, dates, dockets, named co-participants) adds +${Math.round(evidenceSpecificityContribution * 100)}%.`
    );

    // 6. Deductions for Contradictions & Retractions
    let deductionsForContradictions = 0;
    if (input.contradictionsCount > 0) {
      deductionsForContradictions = Math.min(0.25, input.contradictionsCount * 0.1);
      rationales.push(
        `CRITICAL DEDUCTION: -${Math.round(deductionsForContradictions * 100)}% applied due to ${input.contradictionsCount} unresolved material contradiction(s).`
      );
    }

    let deductionsForRetractions = 0;
    if (input.retractionsCount > 0) {
      deductionsForRetractions = 0.4;
      rationales.push(
        `CRITICAL DEDUCTION: -40% applied due to documented publisher retraction on evidentiary sources.`
      );
    }

    // Raw Score
    const rawScore =
      credibilityContribution +
      independenceContribution +
      legalStatusContribution +
      identityConfidenceContribution +
      evidenceSpecificityContribution -
      deductionsForContradictions -
      deductionsForRetractions;

    const strengthScore = Math.round(Math.min(1.0, Math.max(0.0, rawScore)) * 100) / 100;

    let strengthTier: EvidenceStrengthTier = 'MODERATE';
    if (strengthScore >= 0.8) strengthTier = 'VERY_STRONG';
    else if (strengthScore >= 0.65) strengthTier = 'STRONG';
    else if (strengthScore >= 0.45) strengthTier = 'MODERATE';
    else if (strengthScore >= 0.25) strengthTier = 'WEAK';
    else strengthTier = 'UNSUPPORTED';

    rationales.push(
      'POLICY INVARIANT COMPLIANCE: Evidence strength computed strictly from objective verification criteria; sentiment tone analysis is explicitly decoupled.'
    );

    return {
      id: `evstr-${input.eventId}-${Date.now().toString(36)}`,
      eventId: input.eventId,
      strengthScore,
      strengthTier,
      credibilityContribution,
      independenceContribution,
      legalStatusContribution,
      identityConfidenceContribution,
      evidenceSpecificityContribution,
      deductionsForContradictions,
      deductionsForRetractions,
      sentimentIsolated: true,
      rationales,
      assessedAt: new Date().toISOString(),
    };
  }
}

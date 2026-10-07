/**
 * AM-34: Recency Assessment Service
 * Evaluates the temporal freshness, duration, and persistence of the adverse conduct.
 * Distinguishes continuing conduct and repeated patterns from aged, remediated, or legally dismissed events.
 */
import {
  RecencyAssessment,
  RecencyTier,
  ConductRecencyStatus,
  ControlledLegalStatus,
} from '../../types/index.ts';

export interface RecencyInput {
  eventId: string;
  eventDate: string | null;
  publicationDate: string;
  legalStatus: ControlledLegalStatus;
  isContinuingConduct?: boolean;
  hasRepeatedOccurrences?: boolean;
  remediationDocumented?: boolean;
  remediationDetails?: string;
}

export class RecencyEvaluator {
  public static evaluateRecency(input: RecencyInput): RecencyAssessment {
    const rationales: string[] = [];
    const now = new Date();

    const dateToEvaluate = input.eventDate ? new Date(input.eventDate) : new Date(input.publicationDate);
    const yearsElapsed = Math.max(
      0,
      Math.round(((now.getTime() - dateToEvaluate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10
    );

    const isContinuing = input.isContinuingConduct ?? false;
    const hasRepeated = input.hasRepeatedOccurrences ?? false;
    const remediationDocumented = input.remediationDocumented ?? false;

    // Determine Conduct Status
    let conductStatus: ConductRecencyStatus = 'HISTORIC_SINGLE_INCIDENT';
    if (input.legalStatus === 'ACQUITTAL' || input.legalStatus === 'DISMISSAL') {
      conductStatus = 'LEGAL_DISMISSAL';
      rationales.push('Legal proceeding concluded in formal acquittal / dismissal; historical risk mitigated.');
    } else if (remediationDocumented) {
      conductStatus = 'RESOLVED_REMEDIATED';
      rationales.push(
        `Documented organizational remediation verified: ${input.remediationDetails || 'Comprehensive compliance monitorship'}.`
      );
    } else if (isContinuing) {
      conductStatus = 'CONTINUING';
      rationales.push('CRITICAL RISK: Active, continuing conduct or ongoing live prosecutorial probe flagged.');
    } else if (hasRepeated) {
      conductStatus = 'REPEATED';
      rationales.push('Pattern of repeated conduct across multiple calendar years detected.');
    } else {
      conductStatus = 'HISTORIC_SINGLE_INCIDENT';
      rationales.push(`Single historical incident occurring approximately ${yearsElapsed} year(s) ago.`);
    }

    // Mathematical Recency Scoring (0.0 - 1.0)
    let baseTimeScore = 0.5;
    if (yearsElapsed <= 1.0) {
      baseTimeScore = 1.0;
      rationales.push(`Event occurred within last 12 months (${yearsElapsed} yrs ago) -> Maximum temporal recency.`);
    } else if (yearsElapsed <= 3.0) {
      baseTimeScore = 0.85;
      rationales.push(`Event occurred within standard 3-year lookback (${yearsElapsed} yrs ago).`);
    } else if (yearsElapsed <= 5.0) {
      baseTimeScore = 0.65;
      rationales.push(`Event occurred between 3 and 5 years ago (${yearsElapsed} yrs ago).`);
    } else if (yearsElapsed <= 10.0) {
      baseTimeScore = 0.4;
      rationales.push(`Aged conduct between 5 and 10 years ago (${yearsElapsed} yrs ago) -> Reduced weight.`);
    } else {
      baseTimeScore = 0.15;
      rationales.push(`Historical conduct older than 10 years (${yearsElapsed} yrs ago).`);
    }

    // Conduct Status Multipliers
    let statusMultiplier = 1.0;
    if (conductStatus === 'CONTINUING') {
      statusMultiplier = 1.25; // Boosts even older events if conduct continues!
      rationales.push('Continuing conduct override applied: persistence maintains active risk regardless of start date.');
    } else if (conductStatus === 'REPEATED') {
      statusMultiplier = 1.15;
      rationales.push('Recidivism / repeat pattern maintains heightened ongoing relevance.');
    } else if (conductStatus === 'RESOLVED_REMEDIATED') {
      statusMultiplier = 0.55; // Substantial discount for confirmed remediation
      rationales.push('Substantial discount applied for documented remediation.');
    } else if (conductStatus === 'LEGAL_DISMISSAL') {
      statusMultiplier = 0.25; // Formal dismissal minimizes recency relevance
      rationales.push('Legal dismissal discount applied.');
    }

    const recencyScore = Math.round(Math.min(1.0, Math.max(0.05, baseTimeScore * statusMultiplier)) * 100) / 100;

    let recencyTier: RecencyTier = 'MID_PERIOD';
    if (isContinuing || recencyScore >= 0.85) recencyTier = 'ACTIVE_CONTINUING';
    else if (recencyScore >= 0.65) recencyTier = 'RECENT_HIGH_RELEVANCE';
    else if (recencyScore >= 0.45) recencyTier = 'MID_PERIOD';
    else if (recencyScore >= 0.25) recencyTier = 'AGED_REDUCED_WEIGHT';
    else recencyTier = 'HISTORICAL_OUT_OF_SCOPE';

    return {
      id: `rec-${input.eventId}-${Date.now().toString(36)}`,
      eventId: input.eventId,
      eventDate: input.eventDate,
      publicationDate: input.publicationDate,
      yearsElapsed,
      conductStatus,
      isContinuingConduct: isContinuing,
      hasRepeatedOccurrences: hasRepeated,
      remediationDocumented,
      remediationDetails: input.remediationDetails,
      recencyScore,
      recencyTier,
      rationales,
      assessedAt: new Date().toISOString(),
    };
  }
}

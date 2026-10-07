/**
 * AM-35: Severity Assessment Service
 * Evaluates the quantitative magnitude, institutional harm, conduct category,
 * and regulatory penalty of the adverse conduct.
 */
import {
  SeverityAssessment,
  SeverityTier,
} from '../../types/index.ts';

export interface SeverityInput {
  eventId: string;
  conductType: string; // e.g. BRIBERY, SANCTIONS_EVASION, FRAUD, MONEY_LAUNDERING, TAX_EVASION, REGULATORY
  monetaryAmountUSD?: number;
  rawAmountText?: string;
  affectedPartiesCount?: number;
  seniorityOfInvolvedParties?: 'EXECUTIVE_C_SUITE' | 'SENIOR_MANAGEMENT' | 'OPERATIONAL_STAFF' | 'UNKNOWN';
  systemicNature?: 'SYSTEMIC_ORGANIZATIONAL' | 'REPEATED_DEPARTMENTAL' | 'ISOLATED_INDIVIDUAL';
  enforcementActionTaken?: boolean;
  penaltyImposed?: string;
  statutoryFramework?: string;
}

export class SeverityEvaluator {
  public static evaluateSeverity(input: SeverityInput): SeverityAssessment {
    const rationales: string[] = [];

    // 1. Conduct Type Inherent Risk (35%)
    let conductWeight = 0.5;
    const conduct = (input.conductType || '').toUpperCase();
    if (conduct.includes('BRIBERY') || conduct.includes('CORRUPTION') || conduct.includes('SANCTIONS')) {
      conductWeight = 1.0;
      rationales.push('Conduct involves primary financial crime (Bribery / Corruption / Sanctions Evasion) -> Inherent CRITICAL risk.');
    } else if (conduct.includes('MONEY_LAUNDERING') || conduct.includes('FRAUD') || conduct.includes('EMBEZZLEMENT')) {
      conductWeight = 0.9;
      rationales.push('Conduct involves high-impact financial crime (Money Laundering / Wire Fraud).');
    } else if (conduct.includes('TAX') || conduct.includes('INSIDER_TRADING')) {
      conductWeight = 0.75;
      rationales.push('Conduct involves market abuse or tax evasion.');
    } else if (conduct.includes('REGULATORY') || conduct.includes('COMPLIANCE')) {
      conductWeight = 0.55;
      rationales.push('Conduct involves administrative or regulatory reporting deficiencies.');
    } else {
      conductWeight = 0.4;
      rationales.push(`General commercial litigation or dispute (${input.conductType}).`);
    }

    // 2. Monetary Magnitude (25%)
    let moneyWeight = 0.3;
    const amountUSD = input.monetaryAmountUSD ?? 0;
    if (amountUSD >= 50_000_000) {
      moneyWeight = 1.0;
      rationales.push(`Extreme monetary magnitude (>= $50M USD: $${(amountUSD / 1e6).toFixed(1)}M USD).`);
    } else if (amountUSD >= 10_000_000) {
      moneyWeight = 0.85;
      rationales.push(`High monetary magnitude ($10M - $50M USD: $${(amountUSD / 1e6).toFixed(1)}M USD).`);
    } else if (amountUSD >= 1_000_000) {
      moneyWeight = 0.65;
      rationales.push(`Substantial monetary magnitude ($1M - $10M USD: $${(amountUSD / 1e6).toFixed(1)}M USD).`);
    } else if (amountUSD > 0) {
      moneyWeight = 0.45;
      rationales.push(`Moderate monetary amount (< $1M USD: $${amountUSD.toLocaleString()} USD).`);
    } else {
      moneyWeight = 0.3;
      rationales.push('No specific monetary loss or corrupt payment quantified in evidence.');
    }

    // 3. Seniority of Involved Parties (15%)
    let seniorWeight = 0.4;
    const seniority = input.seniorityOfInvolvedParties || 'EXECUTIVE_C_SUITE';
    if (seniority === 'EXECUTIVE_C_SUITE') {
      seniorWeight = 1.0;
      rationales.push('Conduct implicates Executive C-Suite leadership / Director oversight.');
    } else if (seniority === 'SENIOR_MANAGEMENT') {
      seniorWeight = 0.75;
      rationales.push('Conduct implicates senior managerial personnel.');
    } else {
      seniorWeight = 0.4;
      rationales.push('Conduct limited to operational staff without executive collusion.');
    }

    // 4. Systemic Nature vs Isolated Incident (15%)
    let systemicWeight = 0.4;
    const systemic = input.systemicNature || 'SYSTEMIC_ORGANIZATIONAL';
    if (systemic === 'SYSTEMIC_ORGANIZATIONAL') {
      systemicWeight = 1.0;
      rationales.push('Systemic organizational failure or enterprise-wide practice.');
    } else if (systemic === 'REPEATED_DEPARTMENTAL') {
      systemicWeight = 0.7;
      rationales.push('Multi-party departmental misconduct.');
    } else {
      systemicWeight = 0.3;
      rationales.push('Isolated individual rogue actor.');
    }

    // 5. Regulatory Enforcement & Penalties (10%)
    let enforceWeight = 0.3;
    if (input.penaltyImposed) {
      enforceWeight = 1.0;
      rationales.push(`Formal enforcement penalty imposed: ${input.penaltyImposed}.`);
    } else if (input.enforcementActionTaken) {
      enforceWeight = 0.8;
      rationales.push('Active formal enforcement action or asset freezing order in place.');
    } else {
      enforceWeight = 0.3;
      rationales.push('No formal punitive monetary sanction or license revocation ordered to date.');
    }

    // Calculate Final Severity Score (0.0 - 1.0)
    const rawScore =
      conductWeight * 0.35 +
      moneyWeight * 0.25 +
      seniorWeight * 0.15 +
      systemicWeight * 0.15 +
      enforceWeight * 0.1;

    const severityScore = Math.round(Math.min(1.0, Math.max(0.0, rawScore)) * 100) / 100;

    let severityTier: SeverityTier = 'MEDIUM';
    if (severityScore >= 0.85) severityTier = 'CRITICAL';
    else if (severityScore >= 0.7) severityTier = 'HIGH';
    else if (severityScore >= 0.45) severityTier = 'MEDIUM';
    else if (severityScore >= 0.25) severityTier = 'LOW';
    else severityTier = 'INFORMATIONAL';

    return {
      id: `sev-${input.eventId}-${Date.now().toString(36)}`,
      eventId: input.eventId,
      conductType: input.conductType,
      severityScore,
      severityTier,
      monetaryMagnitude: amountUSD
        ? {
            rawAmountText: input.rawAmountText || `$${amountUSD.toLocaleString()} USD`,
            amount: amountUSD,
            currency: 'USD',
            normalizedUSD: amountUSD,
          }
        : undefined,
      affectedPartiesCount: input.affectedPartiesCount,
      seniorityOfInvolvedParties: seniority,
      systemicNature: systemic,
      enforcementActionTaken: input.enforcementActionTaken ?? false,
      penaltyImposed: input.penaltyImposed,
      statutoryFramework: input.statutoryFramework || 'Swiss Criminal Code Art. 322ter / Foreign Corrupt Practices Act',
      rationales,
      assessedAt: new Date().toISOString(),
    };
  }
}

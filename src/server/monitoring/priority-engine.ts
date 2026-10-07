/**
 * AM-59: Monitoring Alert Prioritization Engine
 * Calculates transparent, explainable priority scores (0-100) and priority tiers
 * across 8 weighted operational factors:
 * 1. Customer Risk Rating (0-20 pts)
 * 2. Conduct / Update Severity (0-20 pts)
 * 3. Legal & Procedural Status (0-15 pts)
 * 4. Evidence Strength & Corroboration (0-15 pts)
 * 5. Relationship / Role Relevance (0-10 pts)
 * 6. Recency of Media & Event (0-10 pts)
 * 7. Identity Confidence Contribution (0-5 pts)
 * 8. Update Type Weight (0-5 pts)
 *
 * CRITICAL INVARIANT:
 * Priority score governs review urgency and SLA, but remains strictly independent
 * from final human disposition.
 */

import {
  PriorityAssessment,
  RiskRating,
} from '../../types/index.ts';

export interface PriorityCalculationInput {
  customerRisk: RiskRating;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  legalStatus: string; // e.g. 'FORMAL_INDICTMENT', 'CONVICTION', 'INVESTIGATION', 'CLEARED'
  evidenceStrengthScore: number; // 0.0 - 1.0
  relationshipRole: string; // e.g. 'UBO', 'DIRECTOR', 'SHAREHOLDER'
  daysSincePublished: number;
  identityMatchConfidence: number; // 0.0 - 1.0
  updateType: string; // e.g. 'CHARGE', 'CONVICTION', 'APPEAL', 'RETRACTION'
  ruleVersion?: string;
}

export class PriorityEngine {
  /**
   * Calculate deterministic priority score and assessment record
   */
  public calculatePriority(input: PriorityCalculationInput): PriorityAssessment {
    const version = input.ruleVersion || 'PR-MON-2026.1';

    // 1. Customer Risk Weight (max 20 pts)
    let customerRiskWeight = 5;
    if (input.customerRisk === 'HIGH') customerRiskWeight = 20;
    else if (input.customerRisk === 'MEDIUM') customerRiskWeight = 12;
    else customerRiskWeight = 6;

    // 2. Severity Weight (max 20 pts)
    let severityWeight = 5;
    if (input.severity === 'CRITICAL') severityWeight = 20;
    else if (input.severity === 'HIGH') severityWeight = 15;
    else if (input.severity === 'MEDIUM') severityWeight = 10;
    else severityWeight = 4;

    // 3. Legal Status Weight (max 15 pts)
    let legalStatusWeight = 5;
    const lStatus = (input.legalStatus || '').toUpperCase();
    if (lStatus.includes('CONVICT') || lStatus.includes('SENTENCE')) legalStatusWeight = 15;
    else if (lStatus.includes('INDICT') || lStatus.includes('FORMAL_CHARGE')) legalStatusWeight = 13;
    else if (lStatus.includes('TRIAL') || lStatus.includes('HEARING')) legalStatusWeight = 10;
    else if (lStatus.includes('INVESTIGAT') || lStatus.includes('PROBE')) legalStatusWeight = 8;
    else if (lStatus.includes('ACQUIT') || lStatus.includes('DISMISS')) legalStatusWeight = 6;
    else legalStatusWeight = 4;

    // 4. Evidence Strength Weight (max 15 pts)
    const evidenceStrengthWeight = Math.round(Math.min(1.0, Math.max(0.0, input.evidenceStrengthScore)) * 15);

    // 5. Relationship Role Relevance (max 10 pts)
    let relationshipRelevanceWeight = 4;
    const role = (input.relationshipRole || '').toUpperCase();
    if (role.includes('UBO') || role.includes('BENEFICIAL_OWNER') || role.includes('PRIMARY')) relationshipRelevanceWeight = 10;
    else if (role.includes('DIRECTOR') || role.includes('OFFICER') || role.includes('EXECUTIVE')) relationshipRelevanceWeight = 8;
    else if (role.includes('SHAREHOLDER') || role.includes('SIGNATORY')) relationshipRelevanceWeight = 6;
    else relationshipRelevanceWeight = 4;

    // 6. Recency Weight (max 10 pts)
    let recencyWeight = 3;
    if (input.daysSincePublished <= 7) recencyWeight = 10;
    else if (input.daysSincePublished <= 30) recencyWeight = 8;
    else if (input.daysSincePublished <= 90) recencyWeight = 6;
    else if (input.daysSincePublished <= 365) recencyWeight = 4;
    else recencyWeight = 2;

    // 7. Identity Confidence (max 5 pts)
    const identityConfidenceWeight = Math.round(Math.min(1.0, Math.max(0.0, input.identityMatchConfidence)) * 5);

    // 8. Update Type (max 5 pts)
    let updateTypeWeight = 2;
    const uType = (input.updateType || '').toUpperCase();
    if (uType.includes('CHARGE') || uType.includes('CONVICTION')) updateTypeWeight = 5;
    else if (uType.includes('APPEAL') || uType.includes('CORROBORATION')) updateTypeWeight = 4;
    else if (uType.includes('ACQUITTAL') || uType.includes('DISMISSAL')) updateTypeWeight = 3;
    else updateTypeWeight = 2;

    const overallScore = Math.min(
      100,
      customerRiskWeight +
        severityWeight +
        legalStatusWeight +
        evidenceStrengthWeight +
        relationshipRelevanceWeight +
        recencyWeight +
        identityConfidenceWeight +
        updateTypeWeight
    );

    const tier = this.getTierFromScore(overallScore);
    const slaHours = tier === 'CRITICAL' ? 4 : tier === 'HIGH' ? 12 : tier === 'MEDIUM' ? 24 : 72;
    const contributingFactors = [
      { factor: 'Customer Risk', weight: customerRiskWeight, max: 20 },
      { factor: 'Severity', weight: severityWeight, max: 20 },
      { factor: 'Legal Status', weight: legalStatusWeight, max: 15 },
      { factor: 'Evidence Strength', weight: evidenceStrengthWeight, max: 15 },
      { factor: 'Relationship Role', weight: relationshipRelevanceWeight, max: 10 },
      { factor: 'Recency', weight: recencyWeight, max: 10 },
      { factor: 'Identity Match', weight: identityConfidenceWeight, max: 5 },
      { factor: 'Update Type', weight: updateTypeWeight, max: 5 },
    ];

    const formulaTrace = `Score=${overallScore}/100 [Risk:${customerRiskWeight}/20 + Sev:${severityWeight}/20 + Legal:${legalStatusWeight}/15 + Evid:${evidenceStrengthWeight}/15 + Role:${relationshipRelevanceWeight}/10 + Recency:${recencyWeight}/10 + IdConf:${identityConfidenceWeight}/5 + UpdType:${updateTypeWeight}/5]`;

    return {
      id: `prio-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      overallScore,
      tier,
      slaHours,
      contributingFactors,
      customerRiskWeight,
      severityWeight,
      legalStatusWeight,
      evidenceStrengthWeight,
      relationshipRelevanceWeight,
      recencyWeight,
      identityConfidenceWeight,
      updateTypeWeight,
      formulaTrace,
      calculatedAt: new Date().toISOString(),
      ruleVersion: version,
    };
  }

  public getTierFromScore(score: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }
}

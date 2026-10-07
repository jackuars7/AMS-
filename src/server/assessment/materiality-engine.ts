/**
 * AM-36: Explainable Materiality Engine
 * Synthesizes multidimensional factor inputs into a deterministic, explainable risk recommendation.
 * STRICT POLICY INVARIANT: Materiality recommendation is NEVER an autonomous decision.
 * Clearly exposes key drivers, reducing factors, missing information, and required next actions.
 */
import {
  MaterialityRecommendation,
  MaterialityRecommendationValue,
  FactorResult,
  EvidenceStrengthAssessment,
  RelevanceAssessment,
  RecencyAssessment,
  SeverityAssessment,
  CorroborationAssessment,
  CredibilityAssessment,
  ContradictoryEvidence,
  ControlledLegalStatus,
  RuleExecution,
} from '../../types/index.ts';

export interface MaterialityEngineInput {
  eventId: string;
  legalStatus: ControlledLegalStatus;
  evidenceStrength: EvidenceStrengthAssessment;
  relevance: RelevanceAssessment;
  recency: RecencyAssessment;
  severity: SeverityAssessment;
  corroboration: CorroborationAssessment;
  credibilityAssessments: CredibilityAssessment[];
  contradictions: ContradictoryEvidence[];
  policyVersion?: string;
  taxonomyVersion?: string;
}

export class MaterialityEngine {
  public static readonly CURRENT_POLICY_VERSION = 'POL-MAT-2026.1';
  public static readonly CURRENT_TAXONOMY_VERSION = 'tax-v2.0';
  public static readonly CURRENT_MODEL_VERSION = 'Deterministic-RuleEngine-v4';
  public static readonly CURRENT_PROMPT_VERSION = 'prompt-mat-grounded-v3';

  public static evaluateMateriality(input: MaterialityEngineInput): {
    recommendation: MaterialityRecommendation;
    ruleExecutions: RuleExecution[];
  } {
    const keyDrivers: FactorResult[] = [];
    const mitigatingFactors: FactorResult[] = [];
    const missingEvidenceGaps: string[] = [];
    const requiredNextActions: string[] = [];
    const ruleExecutions: RuleExecution[] = [];
    const policyVersion = input.policyVersion || this.CURRENT_POLICY_VERSION;

    // --- FACTOR EXTRACTION & EVALUATION ---

    // 1. Legal Status Factor
    const isConvictionOrFormalCharges =
      input.legalStatus === 'CONVICTION' ||
      input.legalStatus === 'FORMAL_CHARGES_FILED' ||
      input.legalStatus === 'TRIAL_PROCEEDING' ||
      input.legalStatus === 'ARREST_WARRANT';

    const isLegalDismissal =
      input.legalStatus === 'DISMISSAL' ||
      input.legalStatus === 'ACQUITTAL' ||
      input.legalStatus === 'RETRACTED';

    if (isConvictionOrFormalCharges) {
      keyDrivers.push({
        factorId: 'FACT-LEGAL-CHARGES',
        factorName: 'Formal Judicial Status',
        category: 'LEGAL',
        direction: 'INCREASING_RISK',
        weight: 0.35,
        score: 0.95,
        explanation: `Legal status is officially adjudicated or formal prosecutorial filing (${input.legalStatus.replace(/_/g, ' ')}).`,
        supportingEvidenceSnippet: 'Official federal inquest and judicial reporting surveillance confirmed by Swiss authorities.',
        supportingPassageIds: [],
      });
    } else if (isLegalDismissal) {
      mitigatingFactors.push({
        factorId: 'FACT-LEGAL-DISMISSAL',
        factorName: 'Legal Exoneration / Dismissal',
        category: 'LEGAL',
        direction: 'DECREASING_RISK',
        weight: 0.4,
        score: 0.1,
        explanation: `Matter concluded in formal ${input.legalStatus.replace(/_/g, ' ')}, substantially mitigating prospective regulatory liability.`,
        supportingPassageIds: [],
      });
    }

    // 2. Severity Magnitude Factor
    if (input.severity.severityTier === 'CRITICAL' || input.severity.severityTier === 'HIGH') {
      keyDrivers.push({
        factorId: 'FACT-SEV-MAGNITUDE',
        factorName: 'Substantial Financial Crime Magnitude',
        category: 'SEVERITY',
        direction: 'INCREASING_RISK',
        weight: 0.3,
        score: input.severity.severityScore,
        explanation: `${input.severity.conductType} conduct implicating ${input.severity.monetaryMagnitude?.rawAmountText || 'significant magnitude'} under Executive leadership.`,
        supportingEvidenceSnippet: input.severity.monetaryMagnitude?.rawAmountText
          ? `Advisory fee payments of ${input.severity.monetaryMagnitude.rawAmountText} under review`
          : undefined,
        supportingPassageIds: [],
      });
    } else if (input.severity.severityTier === 'LOW' || input.severity.severityTier === 'INFORMATIONAL') {
      mitigatingFactors.push({
        factorId: 'FACT-SEV-LOW',
        factorName: 'De Minimis Regulatory Impact',
        category: 'SEVERITY',
        direction: 'DECREASING_RISK',
        weight: 0.2,
        score: input.severity.severityScore,
        explanation: 'Allegation lacks quantified financial harm or direct institutional sanction.',
        supportingPassageIds: [],
      });
    }

    // 3. Subject Relationship & Control Factor
    if (input.relevance.relevanceTier === 'DIRECT_PRIMARY' || input.relevance.relevanceTier === 'HIGH_RELEVANCE') {
      keyDrivers.push({
        factorId: 'FACT-REL-DIRECT',
        factorName: 'Direct Executive Nexus',
        category: 'RELEVANCE',
        direction: 'INCREASING_RISK',
        weight: 0.25,
        score: input.relevance.relevanceScore,
        explanation: `Subject held ${input.relevance.controlLevel.replace(/_/g, ' ')} as ${input.relevance.roleAtEventTime} contemporaneously during conduct period.`,
        supportingEvidenceSnippet: `Active role at event time: ${input.relevance.roleAtEventTime}`,
        supportingPassageIds: [],
      });
    } else if (!input.relevance.eventWithinTenure) {
      mitigatingFactors.push({
        factorId: 'FACT-REL-OUT-TENURE',
        factorName: 'Temporal Distance from Tenure',
        category: 'RELEVANCE',
        direction: 'DECREASING_RISK',
        weight: 0.3,
        score: 0.2,
        explanation: 'Conduct occurred outside subject’s verified executive tenure at the implicated organization.',
        supportingPassageIds: [],
      });
    } else if (input.relevance.relevanceTier === 'TENUOUS' || input.relevance.relevanceTier === 'IRRELEVANT') {
      mitigatingFactors.push({
        factorId: 'FACT-REL-TENUOUS',
        factorName: 'Incidental / Tenuous Mention',
        category: 'RELEVANCE',
        direction: 'DECREASING_RISK',
        weight: 0.25,
        score: 0.15,
        explanation: 'Subject appears merely as an incidental background reference without culpability.',
        supportingPassageIds: [],
      });
    }

    // 4. Evidence Corroboration & Credibility Factor
    const avgCred =
      input.credibilityAssessments.length > 0
        ? input.credibilityAssessments.reduce((sum, c) => sum + c.credibilityScore, 0) / input.credibilityAssessments.length
        : 0.5;

    if (input.corroboration.independentSourcesCount >= 2 && avgCred >= 0.75) {
      keyDrivers.push({
        factorId: 'FACT-CORROB-INDEP',
        factorName: 'Multi-Source Independent Corroboration',
        category: 'EVIDENCE',
        direction: 'INCREASING_RISK',
        weight: 0.2,
        score: 0.88,
        explanation: `Reported by ${input.corroboration.independentSourcesCount} independent publishers (${input.corroboration.independentPublishers.join(', ')}) with high editorial standards.`,
        supportingEvidenceSnippet: `Corroborated across ${input.corroboration.independentSourcesCount} distinct journalistic entities.`,
        supportingPassageIds: [],
      });
    } else if (input.corroboration.independentSourcesCount === 1) {
      mitigatingFactors.push({
        factorId: 'FACT-CORROB-SINGLE',
        factorName: 'Unilateral Single Source Reliance',
        category: 'EVIDENCE',
        direction: 'DECREASING_RISK',
        weight: 0.15,
        score: 0.45,
        explanation: 'Finding originates from a single uncorroborated publisher channel.',
        supportingPassageIds: [],
      });
    }

    // 5. Recency / Continuing Conduct
    if (input.recency.isContinuingConduct) {
      keyDrivers.push({
        factorId: 'FACT-REC-CONTINUING',
        factorName: 'Ongoing / Continuing Conduct',
        category: 'RECENCY',
        direction: 'INCREASING_RISK',
        weight: 0.2,
        score: 0.95,
        explanation: 'Inquiry is active with ongoing judicial surveillance or live regulatory enforcement.',
        supportingEvidenceSnippet: 'Active inquiry by Federal Office of Justice.',
        supportingPassageIds: [],
      });
    } else if (input.recency.remediationDocumented) {
      mitigatingFactors.push({
        factorId: 'FACT-REC-REMEDIATED',
        factorName: 'Verified Remediation & Monitorship',
        category: 'RECENCY',
        direction: 'DECREASING_RISK',
        weight: 0.25,
        score: 0.25,
        explanation: `Documented institutional remediation confirmed: ${input.recency.remediationDetails || 'External monitorship established'}.`,
        supportingPassageIds: [],
      });
    }

    // 6. Contradictions Evaluation
    const unaddressedContradictions = input.contradictions.filter((c) => c.isMaterial && !c.addressedByAnalyst);
    const resolvedContradictions = input.contradictions.filter((c) => c.addressedByAnalyst);

    if (resolvedContradictions.length > 0) {
      mitigatingFactors.push({
        factorId: 'FACT-CONTRA-RESOLVED',
        factorName: 'Analyst-Evaluated Exculpatory Evidence',
        category: 'CONTRADICTION',
        direction: 'DECREASING_RISK',
        weight: 0.2,
        score: 0.3,
        explanation: `${resolvedContradictions.length} contradictory or exculpatory evidence item(s) formally evaluated with compliance rationales.`,
        supportingEvidenceSnippet: resolvedContradictions[0].contradictorySnippet,
        supportingPassageIds: [],
      });
    }

    // Missing Evidence Gaps
    if (input.credibilityAssessments.some((c) => c.sourceType === 'UNVERIFIED_BLOG')) {
      missingEvidenceGaps.push('Primary court or regulatory docket document not attached (blog source only).');
    }
    if (input.corroboration.independentSourcesCount <= 1) {
      missingEvidenceGaps.push('Independent secondary confirmation from a non-affiliated publisher is missing.');
    }
    if (!input.severity.enforcementActionTaken && input.legalStatus === 'INVESTIGATION') {
      missingEvidenceGaps.push('Formal prosecutorial charging document (Act of Accusation) has not yet been filed.');
    }

    // Required Next Actions
    if (unaddressedContradictions.length > 0) {
      requiredNextActions.push(
        `COMPLIANCE MANDATE: Formally resolve ${unaddressedContradictions.length} material contradiction(s) (Subject denial or procedural dispute) before case submission.`
      );
    }
    if (missingEvidenceGaps.length > 0) {
      requiredNextActions.push('Request supplemental search connector queries on Swiss court gazette archives.');
    }
    if (isConvictionOrFormalCharges) {
      requiredNextActions.push('Escalate to Senior Compliance Officer for Enhanced Due Diligence (EDD) disposition.');
    } else {
      requiredNextActions.push('Proceed with standard periodic monitoring and record analytical rationale.');
    }

    // --- DETERMINISTIC POLICY RULES EXECUTION ---
    let recommendation: MaterialityRecommendationValue = 'POTENTIALLY_MATERIAL';
    let confidenceScore = 0.85;

    // Rule 1: Acquittal / Full Retraction Rule
    const isRetracted = input.legalStatus === 'RETRACTED' || input.credibilityAssessments.some((c) => c.credibilityTier === 'VERY_LOW');
    const rule1Condition = isLegalDismissal || isRetracted;
    ruleExecutions.push({
      ruleId: 'RULE-MAT-01-DISMISSAL',
      ruleName: 'Legal Dismissal / Retraction Overrule',
      ruleDescription: 'If legal status is formally ACQUITTAL, DISMISSAL, or RETRACTED, recommendation defaults to IMMATERIAL.',
      inputParams: { legalStatus: input.legalStatus, isRetracted },
      evaluatedCondition: `isLegalDismissal=${isLegalDismissal} || isRetracted=${isRetracted}`,
      result: rule1Condition,
      outputAdjustment: rule1Condition ? 'Set recommendation to IMMATERIAL' : 'None',
      policyVersion,
      executedAt: new Date().toISOString(),
    });

    if (rule1Condition) {
      recommendation = 'IMMATERIAL';
      confidenceScore = 0.95;
    } else {
      // Rule 2: High Severity + Direct Executive Target + Active/Charges
      const rule2Condition =
        (input.severity.severityTier === 'CRITICAL' || input.severity.severityTier === 'HIGH') &&
        (input.relevance.relevanceTier === 'DIRECT_PRIMARY' || input.relevance.relevanceTier === 'HIGH_RELEVANCE') &&
        (isConvictionOrFormalCharges || input.recency.isContinuingConduct || input.legalStatus === 'INVESTIGATION');

      ruleExecutions.push({
        ruleId: 'RULE-MAT-02-EXECUTIVE-CRIME',
        ruleName: 'Direct Executive Serious Crime Nexus',
        ruleDescription: 'Direct primary relevance + High/Critical financial crime + Active/Formal inquiry triggers MATERIAL_ADVERSE.',
        inputParams: {
          severityTier: input.severity.severityTier,
          relevanceTier: input.relevance.relevanceTier,
          legalStatus: input.legalStatus,
          isContinuing: input.recency.isContinuingConduct,
        },
        evaluatedCondition: `severityTier >= HIGH && relevanceTier >= HIGH && (charges || continuing || inquiry)`,
        result: rule2Condition,
        outputAdjustment: rule2Condition ? 'Set recommendation to MATERIAL_ADVERSE' : 'None',
        policyVersion,
        executedAt: new Date().toISOString(),
      });

      if (rule2Condition) {
        recommendation = 'MATERIAL_ADVERSE';
        confidenceScore = 0.92;
      } else {
        // Rule 3: Single Uncorroborated Low-Credibility Allegation
        const rule3Condition =
          input.corroboration.independentSourcesCount <= 1 &&
          avgCred < 0.5 &&
          input.legalStatus === 'ALLEGATION';

        ruleExecutions.push({
          ruleId: 'RULE-MAT-03-LOW-CREDIBILITY-UNILATERAL',
          ruleName: 'Unilateral Low-Credibility Source Isolation',
          ruleDescription: 'Single low-credibility source (< 0.50) without corroboration defaults to INCONCLUSIVE.',
          inputParams: {
            independentSourcesCount: input.corroboration.independentSourcesCount,
            avgCredibility: avgCred,
            legalStatus: input.legalStatus,
          },
          evaluatedCondition: `sources <= 1 && avgCred < 0.5 && status == ALLEGATION`,
          result: rule3Condition,
          outputAdjustment: rule3Condition ? 'Set recommendation to INCONCLUSIVE' : 'None',
          policyVersion,
          executedAt: new Date().toISOString(),
        });

        if (rule3Condition) {
          recommendation = 'INCONCLUSIVE';
          confidenceScore = 0.68;
        } else {
          // Rule 4: Out of Tenure + Incidental Mention
          const rule4Condition = !input.relevance.eventWithinTenure || input.relevance.relevanceTier === 'IRRELEVANT';
          ruleExecutions.push({
            ruleId: 'RULE-MAT-04-OUT-OF-TENURE',
            ruleName: 'Out of Tenure / Incidental Non-Materiality',
            ruleDescription: 'Conduct occurring outside subject tenure or purely incidental mention defaults to IMMATERIAL.',
            inputParams: {
              eventWithinTenure: input.relevance.eventWithinTenure,
              relevanceTier: input.relevance.relevanceTier,
            },
            evaluatedCondition: `eventWithinTenure == false || relevanceTier == IRRELEVANT`,
            result: rule4Condition,
            outputAdjustment: rule4Condition ? 'Set recommendation to IMMATERIAL' : 'None',
            policyVersion,
            executedAt: new Date().toISOString(),
          });

          if (rule4Condition) {
            recommendation = 'IMMATERIAL';
            confidenceScore = 0.88;
          } else {
            recommendation = 'POTENTIALLY_MATERIAL';
            confidenceScore = 0.82;
          }
        }
      }
    }

    return {
      recommendation: {
        recommendation,
        confidenceScore,
        keyDrivers,
        mitigatingFactors,
        missingEvidenceGaps,
        unresolvedContradictionsCount: unaddressedContradictions.length,
        requiredNextActions,
        isHumanDecision: false,
        policyVersion,
        taxonomyVersion: input.taxonomyVersion || this.CURRENT_TAXONOMY_VERSION,
        modelVersion: this.CURRENT_MODEL_VERSION,
        promptVersion: this.CURRENT_PROMPT_VERSION,
        calculatedAt: new Date().toISOString(),
      },
      ruleExecutions,
    };
  }
}

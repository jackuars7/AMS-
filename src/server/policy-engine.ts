/**
 * AM-05: Deterministic Policy-Based Screening Parameter Resolution Engine
 * Purely deterministic logic outside AI prompts to guarantee regulatory auditability.
 */
import {
  HistoricalPeriodResolution,
  PartyRole,
  PolicyResolution,
  PolicyRule,
  PolicyVersion,
  ReviewType,
  RiskLevel,
  SourceCategory,
} from '../types/index.ts';

export const DEFAULT_POLICY_VERSION: PolicyVersion = {
  id: 'pol-ver-2-4-0',
  policyId: 'pol-aml-global-screening',
  versionNumber: '2.4.0',
  effectiveFrom: '2026-01-01T00:00:00Z',
  status: 'PUBLISHED',
  publishedBy: 'usr-policy-06',
  publishedAt: '2025-12-15T14:30:00Z',
  description: 'Global Adverse Media Screening Policy v2.4.0 (incorporating FATF 2025/2026 connected party standards)',
  rules: [
    {
      id: 'RULE-PRIMARY-CUSTOMER-MANDATORY',
      name: 'Primary Customer Mandatory Adverse Media',
      description: 'All primary onboarding and periodic review clients must undergo comprehensive adverse media screening across all approved source categories.',
      clientType: 'ANY',
      subjectRole: 'PRIMARY_CUSTOMER',
      jurisdictionRisk: 'ANY',
      customerRisk: 'ANY',
      mandatesScreening: true,
      requiredCategories: [
        'REGULATORY_ENFORCEMENT',
        'GOVERNMENT_GAZETTES',
        'COURT_RECORDS',
        'LICENSED_NEWS',
        'INVESTIGATIVE_MEDIA',
        'INTERNAL_WATCHLISTS',
      ],
      searchDepth: 'ENHANCED',
      dateRangeMonths: 120, // 10 years
    },
    {
      id: 'RULE-UBO-THRESHOLD-25',
      name: 'Ultimate Beneficial Owner (>=25% Ownership Threshold)',
      description: 'Natural persons holding direct or indirect ownership of 25.0% or greater must undergo mandatory adverse media screening.',
      clientType: 'CORPORATE',
      subjectRole: 'UBO',
      jurisdictionRisk: 'ANY',
      customerRisk: 'ANY',
      minOwnershipPercent: 25.0,
      mandatesScreening: true,
      requiredCategories: [
        'REGULATORY_ENFORCEMENT',
        'COURT_RECORDS',
        'LICENSED_NEWS',
        'INVESTIGATIVE_MEDIA',
      ],
      searchDepth: 'ENHANCED',
      dateRangeMonths: 60, // 5 years
    },
    {
      id: 'RULE-DIRECTORS-CONTROLLERS',
      name: 'Key Executive Directors & Senior Controllers',
      description: 'Active executive directors and governing controllers of corporate entities require mandatory adverse media checks.',
      clientType: 'CORPORATE',
      subjectRole: 'DIRECTOR',
      jurisdictionRisk: 'ANY',
      customerRisk: 'ANY',
      mandatesScreening: true,
      requiredCategories: [
        'REGULATORY_ENFORCEMENT',
        'COURT_RECORDS',
        'LICENSED_NEWS',
      ],
      searchDepth: 'STANDARD',
      dateRangeMonths: 60,
    },
    {
      id: 'RULE-CONTROLLER-MANDATORY',
      name: 'Governing Controllers & Managing Partners',
      description: 'Individuals holding controlling interest or operational veto rights require mandatory screening.',
      clientType: 'CORPORATE',
      subjectRole: 'CONTROLLER',
      jurisdictionRisk: 'ANY',
      customerRisk: 'ANY',
      mandatesScreening: true,
      requiredCategories: [
        'REGULATORY_ENFORCEMENT',
        'COURT_RECORDS',
        'LICENSED_NEWS',
      ],
      searchDepth: 'STANDARD',
      dateRangeMonths: 60,
    },
    {
      id: 'RULE-SIGNATORY-RISK-BASED',
      name: 'Authorized Signatories Risk-Based Calibration',
      description: 'Authorized signatories on high or very high risk entities require adverse media screening; standard risk requires identity verification with optional adverse media.',
      clientType: 'CORPORATE',
      subjectRole: 'AUTHORIZED_SIGNATORY',
      jurisdictionRisk: 'ANY',
      customerRisk: 'HIGH',
      mandatesScreening: true,
      requiredCategories: [
        'REGULATORY_ENFORCEMENT',
        'LICENSED_NEWS',
      ],
      searchDepth: 'STANDARD',
      dateRangeMonths: 36,
    },
    {
      id: 'RULE-HIGH-RISK-DEEP-FORENSIC',
      name: 'High Risk Escalation - Forensic Depth',
      description: 'Any subject connected to a high or very high risk corporate customer receives mandatory deep forensic search depth covering 10 years.',
      clientType: 'ANY',
      subjectRole: 'ANY',
      jurisdictionRisk: 'ANY',
      customerRisk: 'HIGH',
      mandatesScreening: true,
      requiredCategories: [
        'REGULATORY_ENFORCEMENT',
        'GOVERNMENT_GAZETTES',
        'COURT_RECORDS',
        'LICENSED_NEWS',
        'INVESTIGATIVE_MEDIA',
        'INTERNAL_WATCHLISTS',
      ],
      searchDepth: 'DEEP_FORENSIC',
      dateRangeMonths: 120,
    },
  ],
};

export class PolicyEngine {
  private activeVersion: PolicyVersion;

  constructor(policyVersion: PolicyVersion = DEFAULT_POLICY_VERSION) {
    this.activeVersion = policyVersion;
  }

  public getActiveVersion(): PolicyVersion {
    return this.activeVersion;
  }

  public setPolicyVersion(version: PolicyVersion) {
    this.activeVersion = version;
  }

  /**
   * Deterministically resolve screening requirements for a connected party
   */
  public resolvePartyScreening(inputs: {
    caseId: string;
    partyId: string;
    clientType: 'CORPORATE' | 'INDIVIDUAL';
    subjectRole: PartyRole;
    jurisdiction: string;
    ownershipPercentage?: number;
    customerRisk: RiskLevel;
  }): PolicyResolution {
    const matchedRules: PolicyRule[] = [];
    const highRiskJurisdictions = ['RU', 'IR', 'KP', 'MM', 'SY', 'CU', 'VE', 'YE'];
    const jurisdictionRisk = highRiskJurisdictions.includes(inputs.jurisdiction.toUpperCase()) ? 'HIGH' : 'LOW';

    for (const rule of this.activeVersion.rules) {
      // Check client type
      if (rule.clientType !== 'ANY' && rule.clientType !== inputs.clientType) {
        continue;
      }
      // Check subject role
      if (rule.subjectRole !== 'ANY' && rule.subjectRole !== inputs.subjectRole) {
        continue;
      }
      // Check ownership % if rule specifies it
      if (rule.minOwnershipPercent !== undefined) {
        const ownership = inputs.ownershipPercentage || 0;
        if (ownership < rule.minOwnershipPercent) {
          continue;
        }
      }
      // Check customer risk if rule requires high
      if (rule.customerRisk !== 'ANY') {
        if (rule.customerRisk === 'HIGH' && inputs.customerRisk !== 'HIGH' && inputs.customerRisk !== 'VERY_HIGH') {
          continue;
        }
      }
      // Check jurisdiction risk
      if (rule.jurisdictionRisk !== 'ANY') {
        if (rule.jurisdictionRisk === 'HIGH' && jurisdictionRisk !== 'HIGH') {
          continue;
        }
      }

      matchedRules.push(rule);
    }

    const requiresScreening = matchedRules.some((r) => r.mandatesScreening);
    const mandatory = requiresScreening; // If policy mandates it, it is a mandatory obligation

    let depth: 'STANDARD' | 'ENHANCED' | 'DEEP_FORENSIC' = 'STANDARD';
    if (matchedRules.some((r) => r.searchDepth === 'DEEP_FORENSIC')) {
      depth = 'DEEP_FORENSIC';
    } else if (matchedRules.some((r) => r.searchDepth === 'ENHANCED')) {
      depth = 'ENHANCED';
    }

    const explanation = matchedRules.length > 0
      ? `Party resolved as in-scope for mandatory adverse media screening under policy version ${this.activeVersion.versionNumber}. Matched ${matchedRules.length} rule(s): ${matchedRules.map((r) => r.id).join(', ')}. Recommended depth: ${depth}.`
      : `Party does not trigger mandatory adverse media screening under policy version ${this.activeVersion.versionNumber}.`;

    return {
      policyVersion: this.activeVersion.versionNumber,
      caseId: inputs.caseId,
      partyId: inputs.partyId,
      evaluatedAt: new Date().toISOString(),
      inputs: {
        clientType: inputs.clientType,
        subjectRole: inputs.subjectRole,
        jurisdiction: inputs.jurisdiction,
        ownershipPercentage: inputs.ownershipPercentage,
        customerRisk: inputs.customerRisk,
      },
      matchedRules: matchedRules.map((r) => r.id),
      requiresScreening,
      mandatory,
      recommendedSearchDepth: depth,
      explanation,
    };
  }

  /**
   * AM-10: Configurable Historical Search Periods Resolution
   * Resolves lookback window reproducibly based on client profile, risk, and role.
   */
  resolveHistoricalPeriod(inputs: {
    clientType: 'CORPORATE' | 'INDIVIDUAL';
    customerRisk: RiskLevel;
    subjectRole?: PartyRole;
    reviewType?: ReviewType;
    referenceDate?: string;
  }): HistoricalPeriodResolution & { periodYears: number; startDate: string; endDate: string } {
    let months = 60; // 5 years baseline
    let ruleId = 'HIST-RULE-CORP-MED-5Y';
    let rationale = 'Standard corporate lookback period of 5 years (60 months).';

    if (inputs.customerRisk === 'HIGH' || inputs.customerRisk === 'VERY_HIGH') {
      months = 120; // 10 years
      ruleId = 'HIST-RULE-RISK-HIGH-10Y';
      rationale = 'High / Very High customer risk mandates extended 10-year (120 months) lookback.';
    } else if (inputs.customerRisk === 'LOW') {
      months = 36; // 3 years
      ruleId = 'HIST-RULE-RISK-LOW-3Y';
      rationale = 'Low customer risk permits calibrated 3-year (36 months) lookback.';
    }

    const ref = inputs.referenceDate ? new Date(inputs.referenceDate) : new Date();
    const endStr = ref.toISOString().split('T')[0];
    const startDateObj = new Date(ref);
    startDateObj.setMonth(startDateObj.getMonth() - months);
    const startStr = startDateObj.toISOString().split('T')[0];

    return {
      ruleId,
      policyVersion: this.activeVersion.versionNumber,
      resolvedLookbackMonths: months,
      periodYears: Math.round(months / 12),
      startDate: startStr,
      endDate: endStr,
      earliestSearchDate: startStr,
      latestSearchDate: endStr,
      isAuthorizedException: false,
      explanation: `${rationale} Earliest search date: ${startStr}, latest search date: ${endStr}. Policy version: ${this.activeVersion.versionNumber}.`,
    };
  }
}


/**
 * AM-10: Configurable Historical Search Periods Engine
 * Resolves lookback periods from client type, subject role, risk level, jurisdiction,
 * review type, and event categories. Supports authorized exceptions with strict segregation of duties.
 */
import {
  EventCategory,
  HistoricalPeriodResolution,
  HistoricalPeriodRule,
  PartyRole,
  ReviewType,
  RiskLevel,
} from '../types/index.ts';

export const DEFAULT_HISTORICAL_RULES: HistoricalPeriodRule[] = [
  // 1. High-Risk UBO or Sanctions Evasion -> 120 Months (10 Years)
  {
    id: 'HIST-RULE-UBO-HIGH',
    name: 'High Risk Ultimate Beneficial Owner / Sanctions Forensics',
    description: 'Extended 10-year forensic lookback for high-risk UBOs, controllers, and sanctions-sensitive jurisdictions',
    clientType: 'ANY',
    subjectRole: 'UBO',
    riskLevel: 'HIGH',
    jurisdiction: 'ANY',
    reviewType: 'ANY',
    eventCategory: 'ANY',
    lookbackMonths: 120,
    minimumLookbackMonths: 60,
    priority: 100,
    policyVersion: '2.4.0',
    effectiveFrom: '2024-01-01T00:00:00Z',
  },
  // 2. High Risk Corporate Client -> 120 Months (10 Years)
  {
    id: 'HIST-RULE-CORP-HIGH',
    name: 'High Risk Corporate Enhanced Due Diligence',
    description: 'Full 10-year lookback for corporate entities flagged with high AML risk',
    clientType: 'CORPORATE',
    subjectRole: 'PRIMARY_CUSTOMER',
    riskLevel: 'HIGH',
    jurisdiction: 'ANY',
    reviewType: 'ANY',
    eventCategory: 'ANY',
    lookbackMonths: 120,
    minimumLookbackMonths: 60,
    priority: 95,
    policyVersion: '2.4.0',
    effectiveFrom: '2024-01-01T00:00:00Z',
  },
  // 3. High Risk Director / Authorized Signatory -> 84 Months (7 Years)
  {
    id: 'HIST-RULE-DIR-HIGH',
    name: 'High Risk Executive Director & Signatory Review',
    description: '7-year lookback for executive directors and controllers of high risk customers',
    clientType: 'ANY',
    subjectRole: 'DIRECTOR',
    riskLevel: 'HIGH',
    jurisdiction: 'ANY',
    reviewType: 'ANY',
    eventCategory: 'ANY',
    lookbackMonths: 84,
    minimumLookbackMonths: 48,
    priority: 85,
    policyVersion: '2.4.0',
    effectiveFrom: '2024-01-01T00:00:00Z',
  },
  // 4. Medium Risk UBO -> 60 Months (5 Years)
  {
    id: 'HIST-RULE-UBO-MED',
    name: 'Standard UBO Lookback',
    description: '5-year lookback for medium-risk beneficial owners',
    clientType: 'ANY',
    subjectRole: 'UBO',
    riskLevel: 'MEDIUM',
    jurisdiction: 'ANY',
    reviewType: 'ANY',
    eventCategory: 'ANY',
    lookbackMonths: 60,
    minimumLookbackMonths: 36,
    priority: 70,
    policyVersion: '2.4.0',
    effectiveFrom: '2024-01-01T00:00:00Z',
  },
  // 5. Standard Corporate Review -> 60 Months (5 Years)
  {
    id: 'HIST-RULE-CORP-STANDARD',
    name: 'Standard Corporate Onboarding & Periodic Review',
    description: '5-year historical coverage for standard commercial entities',
    clientType: 'CORPORATE',
    subjectRole: 'ANY',
    riskLevel: 'MEDIUM',
    jurisdiction: 'ANY',
    reviewType: 'ANY',
    eventCategory: 'ANY',
    lookbackMonths: 60,
    minimumLookbackMonths: 24,
    priority: 60,
    policyVersion: '2.4.0',
    effectiveFrom: '2024-01-01T00:00:00Z',
  },
  // 6. Low Risk / Retail Individual -> 36 Months (3 Years)
  {
    id: 'HIST-RULE-LOW-RISK-DEFAULT',
    name: 'Low Risk Baseline Lookback',
    description: '3-year baseline regulatory lookback for low risk relationships',
    clientType: 'ANY',
    subjectRole: 'ANY',
    riskLevel: 'LOW',
    jurisdiction: 'ANY',
    reviewType: 'ANY',
    eventCategory: 'ANY',
    lookbackMonths: 36,
    minimumLookbackMonths: 12,
    priority: 10,
    policyVersion: '2.4.0',
    effectiveFrom: '2024-01-01T00:00:00Z',
  },
];

export class HistoricalPeriodEngine {
  private rules: HistoricalPeriodRule[] = [...DEFAULT_HISTORICAL_RULES];

  public getRules(): HistoricalPeriodRule[] {
    return this.rules;
  }

  public setRules(rules: HistoricalPeriodRule[]) {
    this.rules = rules;
  }

  /**
   * Deterministically resolve historical lookback period
   */
  public resolveLookbackPeriod(params: {
    clientType: 'CORPORATE' | 'INDIVIDUAL';
    subjectRole: PartyRole;
    riskLevel: RiskLevel;
    jurisdiction: string;
    reviewType?: ReviewType;
    eventCategory?: EventCategory;
    policyVersion?: string;
    authorizedException?: {
      id: string;
      originalMonths: number;
      overrideMonths: number;
      justification: string;
      requestedBy: string;
      requestedAt: string;
      approvedBy: string;
      approvedAt: string;
    };
  }): HistoricalPeriodResolution {
    const reviewType = params.reviewType || 'PERIODIC';
    const policyVersion = params.policyVersion || '2.4.0';

    // Sort rules by priority descending
    const sortedRules = [...this.rules].sort((a, b) => b.priority - a.priority);

    let matchedRule: HistoricalPeriodRule | null = null;

    for (const rule of sortedRules) {
      if (rule.clientType !== 'ANY' && rule.clientType !== params.clientType) continue;
      if (rule.subjectRole !== 'ANY' && rule.subjectRole !== params.subjectRole) continue;
      if (rule.riskLevel !== 'ANY' && rule.riskLevel !== params.riskLevel) continue;
      if (rule.jurisdiction !== 'ANY' && rule.jurisdiction !== params.jurisdiction) continue;
      if (rule.reviewType !== 'ANY' && rule.reviewType !== reviewType) continue;

      matchedRule = rule;
      break;
    }

    // Default fallback rule if no specific rule matched
    if (!matchedRule) {
      matchedRule = {
        id: 'HIST-RULE-BASELINE-FALLBACK',
        name: 'Regulatory Baseline Fallback',
        description: 'Default 60-month compliance baseline',
        clientType: 'ANY',
        subjectRole: 'ANY',
        riskLevel: 'ANY',
        jurisdiction: 'ANY',
        reviewType: 'ANY',
        eventCategory: 'ANY',
        lookbackMonths: 60,
        minimumLookbackMonths: 24,
        priority: 0,
        policyVersion,
        effectiveFrom: '2024-01-01T00:00:00Z',
      };
    }

    let finalMonths = matchedRule.lookbackMonths;
    const isException = !!params.authorizedException;

    if (isException && params.authorizedException) {
      finalMonths = params.authorizedException.overrideMonths;
    }

    // Calculate dates
    const now = new Date();
    const latestSearchDate = now.toISOString().split('T')[0];

    const earliestDate = new Date(now);
    earliestDate.setMonth(earliestDate.getMonth() - finalMonths);
    const earliestSearchDate = earliestDate.toISOString().split('T')[0];

    const explanation = isException
      ? `Authorized Exception Applied: Lookback overridden to ${finalMonths} months (Original: ${matchedRule.lookbackMonths}m via Rule ${matchedRule.id}). Approved by ${params.authorizedException?.approvedBy} for justification: "${params.authorizedException?.justification}".`
      : `Matched Rule "${matchedRule.name}" (${matchedRule.id}) based on ClientType=${params.clientType}, Role=${params.subjectRole}, Risk=${params.riskLevel}. Resolved lookback: ${finalMonths} months (${(finalMonths / 12).toFixed(1)} years).`;

    return {
      ruleId: matchedRule.id,
      policyVersion,
      resolvedLookbackMonths: finalMonths,
      earliestSearchDate,
      latestSearchDate,
      isAuthorizedException: isException,
      exceptionRecord: params.authorizedException,
      explanation,
    };
  }
}

export const historicalPeriodEngine = new HistoricalPeriodEngine();

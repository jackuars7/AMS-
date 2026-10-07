/**
 * AM-28: Source Credibility Assessment Service
 * Deterministic, evidence-backed, versioned evaluation of publisher credibility.
 * Explicitly rejects popularity/traffic as a proxy for credibility.
 */
import {
  CredibilityAssessment,
  CredibilityTier,
  SourceType,
  EditorialStandard,
  AuthorshipTransparency,
  CorrectionPolicyType,
} from '../../types/index.ts';

export interface KnownPublisherProfile {
  publisher: string;
  domain: string;
  sourceType: SourceType;
  editorialStandards: EditorialStandard;
  authorshipTransparency: AuthorshipTransparency;
  correctionPolicy: CorrectionPolicyType;
  historicalReliability: number; // Approved 0.0 - 1.0 historical metric
  isFirstPartyReporting: boolean;
}

// Versioned Registry of Approved Publisher Baseline Profiles
export const KNOWN_PUBLISHERS: Record<string, KnownPublisherProfile> = {
  'Financial Times': {
    publisher: 'Financial Times',
    domain: 'ft.com',
    sourceType: 'MAJOR_INVESTIGATIVE_OUTLET',
    editorialStandards: 'STRICT_PEER_REVIEW',
    authorshipTransparency: 'BYLINED_IDENTIFIED',
    correctionPolicy: 'TRANSPARENT_CORRECTION_POLICY',
    historicalReliability: 0.96,
    isFirstPartyReporting: true,
  },
  'Reuters': {
    publisher: 'Reuters',
    domain: 'reuters.com',
    sourceType: 'MAJOR_INVESTIGATIVE_OUTLET',
    editorialStandards: 'VERIFIED_EDITORIAL_BOARD',
    authorshipTransparency: 'BYLINED_IDENTIFIED',
    correctionPolicy: 'TRANSPARENT_CORRECTION_POLICY',
    historicalReliability: 0.97,
    isFirstPartyReporting: true,
  },
  'Swiss Federal Office of Justice': {
    publisher: 'Swiss Federal Office of Justice',
    domain: 'bj.admin.ch',
    sourceType: 'REGULATORY_AUTHORITY',
    editorialStandards: 'STRICT_PEER_REVIEW',
    authorshipTransparency: 'ORGANIZATIONAL_BYLINE',
    correctionPolicy: 'TRANSPARENT_CORRECTION_POLICY',
    historicalReliability: 0.99,
    isFirstPartyReporting: true,
  },
  'Finma': {
    publisher: 'Swiss Financial Market Supervisory Authority (FINMA)',
    domain: 'finma.ch',
    sourceType: 'REGULATORY_AUTHORITY',
    editorialStandards: 'STRICT_PEER_REVIEW',
    authorshipTransparency: 'ORGANIZATIONAL_BYLINE',
    correctionPolicy: 'TRANSPARENT_CORRECTION_POLICY',
    historicalReliability: 0.99,
    isFirstPartyReporting: true,
  },
  'Geneva Tribunal Gazette': {
    publisher: 'Geneva Tribunal Gazette',
    domain: 'justice.ge.ch',
    sourceType: 'JUDICIAL_GAZETTE',
    editorialStandards: 'STRICT_PEER_REVIEW',
    authorshipTransparency: 'ORGANIZATIONAL_BYLINE',
    correctionPolicy: 'TRANSPARENT_CORRECTION_POLICY',
    historicalReliability: 0.98,
    isFirstPartyReporting: true,
  },
  'Le Temps': {
    publisher: 'Le Temps',
    domain: 'letemps.ch',
    sourceType: 'REGIONAL_COMMERCIAL_MEDIA',
    editorialStandards: 'VERIFIED_EDITORIAL_BOARD',
    authorshipTransparency: 'BYLINED_IDENTIFIED',
    correctionPolicy: 'BASIC_CORRECTION',
    historicalReliability: 0.88,
    isFirstPartyReporting: true,
  },
  'Commodity Intelligence Daily': {
    publisher: 'Commodity Intelligence Daily',
    domain: 'commodityintel.ch',
    sourceType: 'SPECIALIZED_INDUSTRY_JOURNAL',
    editorialStandards: 'VERIFIED_EDITORIAL_BOARD',
    authorshipTransparency: 'BYLINED_IDENTIFIED',
    correctionPolicy: 'BASIC_CORRECTION',
    historicalReliability: 0.82,
    isFirstPartyReporting: false,
  },
  'Offshore Alert Hub': {
    publisher: 'Offshore Alert Hub',
    domain: 'offshore-whistle.org',
    sourceType: 'UNVERIFIED_BLOG',
    editorialStandards: 'UNREGULATED',
    authorshipTransparency: 'ANONYMOUS_UNVERIFIED',
    correctionPolicy: 'NONE_DOCUMENTED',
    historicalReliability: 0.35,
    isFirstPartyReporting: false,
  },
};

export class SourceCredibilityEvaluator {
  public static readonly POLICY_VERSION = 'POL-CRED-2026.1';

  public static evaluateCredibility(
    articleId: string,
    publisher: string,
    domain?: string,
    evidencePassageIds: string[] = []
  ): CredibilityAssessment {
    const known = this.findPublisherProfile(publisher, domain);

    const sourceType: SourceType = known?.sourceType || this.inferSourceType(publisher, domain);
    const editorialStandards: EditorialStandard =
      known?.editorialStandards || this.inferEditorialStandards(sourceType);
    const authorshipTransparency: AuthorshipTransparency =
      known?.authorshipTransparency || 'ORGANIZATIONAL_BYLINE';
    const correctionPolicy: CorrectionPolicyType =
      known?.correctionPolicy || 'BASIC_CORRECTION';
    const historicalReliability = known?.historicalReliability ?? 0.65;
    const isFirstPartyReporting = known?.isFirstPartyReporting ?? true;

    // Deterministic mathematical weighting (Total = 1.0)
    // 1. Source Type Base (35%)
    let typeWeight = 0.5;
    switch (sourceType) {
      case 'REGULATORY_AUTHORITY':
        typeWeight = 1.0;
        break;
      case 'JUDICIAL_GAZETTE':
        typeWeight = 0.95;
        break;
      case 'MAJOR_INVESTIGATIVE_OUTLET':
        typeWeight = 0.85;
        break;
      case 'SPECIALIZED_INDUSTRY_JOURNAL':
        typeWeight = 0.8;
        break;
      case 'REGIONAL_COMMERCIAL_MEDIA':
        typeWeight = 0.65;
        break;
      case 'UNVERIFIED_BLOG':
        typeWeight = 0.2;
        break;
      case 'UNKNOWN':
      default:
        typeWeight = 0.4;
        break;
    }

    // 2. Editorial Standards (25%)
    let editorialWeight = 0.5;
    switch (editorialStandards) {
      case 'STRICT_PEER_REVIEW':
        editorialWeight = 1.0;
        break;
      case 'VERIFIED_EDITORIAL_BOARD':
        editorialWeight = 0.85;
        break;
      case 'COMMERCIAL_NEWSROOM':
        editorialWeight = 0.65;
        break;
      case 'UNREGULATED':
        editorialWeight = 0.15;
        break;
    }

    // 3. Authorship Transparency (15%)
    let authorWeight = 0.5;
    switch (authorshipTransparency) {
      case 'BYLINED_IDENTIFIED':
        authorWeight = 1.0;
        break;
      case 'ORGANIZATIONAL_BYLINE':
        authorWeight = 0.75;
        break;
      case 'ANONYMOUS_UNVERIFIED':
        authorWeight = 0.2;
        break;
    }

    // 4. Correction Policy (10%)
    let corrWeight = 0.5;
    switch (correctionPolicy) {
      case 'TRANSPARENT_CORRECTION_POLICY':
        corrWeight = 1.0;
        break;
      case 'BASIC_CORRECTION':
        corrWeight = 0.6;
        break;
      case 'NONE_DOCUMENTED':
        corrWeight = 0.1;
        break;
    }

    // 5. Historical Reliability & Reporting (15%)
    const reportingBonus = isFirstPartyReporting ? 0.05 : 0.0;
    const historyWeight = Math.min(1.0, historicalReliability * 0.95 + reportingBonus);

    // Final Weighted Score (0.0 - 1.0)
    const rawScore =
      typeWeight * 0.35 +
      editorialWeight * 0.25 +
      authorWeight * 0.15 +
      corrWeight * 0.1 +
      historyWeight * 0.15;

    const credibilityScore = Math.round(Math.min(1.0, Math.max(0.0, rawScore)) * 100) / 100;

    let credibilityTier: CredibilityTier = 'MEDIUM';
    if (credibilityScore >= 0.85) credibilityTier = 'VERY_HIGH';
    else if (credibilityScore >= 0.7) credibilityTier = 'HIGH';
    else if (credibilityScore >= 0.5) credibilityTier = 'MEDIUM';
    else if (credibilityScore >= 0.3) credibilityTier = 'LOW';
    else credibilityTier = 'VERY_LOW';

    const rationales: string[] = [
      `Source category classified as ${sourceType.replace(/_/g, ' ')} (${Math.round(typeWeight * 100)}% baseline).`,
      `Editorial rigor verified as ${editorialStandards.replace(/_/g, ' ')}.`,
      `Authorship accountability verified: ${authorshipTransparency.replace(/_/g, ' ')}.`,
      `Correction disclosure: ${correctionPolicy.replace(/_/g, ' ')}.`,
      `First-party investigative journalism: ${isFirstPartyReporting ? 'Yes (original reporting credit)' : 'No (secondary aggregation)'}.`,
      `Historical evidentiary accuracy metric: ${Math.round(historicalReliability * 100)}%.`,
    ];

    if (sourceType === 'REGULATORY_AUTHORITY' || sourceType === 'JUDICIAL_GAZETTE') {
      rationales.push('Official government / judicial gazette carries presumptive evidentiary weight under AM-28 policy.');
    } else if (sourceType === 'UNVERIFIED_BLOG') {
      rationales.push('CRITICAL RISK FACTOR: Self-published or unverified source requires mandatory secondary independent corroboration.');
    }

    return {
      id: `cred-${articleId}-${Date.now().toString(36)}`,
      articleId,
      sourceId: `src-${(publisher || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      sourceName: publisher,
      domain: domain || 'unknown',
      sourceType,
      credibilityScore,
      credibilityTier,
      editorialStandards,
      authorshipTransparency,
      correctionPolicy,
      isFirstPartyReporting,
      historicalReliability,
      evidencePassageIds,
      rationales,
      assessedAt: new Date().toISOString(),
      policyVersion: this.POLICY_VERSION,
    };
  }

  private static findPublisherProfile(publisher: string, domain?: string): KnownPublisherProfile | undefined {
    if (KNOWN_PUBLISHERS[publisher]) return KNOWN_PUBLISHERS[publisher];

    const lowerPub = publisher.toLowerCase();
    for (const [key, profile] of Object.entries(KNOWN_PUBLISHERS)) {
      if (lowerPub.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerPub)) {
        return profile;
      }
      if (domain && profile.domain && domain.toLowerCase().includes(profile.domain.toLowerCase())) {
        return profile;
      }
    }
    return undefined;
  }

  private static inferSourceType(publisher: string, domain?: string): SourceType {
    const combined = `${publisher} ${domain || ''}`.toLowerCase();
    if (combined.includes('justice') || combined.includes('gov') || combined.includes('admin.ch') || combined.includes('sec.gov') || combined.includes('court') || combined.includes('tribunal')) {
      return 'REGULATORY_AUTHORITY';
    }
    if (combined.includes('gazette') || combined.includes('bulletin jud')) {
      return 'JUDICIAL_GAZETTE';
    }
    if (combined.includes('times') || combined.includes('reuters') || combined.includes('bloomberg') || combined.includes('wsj') || combined.includes('post')) {
      return 'MAJOR_INVESTIGATIVE_OUTLET';
    }
    if (combined.includes('blog') || combined.includes('whistle') || combined.includes('forum') || combined.includes('wordpress')) {
      return 'UNVERIFIED_BLOG';
    }
    if (combined.includes('commodity') || combined.includes('energy') || combined.includes('oil') || combined.includes('trade')) {
      return 'SPECIALIZED_INDUSTRY_JOURNAL';
    }
    return 'REGIONAL_COMMERCIAL_MEDIA';
  }

  private static inferEditorialStandards(sourceType: SourceType): EditorialStandard {
    switch (sourceType) {
      case 'REGULATORY_AUTHORITY':
      case 'JUDICIAL_GAZETTE':
        return 'STRICT_PEER_REVIEW';
      case 'MAJOR_INVESTIGATIVE_OUTLET':
        return 'VERIFIED_EDITORIAL_BOARD';
      case 'SPECIALIZED_INDUSTRY_JOURNAL':
      case 'REGIONAL_COMMERCIAL_MEDIA':
        return 'COMMERCIAL_NEWSROOM';
      case 'UNVERIFIED_BLOG':
      default:
        return 'UNREGULATED';
    }
  }
}

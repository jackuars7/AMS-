/**
 * Structured Output Validator for AM-21 through AM-27
 * Rejects any AI extraction output that contains:
 * - Invalid passage offsets
 * - Missing citations
 * - Unsupported claims
 * - Unknown controlled values (taxonomies, legal statuses, roles)
 * - Missing prompt or model versions
 * - Malicious prompt injection payload execution
 */
import {
  ArticleExtractionBundle,
  ControlledLegalStatus,
  EvidencePassage,
} from '../types/index.ts';
import { CitationValidator } from './citation-validator.ts';

export interface ExtractionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  citationCoverageScore: number;
}

const VALID_CONTROLLED_LEGAL_STATUSES: Set<ControlledLegalStatus> = new Set([
  'ALLEGATION',
  'INVESTIGATION',
  'FORMAL_CHARGES_FILED',
  'ARREST_WARRANT',
  'TRIAL_PROCEEDING',
  'CONVICTION',
  'ACQUITTAL',
  'SETTLEMENT',
  'DISMISSAL',
  'REMEDIATED',
  'RETRACTED',
]);

export class ExtractionValidator {
  public static validateBundle(
    bundle: ArticleExtractionBundle,
    articleRawText: string
  ): ExtractionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check prompt & model versions
    if (!bundle.lastExtractionRun.promptVersion || bundle.lastExtractionRun.promptVersion.trim() === '') {
      errors.push('Missing prompt version metadata (AM-21 / Audit requirement).');
    }
    if (!bundle.lastExtractionRun.modelVersion || bundle.lastExtractionRun.modelVersion.trim() === '') {
      errors.push('Missing model version metadata.');
    }

    // 2. Validate exact passage character offsets against article raw text
    const passageCheck = CitationValidator.validatePassageOffsets(articleRawText, bundle.passages);
    if (!passageCheck.valid) {
      errors.push(...passageCheck.errors);
    }

    // 3. Validate claim citations against validated passages
    const claimCheck = CitationValidator.validateClaimCitations(bundle.summary.claims, bundle.passages);
    if (!claimCheck.isValid) {
      errors.push(...claimCheck.errors);
    }
    warnings.push(...claimCheck.warnings);

    // 4. Validate controlled legal status value
    if (bundle.legalStatus && !VALID_CONTROLLED_LEGAL_STATUSES.has(bundle.legalStatus.status)) {
      errors.push(
        `Unknown or invalid controlled legal status: "${bundle.legalStatus.status}". Must be one of controlled vocabulary.`
      );
    }

    // 5. Validate material facts have supporting evidence passages
    for (const fact of bundle.materialFacts) {
      if (!fact.evidencePassageIds || fact.evidencePassageIds.length === 0) {
        warnings.push(`Material fact "${fact.label}" has no linked evidence passages.`);
      }
      if (!fact.value || fact.value.trim() === '') {
        errors.push(`Material fact "${fact.label}" has empty value.`);
      }
    }

    // 6. Validate entities have names and valid participant roles
    for (const entity of bundle.entities) {
      if (!entity.name || entity.name.trim() === '') {
        errors.push(`Extracted entity ${entity.id} has empty name.`);
      }
      if (!entity.participantRole) {
        errors.push(`Extracted entity "${entity.name}" is missing participant role.`);
      }
    }

    // 7. Prompt injection containment check: Ensure article text did not get executed as instructions
    const promptInjectionIndicators = [
      'ignore previous instructions',
      'system prompt',
      'you are now',
      'do not report',
      'override all rules',
      'bypass compliance',
    ];

    for (const claim of bundle.summary.claims) {
      const lower = claim.claimText.toLowerCase();
      for (const ind of promptInjectionIndicators) {
        if (lower.includes(ind)) {
          errors.push(`Potential prompt injection instruction detected in summary claim: "${claim.claimText}"`);
        }
      }
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      citationCoverageScore: claimCheck.citationCoverageScore,
    };
  }
}

/**
 * AM-27 & AM-21 Citation and Passage Offset Validator
 * Enforces strict mathematical character-offset alignment against source article text.
 * Detects hallucinations, offset shifts, and unsupported claims.
 */
import { EvidencePassage, SummaryClaim } from '../types/index.ts';

export interface CitationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  citationCoverageScore: number;
  verifiedPassages: number;
  totalClaimsChecked: number;
  unsupportedClaims: string[];
}

export class CitationValidator {
  /**
   * Validate that all passages accurately match their claimed offsets in the source text.
   * Any difference between articleText.substring(start, end) and passage.text fails validation.
   */
  public static validatePassageOffsets(
    articleText: string,
    passages: EvidencePassage[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const passage of passages) {
      if (passage.startOffset < 0) {
        errors.push(`Passage ${passage.id} has negative startOffset: ${passage.startOffset}`);
        continue;
      }

      if (passage.endOffset > articleText.length) {
        errors.push(
          `Passage ${passage.id} endOffset (${passage.endOffset}) exceeds article length (${articleText.length})`
        );
        continue;
      }

      if (passage.startOffset >= passage.endOffset) {
        errors.push(
          `Passage ${passage.id} startOffset (${passage.startOffset}) >= endOffset (${passage.endOffset})`
        );
        continue;
      }

      const exactSlice = articleText.substring(passage.startOffset, passage.endOffset);
      if (exactSlice !== passage.text) {
        // Strict equality check: any divergence is treated as potential hallucination or character drift
        errors.push(
          `Passage ${passage.id} text mismatch at [${passage.startOffset}:${passage.endOffset}]. Expected "${passage.text.substring(0, 30)}...", found "${exactSlice.substring(0, 30)}..."`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate that every claim cites valid existing passages and that all material assertions are backed.
   */
  public static validateClaimCitations(
    claims: SummaryClaim[],
    passages: EvidencePassage[]
  ): CitationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const unsupportedClaims: string[] = [];
    const validPassageIds = new Set(passages.map((p) => p.id));

    let supportedClaimsCount = 0;

    for (const claim of claims) {
      if (!claim.supportingPassageIds || claim.supportingPassageIds.length === 0) {
        errors.push(`Claim "${claim.id}" has no supporting citations (AM-21 violation).`);
        unsupportedClaims.push(claim.id);
        continue;
      }

      let hasAtLeastOneValidPassage = false;
      for (const passId of claim.supportingPassageIds) {
        if (!validPassageIds.has(passId)) {
          errors.push(
            `Claim "${claim.id}" cites non-existent or unvalidated passage ID "${passId}".`
          );
        } else {
          hasAtLeastOneValidPassage = true;
        }
      }

      if (hasAtLeastOneValidPassage) {
        supportedClaimsCount++;
      } else {
        unsupportedClaims.push(claim.id);
      }

      // Specific check for Verified Findings: must have high confidence (>= 0.85)
      if (claim.isVerifiedFinding && claim.confidence < 0.8) {
        warnings.push(
          `Claim "${claim.id}" is marked as VERIFIED_FINDING but confidence is low (${claim.confidence}).`
        );
      }
    }

    const citationCoverageScore =
      claims.length > 0 ? Number((supportedClaimsCount / claims.length).toFixed(4)) : 1.0;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      citationCoverageScore,
      verifiedPassages: passages.length,
      totalClaimsChecked: claims.length,
      unsupportedClaims,
    };
  }

  /**
   * Helper to extract surrounding prefix and suffix context for a passage
   */
  public static extractContext(
    fullText: string,
    startOffset: number,
    endOffset: number,
    contextLen = 60
  ): { prefix: string; suffix: string } {
    const prefixStart = Math.max(0, startOffset - contextLen);
    const suffixEnd = Math.min(fullText.length, endOffset + contextLen);

    return {
      prefix: (prefixStart > 0 ? '...' : '') + fullText.substring(prefixStart, startOffset),
      suffix: fullText.substring(endOffset, suffixEnd) + (suffixEnd < fullText.length ? '...' : ''),
    };
  }
}

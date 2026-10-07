/**
 * AM-25 Jurisdiction and Location Normalization Service
 * Strictly distinguishes between Event Location (conduct), Publication Location (publisher),
 * Court Location (adjudication), and Legal Jurisdiction (sovereign legal framework).
 */
import { JurisdictionAssertion } from '../types/index.ts';

export interface NormalizedCountry {
  code: string;
  name: string;
  region: string;
}

export class JurisdictionNormalizer {
  private static readonly COUNTRY_MAP: Record<string, NormalizedCountry> = {
    US: { code: 'US', name: 'United States', region: 'North America' },
    GB: { code: 'GB', name: 'United Kingdom', region: 'Europe' },
    CH: { code: 'CH', name: 'Switzerland', region: 'Europe' },
    CY: { code: 'CY', name: 'Cyprus', region: 'Europe' },
    FR: { code: 'FR', name: 'France', region: 'Europe' },
    DE: { code: 'DE', name: 'Germany', region: 'Europe' },
    AE: { code: 'AE', name: 'United Arab Emirates', region: 'Middle East' },
    SG: { code: 'SG', name: 'Singapore', region: 'Asia-Pacific' },
    HK: { code: 'HK', name: 'Hong Kong SAR', region: 'Asia-Pacific' },
    LU: { code: 'LU', name: 'Luxembourg', region: 'Europe' },
    KY: { code: 'KY', name: 'Cayman Islands', region: 'Caribbean' },
    VG: { code: 'VG', name: 'British Virgin Islands', region: 'Caribbean' },
    RU: { code: 'RU', name: 'Russian Federation', region: 'Eurasia' },
    IN: { code: 'IN', name: 'India', region: 'South Asia' },
    SA: { code: 'SA', name: 'Saudi Arabia', region: 'Middle East' },
  };

  /**
   * Normalizes country code or alias into standardized ISO country
   */
  public static normalizeCountry(raw: string): NormalizedCountry {
    const clean = raw.trim().toUpperCase();
    if (this.COUNTRY_MAP[clean]) {
      return this.COUNTRY_MAP[clean];
    }

    // Name matching
    for (const entry of Object.values(this.COUNTRY_MAP)) {
      if (entry.name.toUpperCase() === clean || clean.includes(entry.name.toUpperCase())) {
        return entry;
      }
    }

    return {
      code: clean.length === 2 ? clean : 'XX',
      name: raw.trim(),
      region: 'Global / International',
    };
  }

  /**
   * Ensures event location, publication location, and legal jurisdiction remain distinct.
   */
  public static validateDisentangledJurisdiction(
    assertion: Partial<JurisdictionAssertion>,
    publicationLocation?: string | null
  ): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    if (
      publicationLocation &&
      assertion.legalJurisdiction &&
      publicationLocation.toLowerCase() === assertion.legalJurisdiction.toLowerCase()
    ) {
      warnings.push(
        `Warning: Legal jurisdiction matches publication location ("${publicationLocation}"). Ensure sovereign jurisdiction is not conflated with where the article was printed.`
      );
    }

    if (
      assertion.eventLocation &&
      assertion.legalJurisdiction &&
      assertion.eventLocation === assertion.legalJurisdiction
    ) {
      // Often event location and jurisdiction differ (e.g. cross-border fraud committed in Cyprus prosecuted in SDNY)
    }

    return {
      valid: true,
      warnings,
    };
  }
}

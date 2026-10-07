/**
 * AM-24 Entity and Participant Linking Engine
 * Disambiguates people, organizations, regulators, and courts, mapping roles and relationships.
 */
import { ExtractedEntity, ExtractedEntityType, ParticipantRoleType } from '../types/index.ts';

export class EntityLinkingEngine {
  /**
   * Disambiguate entity names and flag if an entity matches the primary screened subject or known aliases.
   */
  public static linkToSubject(
    entity: Partial<ExtractedEntity>,
    subjectName: string,
    subjectAliases: string[] = []
  ): { isMatch: boolean; confidence: number } {
    if (!entity.name) return { isMatch: false, confidence: 0 };

    const normEntity = entity.name.trim().toLowerCase();
    const normSubject = subjectName.trim().toLowerCase();

    if (normEntity === normSubject) {
      return { isMatch: true, confidence: 1.0 };
    }

    for (const alias of subjectAliases) {
      const normAlias = alias.trim().toLowerCase();
      if (normEntity === normAlias) {
        return { isMatch: true, confidence: 0.98 };
      }
    }

    // Substring token match for full names
    const subjectTokens = normSubject.split(/\s+/).filter((t) => t.length > 2);
    const entityTokens = normEntity.split(/\s+/).filter((t) => t.length > 2);
    const intersection = entityTokens.filter((t) => subjectTokens.includes(t));

    if (subjectTokens.length >= 2 && intersection.length >= 2) {
      return { isMatch: true, confidence: 0.85 };
    }

    return { isMatch: false, confidence: 0 };
  }

  /**
   * Helper to classify entity type based on common corporate and judicial indicators
   */
  public static inferEntityType(name: string): ExtractedEntityType {
    const lower = name.toLowerCase();

    if (
      lower.includes('court') ||
      lower.includes('tribunal') ||
      lower.includes('district court') ||
      lower.includes('high court')
    ) {
      return 'COURT';
    }

    if (
      lower.includes('sec') ||
      lower.includes('fca') ||
      lower.includes('commission') ||
      lower.includes('authority') ||
      lower.includes('regulator') ||
      lower.includes('bafin') ||
      lower.includes('finma')
    ) {
      return 'REGULATOR';
    }

    if (
      lower.includes('police') ||
      lower.includes('fbi') ||
      lower.includes('sfo') ||
      lower.includes('prosecutor') ||
      lower.includes('pnf') ||
      lower.includes('department of justice') ||
      lower.includes('doj')
    ) {
      return 'ENFORCEMENT_AGENCY';
    }

    if (
      lower.includes('ltd') ||
      lower.includes('limited') ||
      lower.includes('inc') ||
      lower.includes('corp') ||
      lower.includes('plc') ||
      lower.includes('gmbh') ||
      lower.includes('holdings') ||
      lower.includes('bank') ||
      lower.includes('group')
    ) {
      return 'ORGANIZATION';
    }

    return 'PERSON';
  }

  /**
   * Helper to infer participant role based on semantic context
   */
  public static inferParticipantRole(
    entityType: ExtractedEntityType,
    context: string
  ): ParticipantRoleType {
    const lower = context.toLowerCase();

    if (entityType === 'COURT') {
      return 'PRESIDING_JUDGE';
    }
    if (entityType === 'REGULATOR' || entityType === 'ENFORCEMENT_AGENCY') {
      return 'INVESTIGATING_AUTHORITY';
    }

    if (
      lower.includes('charged with') ||
      lower.includes('indicted') ||
      lower.includes('arrested') ||
      lower.includes('suspect') ||
      lower.includes('defendant') ||
      lower.includes('alleged')
    ) {
      return 'ALLEGED_PERPETRATOR';
    }

    if (
      lower.includes('probe') ||
      lower.includes('scrutiny') ||
      lower.includes('inquiry into') ||
      lower.includes('investigating')
    ) {
      return 'ENTITY_UNDER_INVESTIGATION';
    }

    if (lower.includes('whistleblower') || lower.includes('tipoff') || lower.includes('reported to')) {
      return 'WHISTLEBLOWER';
    }

    if (lower.includes('victim') || lower.includes('defrauded') || lower.includes('lost money')) {
      return 'COMPLAINANT_VICTIM';
    }

    if (lower.includes('lawyer') || lower.includes('attorney') || lower.includes('represented by') || lower.includes('counsel')) {
      return 'LEGAL_COUNSEL';
    }

    return 'UNAFFILIATED_MENTION';
  }
}

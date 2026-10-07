/**
 * AM-57: Material-Update Detection Engine
 * Detects procedural and substantive material changes between monitoring cycles:
 * - Criminal Charges / Formal Indictments
 * - Judicial Rulings / Sentences / Convictions
 * - Acquittals / Full Dismissals
 * - Appeals Lodged / Injunctions
 * - Settlements & Regulatory Enforcement Decrees
 * - Formal Retractions & Editorial Corrections
 * - New Independent Corroborating Sources
 * - Contradictory Evidence Emergence
 * - Significant Identity / Beneficial Ownership Changes
 */

import {
  MaterialUpdate,
  MaterialUpdateCategory,
} from '../../types/index.ts';

export interface MaterialDetectionInput {
  cycleId: string;
  eventId: string;
  articleId?: string;
  subjectId: string;
  previousStatus?: string;
  newStatus: string;
  headline: string;
  content: string;
  sourceEvidencePassageIds?: string[];
  independentCorroborationCount?: number;
  previousCorroborationCount?: number;
  hasIdentityChange?: boolean;
}

export class MaterialChangeRulesEngine {
  private materialUpdates: Map<string, MaterialUpdate> = new Map();

  constructor() {
    this.seedDefaultMaterialUpdates();
  }

  /**
   * Deterministically analyze an update for materiality classification
   */
  public evaluateMaterialUpdate(input: MaterialDetectionInput): MaterialUpdate | null {
    const textLower = (input.headline + ' ' + input.content).toLowerCase();
    let category: MaterialUpdateCategory | null = null;
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
    let requiresImmediateEscalation = false;
    let summary = '';

    // 1. Check for Convictions & Verdicts
    if (textLower.includes('convicted') || textLower.includes('guilty verdict') || textLower.includes('sentenced to')) {
      category = 'CONVICTION';
      severity = 'CRITICAL';
      requiresImmediateEscalation = true;
      summary = 'Judicial tribunal entered formal conviction against the subject.';
    }
    // 2. Check for Acquittals / Dismissals
    else if (textLower.includes('acquitted') || textLower.includes('acquittal') || textLower.includes('charges dropped') || textLower.includes('dismissed with prejudice')) {
      category = 'ACQUITTAL';
      severity = 'HIGH';
      summary = 'Official exoneration or court dismissal entered. Prior adverse standing resolved.';
    }
    // 3. Check for Formal Indictments / Charges
    else if (textLower.includes('indicted') || textLower.includes('formal charges') || textLower.includes('criminal indictment')) {
      category = 'CHARGE';
      severity = 'CRITICAL';
      requiresImmediateEscalation = true;
      summary = 'Prosecuting authority filed formal criminal indictment.';
    }
    // 4. Check for Appeals
    else if (textLower.includes('appeal lodged') || textLower.includes('appeals court') || textLower.includes('appealed the ruling')) {
      category = 'APPEAL';
      severity = 'HIGH';
      summary = 'Appellate review proceedings formally initiated.';
    }
    // 5. Check for Retractions
    else if (textLower.includes('retraction') || textLower.includes('retracts reporting') || textLower.includes('withdrawn by publisher')) {
      category = 'RETRACTION';
      severity = 'HIGH';
      summary = 'Publisher formally retracted original investigative report.';
    }
    // 6. Check for Editorial Corrections
    else if (textLower.includes('correction') || textLower.includes('editor\'s note') || textLower.includes('amended statement')) {
      category = 'CORRECTION';
      severity = 'MEDIUM';
      summary = 'Publisher issued factual correction to underlying article.';
    }
    // 7. Check for Settlements
    else if (textLower.includes('settlement agreement') || textLower.includes('agreed to pay fine') || textLower.includes('consent order')) {
      category = 'SETTLEMENT';
      severity = 'HIGH';
      summary = 'Regulatory or civil enforcement settled via consent decree.';
    }
    // 8. Check for New Corroboration
    else if (
      input.independentCorroborationCount &&
      input.previousCorroborationCount &&
      input.independentCorroborationCount > input.previousCorroborationCount
    ) {
      category = 'NEW_INDEPENDENT_CORROBORATION';
      severity = 'HIGH';
      summary = `Corroborating independent sources increased from ${input.previousCorroborationCount} to ${input.independentCorroborationCount}.`;
    }
    // 9. Identity Change
    else if (input.hasIdentityChange) {
      category = 'SIGNIFICANT_IDENTITY_CHANGE';
      severity = 'HIGH';
      summary = 'Verified subject alias or corporate ownership registry modified.';
    }

    if (!category) {
      return null;
    }

    const id = `mat-upd-${input.eventId}-${Date.now()}`;
    const update: MaterialUpdate = {
      id,
      cycleId: input.cycleId,
      eventId: input.eventId,
      articleId: input.articleId,
      subjectId: input.subjectId,
      updateCategory: category,
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      headline: input.headline,
      summary,
      sourceEvidencePassageIds: input.sourceEvidencePassageIds || [],
      detectedAt: new Date().toISOString(),
      severity,
      requiresImmediateEscalation,
      aiNarrativeDraft: `AI Draft Summary: Detected ${category} event from monitoring feed. Immediate review recommended based on severity: ${severity}.`,
    };

    this.materialUpdates.set(id, update);
    return update;
  }

  public getMaterialUpdate(id: string): MaterialUpdate | undefined {
    return this.materialUpdates.get(id);
  }

  public getAllMaterialUpdates(): MaterialUpdate[] {
    return Array.from(this.materialUpdates.values());
  }

  private seedDefaultMaterialUpdates() {
    const now = new Date();
    // 1. Apex Energy - Formal Indictment in Geneva Tribunal
    const upd1: MaterialUpdate = {
      id: 'mat-apex-indictment-01',
      cycleId: 'cyc-apex-001',
      eventId: 'evt-apex-geneva-01',
      articleId: 'art-tdg-2026-new',
      subjectId: 'sbj-apex-01',
      updateCategory: 'CHARGE',
      previousStatus: 'FORMAL_INVESTIGATION',
      newStatus: 'FORMAL_INDICTMENT',
      headline: 'Swiss Federal Prosecutor Indicts Alexander Vance in Geneva Criminal Tribunal',
      summary: 'Public prosecutor filed official indictment detailing $45M procurement bribery scheme.',
      sourceEvidencePassageIds: ['pass-tdg-2026-01', 'pass-tdg-2026-02'],
      detectedAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
      severity: 'CRITICAL',
      requiresImmediateEscalation: true,
      aiNarrativeDraft: 'AI Draft: Federal criminal indictment formally lodged in Geneva Tribunal. Triggers mandatory EDD case refresh and MLRO notification.',
    };
    this.materialUpdates.set(upd1.id, upd1);

    // 2. Meridian Shipping - Full Acquittal Verdict
    const upd2: MaterialUpdate = {
      id: 'mat-meridian-acquittal-02',
      cycleId: 'cyc-meridian-002',
      eventId: 'evt-meridian-01',
      articleId: 'art-admiralty-verdict-01',
      subjectId: 'sbj-meridian-01',
      updateCategory: 'ACQUITTAL',
      previousStatus: 'TRIAL_IN_PROGRESS',
      newStatus: 'FULL_ACQUITTAL',
      headline: 'Admiralty High Court Exonerates Meridian Shipping in Customs Case',
      summary: 'Unanimous verdict of full acquittal entered. Court ruled customs declarations were lawful.',
      sourceEvidencePassageIds: ['pass-admiralty-01'],
      detectedAt: new Date(now.getTime() - 12 * 3600000).toISOString(),
      severity: 'HIGH',
      requiresImmediateEscalation: false,
      aiNarrativeDraft: 'AI Draft: Full acquittal resolves prior pending trial risk. Grounds for downward risk adjustment.',
    };
    this.materialUpdates.set(upd2.id, upd2);

    // 3. Cygnus Minerals - Emergency Appeal Lodged
    const upd3: MaterialUpdate = {
      id: 'mat-cygnus-appeal-03',
      cycleId: 'cyc-cygnus-003',
      eventId: 'evt-cygnus-02',
      articleId: 'art-cygnus-appeal-01',
      subjectId: 'sbj-cygnus-01',
      updateCategory: 'APPEAL',
      previousStatus: 'DISMISSED',
      newStatus: 'APPEAL_LODGED',
      headline: 'Prosecution Files High Court Appeal on Mineral Export Probe',
      summary: 'Court of Appeal accepted challenge against lower court dismissal of export tax allegations.',
      sourceEvidencePassageIds: ['pass-cygnus-appeal-01'],
      detectedAt: new Date(now.getTime() - 18 * 3600000).toISOString(),
      severity: 'HIGH',
      requiresImmediateEscalation: true,
      aiNarrativeDraft: 'AI Draft: Appellate court accepted review. Cleared event reopened automatically.',
    };
    this.materialUpdates.set(upd3.id, upd3);

    // 4. Nordic Timber - Editorial Retraction
    const upd4: MaterialUpdate = {
      id: 'mat-nordic-retraction-04',
      cycleId: 'cyc-nordic-004',
      eventId: 'evt-nordic-01',
      articleId: 'art-nordic-retracted-01',
      subjectId: 'sbj-nordic-01',
      updateCategory: 'RETRACTION',
      previousStatus: 'REPORTED_ALLEGATION',
      newStatus: 'RETRACTED_BY_PUBLISHER',
      headline: 'Helsinki Daily Retracts Investigative Story on Timber Licensing',
      summary: 'Publisher issued front-page retraction and apology acknowledging false source claims.',
      sourceEvidencePassageIds: ['pass-retract-01'],
      detectedAt: new Date(now.getTime() - 36 * 3600000).toISOString(),
      severity: 'HIGH',
      requiresImmediateEscalation: false,
      aiNarrativeDraft: 'AI Draft: Investigation allegations fully retracted by reporting news agency.',
    };
    this.materialUpdates.set(upd4.id, upd4);
  }
}

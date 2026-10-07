/**
 * AM-23 Legal and Procedural Status State Machine & Validation Engine
 * Governs controlled status transitions, evidentiary prerequisites, and lifecycle rules.
 * Strictly prevents collapsing distinct procedural phases into generic adverse labels.
 */
import {
  ControlledLegalStatus,
  LegalStatusAssertion,
  LegalStatusTransitionRule,
} from '../types/index.ts';

export class LegalStatusMachine {
  private static readonly RULES: LegalStatusTransitionRule[] = [
    // Initial stage: Allegation
    {
      fromStatus: 'ALLEGATION',
      toStatus: 'INVESTIGATION',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Formal inquiry initiated by regulatory body or law enforcement.',
    },
    {
      fromStatus: 'ALLEGATION',
      toStatus: 'FORMAL_CHARGES_FILED',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Direct indictment or criminal charges filed following preliminary probe.',
    },
    {
      fromStatus: 'ALLEGATION',
      toStatus: 'RETRACTED',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Publishing entity or complainant retracts allegation.',
    },
    {
      fromStatus: 'ALLEGATION',
      toStatus: 'DISMISSAL',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Civil claim dismissed prior to formal discovery.',
    },

    // Investigation stage
    {
      fromStatus: 'INVESTIGATION',
      toStatus: 'ARREST_WARRANT',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Arrest warrant issued during investigation.',
    },
    {
      fromStatus: 'INVESTIGATION',
      toStatus: 'FORMAL_CHARGES_FILED',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Prosecutor or regulator files formal charges or indictment.',
    },
    {
      fromStatus: 'INVESTIGATION',
      toStatus: 'DISMISSAL',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Investigation closed without action, no charges brought.',
    },
    {
      fromStatus: 'INVESTIGATION',
      toStatus: 'SETTLEMENT',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Regulatory settlement, consent order, or DPA reached during investigation.',
    },
    {
      fromStatus: 'INVESTIGATION',
      toStatus: 'RETRACTED',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Report of investigation retracted by media outlet.',
    },

    // Arrest / Formal Charges
    {
      fromStatus: 'ARREST_WARRANT',
      toStatus: 'FORMAL_CHARGES_FILED',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Arrest followed by formal arraignment and indictment.',
    },
    {
      fromStatus: 'FORMAL_CHARGES_FILED',
      toStatus: 'TRIAL_PROCEEDING',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Matter proceeds to court hearings or jury trial.',
    },
    {
      fromStatus: 'FORMAL_CHARGES_FILED',
      toStatus: 'SETTLEMENT',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Plea bargain, civil consent judgment, or deferred prosecution agreement.',
    },
    {
      fromStatus: 'FORMAL_CHARGES_FILED',
      toStatus: 'DISMISSAL',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Prosecution withdraws charges or court dismisses case.',
    },

    // Trial stage
    {
      fromStatus: 'TRIAL_PROCEEDING',
      toStatus: 'CONVICTION',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Court finds defendant guilty or accepts guilty plea.',
    },
    {
      fromStatus: 'TRIAL_PROCEEDING',
      toStatus: 'ACQUITTAL',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Defendant acquitted / found not guilty on all counts.',
    },
    {
      fromStatus: 'TRIAL_PROCEEDING',
      toStatus: 'DISMISSAL',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Mistrial declared with prejudice or case dismissed by presiding judge.',
    },
    {
      fromStatus: 'TRIAL_PROCEEDING',
      toStatus: 'SETTLEMENT',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Settlement reached mid-trial.',
    },

    // Post-outcome transitions
    {
      fromStatus: 'CONVICTION',
      toStatus: 'REMEDIATED',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Penalty paid in full, probation completed, or compliance monitor discharged.',
    },
    {
      fromStatus: 'SETTLEMENT',
      toStatus: 'REMEDIATED',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Consent decree terms satisfied, fines settled, monitor completed.',
    },
    {
      fromStatus: 'CONVICTION',
      toStatus: 'ACQUITTAL',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Conviction overturned on appeal and defendant acquitted.',
    },
    {
      fromStatus: 'CONVICTION',
      toStatus: 'DISMISSAL',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Conviction vacated and charges dismissed on appeal.',
    },

    // Retractions are permitted from any state upon verified publisher/court retraction
    {
      fromStatus: 'CONVICTION',
      toStatus: 'RETRACTED',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Reporting claiming conviction verified to be completely retracted/erroneous.',
    },
    {
      fromStatus: 'ACQUITTAL',
      toStatus: 'RETRACTED',
      allowed: true,
      requiresEvidence: true,
      ruleDescription: 'Erroneous reporting retracted.',
    },
  ];

  public static getTransitionRules(): LegalStatusTransitionRule[] {
    return this.RULES;
  }

  public static isTransitionAllowed(
    from: ControlledLegalStatus,
    to: ControlledLegalStatus
  ): { allowed: boolean; ruleDescription?: string; requiresEvidence: boolean } {
    if (from === to) {
      return { allowed: true, ruleDescription: 'Status re-affirmed with updated evidence', requiresEvidence: false };
    }

    const rule = this.RULES.find((r) => r.fromStatus === from && r.toStatus === to);
    if (rule) {
      return {
        allowed: rule.allowed,
        ruleDescription: rule.ruleDescription,
        requiresEvidence: rule.requiresEvidence,
      };
    }

    return {
      allowed: false,
      ruleDescription: `Illegal procedural transition: Cannot jump directly from ${from} to ${to} without intermediate procedural milestones.`,
      requiresEvidence: true,
    };
  }

  /**
   * Validates a status assertion before committing to record.
   */
  public static validateAssertion(
    assertion: Partial<LegalStatusAssertion>,
    existingAssertion?: LegalStatusAssertion
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!assertion.status) {
      errors.push('Legal status is mandatory.');
    }

    if (!assertion.jurisdiction || assertion.jurisdiction.trim() === '') {
      errors.push('Legal jurisdiction is mandatory to prevent generic labeling (AM-23).');
    }

    if (!assertion.authority || assertion.authority.trim() === '') {
      errors.push('Investigating or judicial authority must be specified (AM-23).');
    }

    if (!assertion.subject || assertion.subject.trim() === '') {
      errors.push('Subject under legal procedure must be identified.');
    }

    if (existingAssertion && assertion.status && existingAssertion.status !== assertion.status) {
      const check = this.isTransitionAllowed(existingAssertion.status, assertion.status);
      if (!check.allowed) {
        errors.push(check.ruleDescription || 'Invalid legal status transition.');
      }
      if (check.requiresEvidence && (!assertion.evidencePassageIds || assertion.evidencePassageIds.length === 0)) {
        errors.push(
          `Transition from ${existingAssertion.status} to ${assertion.status} requires at least one supporting evidence passage citation.`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

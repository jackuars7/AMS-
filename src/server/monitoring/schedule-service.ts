/**
 * AM-53: Scheduled Rescreening & Recalculation Engine
 * Calculates, recalculates, and audits periodic screening schedules
 * based on customer risk rating, relationship type, review type, and authorized exceptions.
 */

import {
  RiskRating,
  ScheduleEscalationStatus,
  ScheduleRevision,
  ScheduleReviewType,
  ScheduleStatus,
  ScreeningSchedule,
} from '../../types/index.ts';

export interface ScheduleCalculationInput {
  caseId: string;
  subjectId: string;
  customerRisk?: RiskRating;
  customerRiskRating?: RiskRating;
  relationshipType?: string;
  jurisdiction?: string;
  reviewType?: ScheduleReviewType;
  priorFindingCount?: number;
  authorizedExceptionDays?: number;
  authorizedExceptionRef?: string;
  policyVersion?: string;
}

export class ScheduleService {
  private schedules: Map<string, ScreeningSchedule> = new Map();
  private revisions: Map<string, ScheduleRevision[]> = new Map();

  constructor() {
    this.seedDefaultSchedules();
  }

  /**
   * Determine screening interval strictly from policy rules and risk tiers.
   * Standard enterprise AML intervals:
   * - HIGH Risk: 90 days (Quarterly)
   * - PEP or Material Finding: 30 days (Monthly)
   * - MEDIUM Risk: 180 days (Semi-annual)
   * - LOW Risk: 365 days (Annual)
   * - Authorized exception overrides interval when approved.
   */
  public calculateIntervalDays(input: ScheduleCalculationInput): {
    intervalDays: number;
    ruleRef: string;
    ruleVersion: string;
  } {
    const version = input.policyVersion || 'POL-MON-2026.1';
    const effectiveRisk = input.customerRisk || input.customerRiskRating || 'LOW';

    // Authorized exception takes precedence if defined
    if (input.authorizedExceptionDays && input.authorizedExceptionDays > 0) {
      return {
        intervalDays: input.authorizedExceptionDays,
        ruleRef: `EXCEPTION-${input.authorizedExceptionRef || 'AUTH-01'}`,
        ruleVersion: version,
      };
    }

    // High prior adverse finding density or PEP relationship
    if (input.priorFindingCount && input.priorFindingCount > 0) {
      return {
        intervalDays: 30,
        ruleRef: 'RULE-SCHED-ADVERSE-FINDINGS-30D',
        ruleVersion: version,
      };
    }

    if (input.relationshipType === 'PEP_ASSOCIATE' || input.relationshipType === 'SPECIAL_INTEREST') {
      return {
        intervalDays: 30,
        ruleRef: 'RULE-SCHED-PEP-30D',
        ruleVersion: version,
      };
    }

    switch (effectiveRisk) {
      case 'HIGH':
        return {
          intervalDays: 90,
          ruleRef: 'RULE-SCHED-HIGH-RISK-90D',
          ruleVersion: version,
        };
      case 'MEDIUM':
        return {
          intervalDays: 180,
          ruleRef: 'RULE-SCHED-MED-RISK-180D',
          ruleVersion: version,
        };
      case 'LOW':
      default:
        return {
          intervalDays: 365,
          ruleRef: 'RULE-SCHED-LOW-RISK-365D',
          ruleVersion: version,
        };
    }
  }

  /**
   * Create or calculate a screening schedule
   */
  public createSchedule(input: ScheduleCalculationInput, subscriptionId?: string): ScreeningSchedule {
    const { intervalDays, ruleRef, ruleVersion } = this.calculateIntervalDays(input);
    const now = new Date();
    const calculatedNextDate = new Date(now.getTime() + intervalDays * 86400000).toISOString();
    const subId = subscriptionId || `sub-${input.caseId}-${input.subjectId}`;

    const scheduleId = `sched-${input.caseId}-${input.subjectId}`;
    const schedule: ScreeningSchedule = {
      id: scheduleId,
      subscriptionId: subId,
      caseId: input.caseId,
      subjectId: input.subjectId,
      reviewType: input.reviewType || 'PERIODIC',
      customerRisk: input.customerRisk || input.customerRiskRating || 'HIGH',
      relationshipType: input.relationshipType || 'DIRECT_CUSTOMER',
      intervalDays,
      reviewFrequencyDays: intervalDays,
      calculatedNextDate,
      nextScreeningAt: calculatedNextDate,
      status: 'UPCOMING',
      escalationStatus: 'NORMAL',
      lastCalculatedAt: now.toISOString(),
      ruleRef,
      policyRuleApplied: ruleRef,
      ruleVersion,
      isPaused: false,
      authorizedExceptionRef: input.authorizedExceptionRef,
      revisionCount: 1,
    };

    this.schedules.set(scheduleId, schedule);
    return schedule;
  }

  /**
   * Recalculate schedule upon risk level, finding, or policy change
   */
  public recalculateScheduleDueToRiskChange(scheduleId: string, newRisk: RiskRating): ScreeningSchedule {
    return this.recalculateSchedule(scheduleId, {
      newRisk,
      triggerReason: 'RISK_UPGRADE',
      changedBy: 'SYSTEM_RISK_ENGINE',
      rationale: `Dynamic recalculation due to customer risk transition to ${newRisk}`,
    });
  }

  /**
   * Recalculate schedule upon risk level, finding, or policy change
   */
  public recalculateSchedule(
    scheduleId: string,
    updates: {
      newRisk?: RiskRating;
      newPriorFindingCount?: number;
      newPolicyVersion?: string;
      authorizedExceptionDays?: number;
      authorizedExceptionRef?: string;
      triggerReason: 'RISK_UPGRADE' | 'RISK_DOWNGRADE' | 'POLICY_UPDATE' | 'AUTHORISED_EXCEPTION' | 'MANUAL_OVERRIDE' | 'POST_DISPOSITION';
      changedBy: string;
      rationale: string;
    }
  ): ScreeningSchedule {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    const previousDate = schedule.calculatedNextDate;
    const previousInterval = schedule.intervalDays;

    if (updates.newRisk) {
      schedule.customerRisk = updates.newRisk;
    }
    if (updates.authorizedExceptionRef) {
      schedule.authorizedExceptionRef = updates.authorizedExceptionRef;
    }

    const { intervalDays, ruleRef, ruleVersion } = this.calculateIntervalDays({
      caseId: schedule.caseId,
      subjectId: schedule.subjectId,
      customerRisk: schedule.customerRisk,
      relationshipType: schedule.relationshipType,
      priorFindingCount: updates.newPriorFindingCount,
      authorizedExceptionDays: updates.authorizedExceptionDays,
      authorizedExceptionRef: updates.authorizedExceptionRef || schedule.authorizedExceptionRef,
      policyVersion: updates.newPolicyVersion || schedule.ruleVersion,
    });

    const now = new Date();
    schedule.intervalDays = intervalDays;
    schedule.reviewFrequencyDays = intervalDays;
    schedule.calculatedNextDate = new Date(now.getTime() + intervalDays * 86400000).toISOString();
    schedule.nextScreeningAt = schedule.calculatedNextDate;
    schedule.ruleRef = ruleRef;
    schedule.policyRuleApplied = ruleRef;
    schedule.ruleVersion = ruleVersion;
    schedule.lastCalculatedAt = now.toISOString();
    schedule.revisionCount += 1;
    this.refreshScheduleStatus(schedule);

    // Record revision audit
    const revision: ScheduleRevision = {
      id: `rev-${scheduleId}-${schedule.revisionCount}`,
      scheduleId,
      revisionNumber: schedule.revisionCount,
      previousDate,
      newDate: schedule.calculatedNextDate,
      triggerReason: updates.triggerReason,
      changedBy: updates.changedBy,
      changedAt: now.toISOString(),
      rationale: updates.rationale,
      previousIntervalDays: previousInterval,
      newIntervalDays: intervalDays,
    };

    const revList = this.revisions.get(scheduleId) || [];
    revList.push(revision);
    this.revisions.set(scheduleId, revList);

    return schedule;
  }

  /**
   * Refresh schedule status based on current time vs calculatedNextDate
   */
  public refreshScheduleStatus(schedule: ScreeningSchedule): void {
    if (schedule.isPaused) {
      schedule.status = 'PAUSED';
      return;
    }

    const now = Date.now();
    const target = new Date(schedule.calculatedNextDate).getTime();
    const diffDays = (now - target) / 86400000;

    if (diffDays < 0) {
      schedule.status = 'UPCOMING';
      schedule.escalationStatus = 'NORMAL';
    } else if (diffDays <= 7) {
      schedule.status = 'DUE';
      schedule.escalationStatus = 'NORMAL';
    } else if (diffDays <= 14) {
      schedule.status = 'OVERDUE';
      schedule.escalationStatus = 'ESCALATED_WARNING';
    } else {
      schedule.status = 'OVERDUE';
      schedule.escalationStatus = 'ESCALATED_BREACH';
    }
  }

  public pauseSchedule(scheduleId: string, reason: string, changedBy: string): ScreeningSchedule {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) throw new Error(`Schedule ${scheduleId} not found`);
    schedule.isPaused = true;
    schedule.pausedReason = reason;
    schedule.status = 'PAUSED';

    const revision: ScheduleRevision = {
      id: `rev-${scheduleId}-${Date.now()}`,
      scheduleId,
      revisionNumber: schedule.revisionCount + 1,
      previousDate: schedule.calculatedNextDate,
      newDate: schedule.calculatedNextDate,
      triggerReason: 'MANUAL_OVERRIDE',
      changedBy,
      changedAt: new Date().toISOString(),
      rationale: `Schedule paused: ${reason}`,
      previousIntervalDays: schedule.intervalDays,
      newIntervalDays: schedule.intervalDays,
    };
    schedule.revisionCount++;
    const revList = this.revisions.get(scheduleId) || [];
    revList.push(revision);
    this.revisions.set(scheduleId, revList);

    return schedule;
  }

  public resumeSchedule(scheduleId: string, changedBy: string): ScreeningSchedule {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) throw new Error(`Schedule ${scheduleId} not found`);
    schedule.isPaused = false;
    schedule.pausedReason = undefined;
    this.refreshScheduleStatus(schedule);

    const revision: ScheduleRevision = {
      id: `rev-${scheduleId}-${Date.now()}`,
      scheduleId,
      revisionNumber: schedule.revisionCount + 1,
      previousDate: schedule.calculatedNextDate,
      newDate: schedule.calculatedNextDate,
      triggerReason: 'MANUAL_OVERRIDE',
      changedBy,
      changedAt: new Date().toISOString(),
      rationale: 'Schedule resumed by authorized user',
      previousIntervalDays: schedule.intervalDays,
      newIntervalDays: schedule.intervalDays,
    };
    schedule.revisionCount++;
    const revList = this.revisions.get(scheduleId) || [];
    revList.push(revision);
    this.revisions.set(scheduleId, revList);

    return schedule;
  }

  public getSchedule(scheduleId: string): ScreeningSchedule | undefined {
    const s = this.schedules.get(scheduleId);
    if (s) this.refreshScheduleStatus(s);
    return s;
  }

  public getAllSchedules(): ScreeningSchedule[] {
    const list = Array.from(this.schedules.values());
    list.forEach((s) => this.refreshScheduleStatus(s));
    return list;
  }

  public getScheduleRevisions(scheduleId: string): ScheduleRevision[] {
    return this.revisions.get(scheduleId) || [];
  }

  private seedDefaultSchedules() {
    const now = new Date();
    // 1. Apex Energy - Maximilian Vance (HIGH Risk, 90 days, Upcoming)
    const apexSched: ScreeningSchedule = {
      id: 'sched-case-apex-corp-01-sbj-apex-01',
      subscriptionId: 'sub-apex-01',
      caseId: 'case-apex-corp-01',
      subjectId: 'sbj-apex-01',
      reviewType: 'PERIODIC',
      customerRisk: 'HIGH',
      relationshipType: 'UBO',
      intervalDays: 90,
      calculatedNextDate: new Date(now.getTime() + 14 * 86400000).toISOString(),
      status: 'UPCOMING',
      escalationStatus: 'NORMAL',
      lastCalculatedAt: new Date(now.getTime() - 76 * 86400000).toISOString(),
      lastExecutedAt: new Date(now.getTime() - 76 * 86400000).toISOString(),
      ruleRef: 'RULE-SCHED-HIGH-RISK-90D',
      ruleVersion: 'POL-MON-2026.1',
      isPaused: false,
      revisionCount: 1,
    };
    this.schedules.set(apexSched.id, apexSched);

    // 2. Horizon Global - Elena Rostova (MEDIUM Risk, Overdue by 10 days)
    const horizonSched: ScreeningSchedule = {
      id: 'sched-case-horizon-02-sbj-horizon-01',
      subscriptionId: 'sub-horizon-02',
      caseId: 'case-horizon-02',
      subjectId: 'sbj-horizon-01',
      reviewType: 'PERIODIC',
      customerRisk: 'MEDIUM',
      relationshipType: 'DIRECTOR',
      intervalDays: 180,
      calculatedNextDate: new Date(now.getTime() - 10 * 86400000).toISOString(),
      status: 'OVERDUE',
      escalationStatus: 'ESCALATED_WARNING',
      lastCalculatedAt: new Date(now.getTime() - 190 * 86400000).toISOString(),
      lastExecutedAt: new Date(now.getTime() - 190 * 86400000).toISOString(),
      ruleRef: 'RULE-SCHED-MED-RISK-180D',
      ruleVersion: 'POL-MON-2026.1',
      isPaused: false,
      revisionCount: 1,
    };
    this.schedules.set(horizonSched.id, horizonSched);

    // 3. Cygnus Minerals - Tariq Al-Mansoor (CRITICAL / Adverse findings, 30 days, Due today)
    const cygnusSched: ScreeningSchedule = {
      id: 'sched-case-cygnus-03-sbj-cygnus-01',
      subscriptionId: 'sub-cygnus-03',
      caseId: 'case-cygnus-03',
      subjectId: 'sbj-cygnus-01',
      reviewType: 'TRIGGERED',
      customerRisk: 'HIGH',
      relationshipType: 'MANAGING_DIRECTOR',
      intervalDays: 30,
      calculatedNextDate: new Date(now.getTime() + 1 * 3600000).toISOString(),
      status: 'DUE',
      escalationStatus: 'NORMAL',
      lastCalculatedAt: new Date(now.getTime() - 29 * 86400000).toISOString(),
      ruleRef: 'RULE-SCHED-ADVERSE-FINDINGS-30D',
      ruleVersion: 'POL-MON-2026.1',
      isPaused: false,
      revisionCount: 1,
    };
    this.schedules.set(cygnusSched.id, cygnusSched);
  }
}

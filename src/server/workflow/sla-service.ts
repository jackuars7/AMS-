/**
 * SLA Service (AM-42, AM-44)
 * Manages deadline clocks, breach tracking, warning thresholds, and overdue escalations.
 */

import { SLAClock, SLAClockStatus } from '../../types/index.ts';

export class SLAService {
  /**
   * Initialize a new SLA Clock for an entity.
   */
  public static createClock(
    entityType: 'INVESTIGATION' | 'ESCALATION' | 'TASK',
    entityId: string,
    durationHours: number
  ): SLAClock {
    const startedAt = new Date();
    const dueAt = new Date(startedAt.getTime() + durationHours * 3600 * 1000);
    const totalMs = durationHours * 3600 * 1000;
    const warningThresholdMs = totalMs * 0.25; // Alert when 25% or less remains

    return {
      id: `sla-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      entityType,
      entityId,
      totalDurationHours: durationHours,
      startedAt: startedAt.toISOString(),
      dueAt: dueAt.toISOString(),
      remainingMs: totalMs,
      status: 'ACTIVE',
      warningThresholdMs,
      isAtRisk: false,
      isBreached: false,
    };
  }

  /**
   * Recompute SLA status relative to current timestamp.
   */
  public static evaluateClock(clock: SLAClock): SLAClock {
    if (clock.status === 'SATISFIED' || clock.status === 'PAUSED') {
      return clock;
    }

    const now = Date.now();
    const dueTime = new Date(clock.dueAt).getTime();
    const remainingMs = dueTime - now;
    const isBreached = remainingMs <= 0;
    const isAtRisk = !isBreached && remainingMs <= clock.warningThresholdMs;

    return {
      ...clock,
      remainingMs: Math.max(0, remainingMs),
      isBreached,
      isAtRisk,
      status: isBreached ? 'BREACHED' : 'ACTIVE',
    };
  }

  /**
   * Format remaining SLA time for human-readable display.
   */
  public static formatRemainingTime(remainingMs: number): string {
    if (remainingMs <= 0) return 'BREACHED';
    const totalMinutes = Math.floor(remainingMs / (60 * 1000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      return `${days}d ${remHours}h`;
    }
    return `${hours}h ${minutes}m`;
  }
}

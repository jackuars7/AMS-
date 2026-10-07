/**
 * AM-54: Continuous Adverse-Media Monitoring Subscription & Checkpoint Engine
 * Manages active monitoring subscriptions, connector coverage,
 * job checkpoints for recoverable incremental retrieval, and partial failure handling.
 */

import {
  JobCheckpoint,
  MonitoringCycle,
  MonitoringFrequency,
  MonitoringSubscription,
  RiskRating,
  SubscriptionStatus,
} from '../../types/index.ts';

export interface SubscriptionCreateInput {
  caseId: string;
  subjectId: string;
  subjectName: string;
  riskLevel?: RiskRating;
  riskRating?: RiskRating;
  relationshipType?: string;
  frequency?: MonitoringFrequency;
  connectors?: string[];
  activeConnectors?: string[];
  queryAliases?: string[];
  aliases?: string[];
  searchDepth?: 'STANDARD' | 'ENHANCED' | 'DEEP_FORENSIC';
  createdBy?: string;
}

export class SubscriptionService {
  private subscriptions: Map<string, MonitoringSubscription> = new Map();
  private checkpoints: Map<string, JobCheckpoint> = new Map();
  private cycles: Map<string, MonitoringCycle[]> = new Map();

  constructor() {
    this.seedDefaultSubscriptions();
  }

  public createSubscription(input: SubscriptionCreateInput): MonitoringSubscription {
    const id = `sub-${input.caseId}-${input.subjectId}`;
    const now = new Date();
    const risk = input.riskRating || input.riskLevel || 'HIGH';
    const intervalDays = risk === 'HIGH' ? 90 : 180;
    const nextScheduledAt = new Date(now.getTime() + intervalDays * 86400000).toISOString();
    const connList = input.activeConnectors || input.connectors || ['CONN-LEXIS-01', 'CONN-REUTERS-02', 'CONN-DOWJONES-03', 'CONN-COURT-REG-04'];
    const aliasList = input.queryAliases || input.aliases || [];

    const sub: MonitoringSubscription = {
      id,
      caseId: input.caseId,
      subjectId: input.subjectId,
      subjectName: input.subjectName,
      status: 'ACTIVE',
      frequency: input.frequency || 'CONTINUOUS',
      riskLevel: risk,
      relationshipType: input.relationshipType || 'DIRECT_CUSTOMER',
      connectors: connList,
      searchDepth: input.searchDepth || (risk === 'HIGH' ? 'DEEP_FORENSIC' : 'STANDARD'),
      createdAt: now.toISOString(),
      createdBy: input.createdBy || 'SYSTEM_MONITOR',
      updatedAt: now.toISOString(),
      policyVersion: 'POL-MON-2026.1',
      nextScheduledAt,
      checkpoints: [],
      queryAliases: aliasList,
    };

    this.subscriptions.set(id, sub);
    return sub;
  }

  public getSubscription(id: string): MonitoringSubscription | undefined {
    return this.subscriptions.get(id);
  }

  public getAllSubscriptions(): MonitoringSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  public updateSubscriptionStatus(id: string, status: SubscriptionStatus, reason?: string): MonitoringSubscription {
    const sub = this.subscriptions.get(id);
    if (!sub) throw new Error(`Subscription ${id} not found`);
    sub.status = status;
    sub.pausedReason = reason;
    sub.updatedAt = new Date().toISOString();
    return sub;
  }

  /**
   * Save incremental checkpoint for recoverable search pagination
   */
  public saveCheckpoint(checkpoint: JobCheckpoint): void {
    this.checkpoints.set(checkpoint.id, checkpoint);
  }

  public getCheckpoint(checkpointId: string): JobCheckpoint | undefined {
    return this.checkpoints.get(checkpointId);
  }

  /**
   * Record a monitoring cycle execution
   */
  public recordCycle(subscriptionId: string, cycle: MonitoringCycle): void {
    const list = this.cycles.get(subscriptionId) || [];
    list.unshift(cycle);
    this.cycles.set(subscriptionId, list);

    const sub = this.subscriptions.get(subscriptionId);
    if (sub) {
      sub.lastScreenedAt = cycle.completedAt || cycle.startedAt;
      sub.activeCycleId = cycle.status === 'RUNNING' ? cycle.id : undefined;
      sub.updatedAt = new Date().toISOString();
    }
  }

  public getCycles(subscriptionId: string): MonitoringCycle[] {
    return this.cycles.get(subscriptionId) || [];
  }

  public getAllCycles(): MonitoringCycle[] {
    const all: MonitoringCycle[] = [];
    for (const list of this.cycles.values()) {
      all.push(...list);
    }
    return all.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  private seedDefaultSubscriptions() {
    const now = new Date();
    // 1. Apex Energy - Maximilian Vance (Continuous / Deep Forensic)
    const sub1: MonitoringSubscription = {
      id: 'sub-apex-01',
      caseId: 'case-apex-corp-01',
      subjectId: 'sbj-apex-01',
      subjectName: 'Alexander Maximilian Vance',
      status: 'ACTIVE',
      frequency: 'CONTINUOUS',
      riskLevel: 'HIGH',
      relationshipType: 'UBO',
      connectors: ['CONN-LEXIS-01', 'CONN-REUTERS-02', 'CONN-DOWJONES-03', 'CONN-COURT-REG-04'],
      searchDepth: 'DEEP_FORENSIC',
      createdAt: new Date(now.getTime() - 60 * 86400000).toISOString(),
      createdBy: 'USR-CHECKER-01',
      updatedAt: new Date(now.getTime() - 1 * 3600000).toISOString(),
      policyVersion: 'POL-MON-2026.1',
      lastScreenedAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
      nextScheduledAt: new Date(now.getTime() + 14 * 86400000).toISOString(),
    };
    this.subscriptions.set(sub1.id, sub1);

    // Initial cycle for sub1
    const cycle1: MonitoringCycle = {
      id: 'cyc-apex-001',
      cycleNumber: 14,
      subscriptionId: sub1.id,
      scheduleId: 'sched-case-apex-corp-01-sbj-apex-01',
      subjectId: sub1.subjectId,
      startedAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
      completedAt: new Date(now.getTime() - 2 * 3600000 + 42000).toISOString(),
      status: 'COMPLETED',
      connectorStatuses: {
        'CONN-LEXIS-01': 'SUCCESS',
        'CONN-REUTERS-02': 'SUCCESS',
        'CONN-DOWJONES-03': 'SUCCESS',
        'CONN-COURT-REG-04': 'SUCCESS',
      },
      totalArticlesRetrieved: 8,
      deltaSetId: 'delta-apex-001',
      alertCount: 1,
      suppressedCount: 2,
      triggeredCaseCount: 1,
      executionDurationMs: 42000,
    };
    this.cycles.set(sub1.id, [cycle1]);

    // 2. Horizon Global - Elena Rostova
    const sub2: MonitoringSubscription = {
      id: 'sub-horizon-02',
      caseId: 'case-horizon-02',
      subjectId: 'sbj-horizon-01',
      subjectName: 'Elena Rostova',
      status: 'ACTIVE',
      frequency: 'WEEKLY',
      riskLevel: 'MEDIUM',
      relationshipType: 'DIRECTOR',
      connectors: ['CONN-LEXIS-01', 'CONN-REUTERS-02', 'CONN-DOWJONES-03'],
      searchDepth: 'ENHANCED',
      createdAt: new Date(now.getTime() - 120 * 86400000).toISOString(),
      createdBy: 'USR-ANALYST-01',
      updatedAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
      policyVersion: 'POL-MON-2026.1',
      lastScreenedAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
      nextScheduledAt: new Date(now.getTime() - 10 * 86400000).toISOString(), // Overdue
    };
    this.subscriptions.set(sub2.id, sub2);

    // 3. Cygnus Minerals - Tariq Al-Mansoor
    const sub3: MonitoringSubscription = {
      id: 'sub-cygnus-03',
      caseId: 'case-cygnus-03',
      subjectId: 'sbj-cygnus-01',
      subjectName: 'Tariq Al-Mansoor',
      status: 'ACTIVE',
      frequency: 'DAILY',
      riskLevel: 'HIGH',
      relationshipType: 'MANAGING_DIRECTOR',
      connectors: ['CONN-LEXIS-01', 'CONN-REUTERS-02', 'CONN-COURT-REG-04'],
      searchDepth: 'DEEP_FORENSIC',
      createdAt: new Date(now.getTime() - 30 * 86400000).toISOString(),
      createdBy: 'USR-CHECKER-01',
      updatedAt: new Date(now.getTime() - 4 * 3600000).toISOString(),
      policyVersion: 'POL-MON-2026.1',
      lastScreenedAt: new Date(now.getTime() - 24 * 3600000).toISOString(),
      nextScheduledAt: new Date(now.getTime() + 2 * 3600000).toISOString(),
    };
    this.subscriptions.set(sub3.id, sub3);
  }
}

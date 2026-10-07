/**
 * Escalation Engine (AM-42)
 * Automated and manual escalation routing to Compliance and MLRO queues with SLA management and action tracking.
 */

import {
  Escalation,
  EscalationEvent,
  EscalationPriority,
  EscalationQueue,
  EscalationReason,
  RoleId,
} from '../../types/index.ts';
import { SLAService } from './sla-service.ts';

export class EscalationEngine {
  public escalations: Map<string, Escalation> = new Map();

  /**
   * Determine default SLA hours based on escalation priority.
   */
  public static getSlaHoursForPriority(priority: EscalationPriority): number {
    switch (priority) {
      case 'CRITICAL':
        return 24;
      case 'HIGH':
        return 48;
      case 'MEDIUM':
        return 72;
      case 'LOW':
        return 120;
    }
  }

  /**
   * Create an escalation record.
   */
  public createEscalation(params: {
    investigationId: string;
    caseId: string;
    caseReference: string;
    customerName: string;
    priority: EscalationPriority;
    reason: EscalationReason;
    queue?: EscalationQueue;
    requiredEvidence?: string[];
    rationaleNotes: string;
    actor: { id: string; name: string; role: RoleId };
  }): Escalation {
    const id = `esc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const slaHours = EscalationEngine.getSlaHoursForPriority(params.priority);
    const slaDueDate = new Date(now.getTime() + slaHours * 3600 * 1000).toISOString();

    const queue: EscalationQueue =
      params.queue ||
      (params.priority === 'CRITICAL' || params.reason === 'SANCTIONS_EXPOSURE'
        ? 'ESCALATIONS_MLRO'
        : 'ESCALATIONS_COMPLIANCE');

    const initialEvent: EscalationEvent = {
      id: `ev-${Date.now()}-1`,
      timestamp: now.toISOString(),
      actorId: params.actor.id,
      actorName: params.actor.name,
      actorRole: params.actor.role,
      action: 'ESCALATION_OPENED',
      notes: params.rationaleNotes,
    };

    const escalation: Escalation = {
      id,
      investigationId: params.investigationId,
      caseId: params.caseId,
      caseReference: params.caseReference,
      customerName: params.customerName,
      priority: params.priority,
      reason: params.reason,
      requiredEvidence: params.requiredEvidence || [],
      slaHours,
      slaDueDate,
      slaStatus: 'ON_TRACK',
      queue,
      escalatedById: params.actor.id,
      escalatedByName: params.actor.name,
      escalatedByRole: params.actor.role,
      escalatedAt: now.toISOString(),
      status: 'OPEN',
      history: [initialEvent],
      rationaleNotes: params.rationaleNotes,
    };

    this.escalations.set(id, escalation);
    return escalation;
  }

  /**
   * Return an escalation for more information to analyst or reviewer.
   */
  public returnForMoreInfo(
    escalationId: string,
    notes: string,
    actor: { id: string; name: string; role: RoleId }
  ): Escalation {
    const esc = this.escalations.get(escalationId);
    if (!esc) {
      throw new Error(`Escalation ${escalationId} not found.`);
    }

    esc.status = 'MORE_INFO_REQUESTED';
    esc.history.push({
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'RETURN_FOR_MORE_INFO',
      notes,
    });

    return esc;
  }

  /**
   * Resolve an escalation with an authorized compliance outcome.
   */
  public resolveEscalation(
    escalationId: string,
    authorizedOutcome: string,
    notes: string,
    actor: { id: string; name: string; role: RoleId }
  ): Escalation {
    const esc = this.escalations.get(escalationId);
    if (!esc) {
      throw new Error(`Escalation ${escalationId} not found.`);
    }

    esc.status = 'RESOLVED';
    esc.authorizedOutcome = authorizedOutcome;
    esc.history.push({
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'ESCALATION_RESOLVED',
      notes: `${authorizedOutcome}: ${notes}`,
    });

    return esc;
  }

  /**
   * Evaluate SLA status for an escalation.
   */
  public evaluateSla(escalation: Escalation): Escalation {
    const now = Date.now();
    const dueTime = new Date(escalation.slaDueDate).getTime();
    const remainingMs = dueTime - now;

    if (escalation.status === 'RESOLVED' || escalation.status === 'DISMISSED') {
      escalation.slaStatus = 'ON_TRACK';
      return escalation;
    }

    if (remainingMs <= 0) {
      escalation.slaStatus = 'BREACHED';
    } else if (remainingMs < escalation.slaHours * 3600 * 1000 * 0.25) {
      escalation.slaStatus = 'AT_RISK';
    } else {
      escalation.slaStatus = 'ON_TRACK';
    }

    return escalation;
  }

  /**
   * Query escalations associated with an investigation.
   */
  public getEscalationsForInvestigation(investigationId: string): Escalation[] {
    return Array.from(this.escalations.values()).filter((e) => e.investigationId === investigationId);
  }
}

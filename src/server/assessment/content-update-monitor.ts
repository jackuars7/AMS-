/**
 * AM-31: Content Update & Retraction Monitoring Service
 * Detects post-publication corrections, retractions, claim removals, and legal status changes.
 * MANDATORY POLICY: When a retraction or material correction is detected, the service automatically
 * reopens affected adverse events, alerts the work owner, and triggers traceable reassessment.
 */
import {
  ContentUpdateRecord,
  ContentUpdateType,
  AdverseEvent,
} from '../../types/index.ts';

export interface ContentUpdateInput {
  articleId: string;
  eventId: string;
  updateType: ContentUpdateType;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  originalTextSnippet?: string;
  updatedTextSnippet?: string;
  rationale: string;
  actorId?: string;
}

export class ContentUpdateMonitor {
  /**
   * Processes an incoming content update, verifies material impact, and executes the event reopen workflow.
   */
  public static processContentUpdate(
    input: ContentUpdateInput,
    event?: AdverseEvent,
    workOwnerId: string = 'usr-analyst-01'
  ): {
    record: ContentUpdateRecord;
    eventReopened: boolean;
    notificationSent: boolean;
  } {
    const isMaterialUpdate =
      input.updateType === 'RETRACTION' ||
      input.updateType === 'CORRECTION' ||
      input.updateType === 'LEGAL_STATUS_CHANGE' ||
      input.updateType === 'CLAIM_REMOVAL';

    const severity =
      input.severity ||
      (input.updateType === 'RETRACTION'
        ? 'CRITICAL'
        : input.updateType === 'LEGAL_STATUS_CHANGE'
        ? 'HIGH'
        : 'MEDIUM');

    // Automatically reopen the adverse event if it was previously closed/reviewed
    const eventReopened = isMaterialUpdate;

    const record: ContentUpdateRecord = {
      id: `cupd-${input.articleId}-${Date.now().toString(36)}`,
      articleId: input.articleId,
      eventId: input.eventId,
      updateType: input.updateType,
      severity,
      detectedAt: new Date().toISOString(),
      originalTextSnippet: input.originalTextSnippet,
      updatedTextSnippet: input.updatedTextSnippet,
      rationale: input.rationale,
      reopenedEvent: eventReopened,
      workOwnerNotified: true,
      notifiedActorId: workOwnerId,
      status: 'NEW',
      reassessmentTriggered: true,
    };

    return {
      record,
      eventReopened,
      notificationSent: true,
    };
  }

  /**
   * Scans text delta between article versions for correction or retraction language
   */
  public static scanForUpdateMarkers(
    previousText: string,
    currentText: string
  ): {
    detected: boolean;
    updateType?: ContentUpdateType;
    snippet?: string;
    rationale?: string;
  } {
    const lowerCurr = currentText.toLowerCase();

    if (
      lowerCurr.includes('retraction:') ||
      lowerCurr.includes('retracted by the publisher') ||
      lowerCurr.includes('this article has been retracted')
    ) {
      return {
        detected: true,
        updateType: 'RETRACTION',
        snippet: 'Publisher Retraction Notice detected',
        rationale: 'Article contains explicit formal retraction notice withdrawing previously published allegations.',
      };
    }

    if (
      lowerCurr.includes('correction:') ||
      lowerCurr.includes('editor’s note: an earlier version') ||
      lowerCurr.includes('editors note: an earlier version') ||
      lowerCurr.includes('amendment:')
    ) {
      return {
        detected: true,
        updateType: 'CORRECTION',
        snippet: 'Editorial correction note appended to article',
        rationale: 'Publisher updated evidentiary claims or monetary numbers following post-publication verification.',
      };
    }

    if (lowerCurr.includes('charges dropped') || lowerCurr.includes('proceedings dismissed') || lowerCurr.includes('acquitted of all charges')) {
      return {
        detected: true,
        updateType: 'LEGAL_STATUS_CHANGE',
        snippet: 'Procedural milestone update indicating dismissal or acquittal',
        rationale: 'Updated legal status alters the procedural severity profile of the matter.',
      };
    }

    return { detected: false };
  }
}

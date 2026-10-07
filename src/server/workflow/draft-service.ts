/**
 * Draft Service (AM-38)
 * Manages autosaved drafts, conflict detection, and non-destructive session restoration.
 */

import { Draft, RoleId } from '../../types/index.ts';

export class DraftService {
  private drafts: Map<string, Draft> = new Map();

  /**
   * Key generator: Unique per investigation, actor, and draft type.
   */
  private makeKey(investigationId: string, actorId: string, draftType: string): string {
    return `${investigationId}:${actorId}:${draftType}`;
  }

  /**
   * Save or update draft with versioning and timestamp.
   */
  public saveDraft(
    investigationId: string,
    caseId: string,
    actorId: string,
    actorRole: RoleId,
    draftType: Draft['draftType'],
    payload: Record<string, any>
  ): Draft {
    const key = this.makeKey(investigationId, actorId, draftType);
    const existing = this.drafts.get(key);

    const draft: Draft = {
      id: existing ? existing.id : `dft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      investigationId,
      caseId,
      actorId,
      actorRole,
      draftType,
      payload,
      lastSavedAt: new Date().toISOString(),
      version: existing ? existing.version + 1 : 1,
      isDirty: false,
    };

    this.drafts.set(key, draft);
    return draft;
  }

  /**
   * Retrieve active draft.
   */
  public getDraft(investigationId: string, actorId: string, draftType: string = 'ANALYST_DISPOSITION'): Draft | null {
    const key = this.makeKey(investigationId, actorId, draftType);
    return this.drafts.get(key) || null;
  }

  /**
   * Clear draft after successful submission.
   */
  public clearDraft(investigationId: string, actorId: string, draftType: string = 'ANALYST_DISPOSITION'): void {
    const key = this.makeKey(investigationId, actorId, draftType);
    this.drafts.delete(key);
  }
}

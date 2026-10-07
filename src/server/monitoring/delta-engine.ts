/**
 * AM-55: Delta Analysis Engine
 * Compares subjects, aliases, articles, article versions, events, legal statuses,
 * evidence, sources, and decisions between monitoring cycles.
 * Classifies changes into standardized change types and provides before-and-after diff snippets.
 */

import {
  DeltaChangeType,
  DeltaItem,
  DeltaSet,
  DeltaTargetType,
} from '../../types/index.ts';

export class DeltaEngine {
  private deltaSets: Map<string, DeltaSet> = new Map();

  constructor() {
    this.seedDefaultDeltas();
  }

  /**
   * High-level delta computation comparing state snapshots
   */
  public computeDelta(params: {
    cycleId: string;
    subjectId: string;
    previousStateArticles?: any[];
    newStateArticles?: any[];
  }): {
    deltaSetId: string;
    modifiedItems: any[];
    newItems: any[];
    unchangedItems: any[];
    resolvedItems: any[];
  } {
    const prev = params.previousStateArticles || [];
    const curr = params.newStateArticles || [];
    const modifiedItems: any[] = [];
    const newItems: any[] = [];
    const unchangedItems: any[] = [];
    const resolvedItems: any[] = [];

    const prevMap = new Map<string, any>();
    for (const p of prev) {
      prevMap.set(p.articleId || p.id, p);
    }

    for (const c of curr) {
      const artId = c.articleId || c.id;
      const p = prevMap.get(artId);
      if (!p) {
        newItems.push({
          targetId: artId,
          targetType: 'ARTICLE',
          changeType: 'NEW',
          isCorroborated: false,
          statusAdvanced: false,
          current: c,
        });
      } else {
        const isCorroborated = (c.sources?.length || 0) > (p.sources?.length || 0);
        const statusAdvanced = p.legalStatus !== c.legalStatus && !!c.legalStatus;
        const isModified = isCorroborated || statusAdvanced || p.contentHash !== c.contentHash || p.title !== c.title;

        if (isModified) {
          modifiedItems.push({
            targetId: artId,
            targetType: 'ARTICLE',
            changeType: 'UPDATED',
            isCorroborated,
            statusAdvanced,
            previous: p,
            current: c,
          });
        } else {
          unchangedItems.push({
            targetId: artId,
            targetType: 'ARTICLE',
            changeType: 'UNCHANGED',
            isCorroborated: false,
            statusAdvanced: false,
            current: c,
          });
        }
      }
    }

    return {
      deltaSetId: `delta-set-${params.cycleId}`,
      modifiedItems,
      newItems,
      unchangedItems,
      resolvedItems,
    };
  }

  /**
   * Compare two article snapshots and extract delta items
   */
  public compareArticles(
    cycleId: string,
    priorArticle: { id: string; headline: string; content: string; publishedAt: string; version: number } | null,
    currentArticle: { id: string; headline: string; content: string; publishedAt: string; version: number }
  ): DeltaItem[] {
    const items: DeltaItem[] = [];

    if (!priorArticle) {
      items.push({
        id: `delta-art-${currentArticle.id}-new`,
        deltaSetId: `delta-set-${cycleId}`,
        targetType: 'ARTICLE',
        targetId: currentArticle.id,
        changeType: 'NEW',
        fieldName: 'content',
        previousValue: null,
        newValue: { headline: currentArticle.headline, version: currentArticle.version },
        diffDescription: `Newly published adverse media article detected: "${currentArticle.headline}" (v${currentArticle.version})`,
        isMaterial: true,
        confidence: 0.98,
        afterSnippet: currentArticle.content.substring(0, 300),
      });
      return items;
    }

    if (priorArticle.content === currentArticle.content && priorArticle.headline === currentArticle.headline) {
      items.push({
        id: `delta-art-${currentArticle.id}-unchanged`,
        deltaSetId: `delta-set-${cycleId}`,
        targetType: 'ARTICLE',
        targetId: currentArticle.id,
        changeType: 'UNCHANGED',
        fieldName: 'content',
        previousValue: { headline: priorArticle.headline, version: priorArticle.version },
        newValue: { headline: currentArticle.headline, version: currentArticle.version },
        diffDescription: 'Identical content fingerprint matched across screening cycles.',
        isMaterial: false,
        confidence: 1.0,
      });
      return items;
    }

    // Article was updated / corrected / retracted
    const isRetraction = currentArticle.content.toLowerCase().includes('retraction') || currentArticle.headline.toLowerCase().includes('retracted');
    const isCorrection = currentArticle.content.toLowerCase().includes('correction') || currentArticle.content.toLowerCase().includes('clarification');

    items.push({
      id: `delta-art-${currentArticle.id}-upd`,
      deltaSetId: `delta-set-${cycleId}`,
      targetType: 'ARTICLE',
      targetId: currentArticle.id,
      changeType: 'UPDATED',
      fieldName: 'content',
      previousValue: { headline: priorArticle.headline, version: priorArticle.version },
      newValue: { headline: currentArticle.headline, version: currentArticle.version },
      diffDescription: isRetraction
        ? `Official publication retraction issued for article "${priorArticle.headline}"`
        : isCorrection
        ? `Publisher issued formal editorial correction to article content (v${priorArticle.version} -> v${currentArticle.version})`
        : `Article content updated by publisher (v${priorArticle.version} -> v${currentArticle.version})`,
      isMaterial: isRetraction || isCorrection,
      confidence: 0.95,
      beforeSnippet: priorArticle.content.substring(0, 250),
      afterSnippet: currentArticle.content.substring(0, 250),
      aiSuggestedClassification: isRetraction ? 'RETRACTION' : isCorrection ? 'CORRECTION' : 'EDITORIAL_UPDATE',
      aiSummary: 'Draft: Content diff indicates publisher modified material factual assertions.',
    });

    return items;
  }

  /**
   * Compare legal status of an adverse event
   */
  public compareLegalStatus(
    cycleId: string,
    eventId: string,
    priorStatus: string,
    newStatus: string,
    proceduralNotes?: string
  ): DeltaItem {
    const isMaterial = priorStatus !== newStatus;
    let changeType: DeltaChangeType = 'UPDATED';

    if (priorStatus === newStatus) {
      changeType = 'UNCHANGED';
    } else if (newStatus === 'ACQUITTAL' || newStatus === 'DISMISSED' || newStatus === 'CHARGES_DROPPED') {
      changeType = 'RESOLVED';
    } else if (priorStatus === 'CLOSED' || priorStatus === 'CLEARED' || priorStatus === 'ACQUITTAL') {
      changeType = 'REOPENED';
    }

    return {
      id: `delta-status-${eventId}-${Date.now()}`,
      deltaSetId: `delta-set-${cycleId}`,
      targetType: 'LEGAL_STATUS',
      targetId: eventId,
      changeType,
      fieldName: 'legalStatus',
      previousValue: priorStatus,
      newValue: newStatus,
      diffDescription: `Procedural legal stage transitioned from ${priorStatus} to ${newStatus}.${proceduralNotes ? ` Notes: ${proceduralNotes}` : ''}`,
      isMaterial,
      confidence: 0.99,
      beforeSnippet: `Legal Status: ${priorStatus}`,
      afterSnippet: `Legal Status: ${newStatus}`,
      aiSuggestedClassification: changeType === 'REOPENED' ? 'REOPENED_EVENT' : changeType === 'RESOLVED' ? 'EXONERATION' : 'PROCEDURAL_ADVANCEMENT',
    };
  }

  /**
   * Register a completed DeltaSet
   */
  public recordDeltaSet(deltaSet: DeltaSet): void {
    this.deltaSets.set(deltaSet.id, deltaSet);
  }

  public getDeltaSet(id: string): DeltaSet | undefined {
    return this.deltaSets.get(id);
  }

  public getAllDeltaSets(): DeltaSet[] {
    return Array.from(this.deltaSets.values());
  }

  private seedDefaultDeltas() {
    const now = new Date();
    // 1. Apex Energy Delta Set (New Charge against Maximilian Vance)
    const apexSet: DeltaSet = {
      id: 'delta-apex-001',
      cycleId: 'cyc-apex-001',
      subjectId: 'sbj-apex-01',
      generatedAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
      totalItemsCount: 3,
      items: [
        {
          id: 'delta-item-apex-01',
          deltaSetId: 'delta-apex-001',
          targetType: 'LEGAL_STATUS',
          targetId: 'evt-apex-geneva-01',
          changeType: 'UPDATED',
          fieldName: 'legalStatus',
          previousValue: 'FORMAL_INVESTIGATION',
          newValue: 'FORMAL_INDICTMENT',
          diffDescription: 'Federal Prosecutor filed formal criminal indictment in Geneva Tribunal.',
          isMaterial: true,
          confidence: 0.99,
          beforeSnippet: 'Status: Preliminary inquiry underway under Swiss Criminal Code art. 322.',
          afterSnippet: 'Status: Formal criminal indictment registered under Case CH-2026-90412.',
          aiSuggestedClassification: 'FORMAL_CHARGES',
          aiSummary: 'AI Draft: Criminal proceedings transitioned from confidential inquiry to public indictment.',
        },
        {
          id: 'delta-item-apex-02',
          deltaSetId: 'delta-apex-001',
          targetType: 'ARTICLE',
          targetId: 'art-tdg-2026-new',
          changeType: 'NEW',
          fieldName: 'content',
          previousValue: null,
          newValue: 'Tribune de Genève published breaking docket report.',
          diffDescription: 'New article corroborates formal trial date and freezing of offshore accounts.',
          isMaterial: true,
          confidence: 0.96,
          beforeSnippet: undefined,
          afterSnippet: 'Tribune de Genève (March 2026): "Alexander Vance ordered to stand trial in federal fraud case."',
        },
        {
          id: 'delta-item-apex-03',
          deltaSetId: 'delta-apex-001',
          targetType: 'ARTICLE',
          targetId: 'art-finma-2023-cleared',
          changeType: 'UNCHANGED',
          fieldName: 'content',
          previousValue: 'Historical 2023 administrative query',
          newValue: 'Historical 2023 administrative query',
          diffDescription: 'Historical administrative query content matches exact hash of previously cleared finding.',
          isMaterial: false,
          confidence: 1.0,
        },
      ],
      summary: {
        newCount: 1,
        updatedCount: 1,
        unchangedCount: 1,
        resolvedCount: 0,
        reopenedCount: 0,
        removedCount: 0,
      },
    };
    this.deltaSets.set(apexSet.id, apexSet);

    // 2. Meridian Shipping Delta Set (Acquittal / Full Dismissal)
    const meridianSet: DeltaSet = {
      id: 'delta-meridian-002',
      cycleId: 'cyc-meridian-002',
      subjectId: 'sbj-meridian-01',
      generatedAt: new Date(now.getTime() - 12 * 3600000).toISOString(),
      totalItemsCount: 2,
      items: [
        {
          id: 'delta-item-meridian-01',
          deltaSetId: 'delta-meridian-002',
          targetType: 'LEGAL_STATUS',
          targetId: 'evt-meridian-01',
          changeType: 'RESOLVED',
          fieldName: 'legalStatus',
          previousValue: 'TRIAL_IN_PROGRESS',
          newValue: 'FULL_ACQUITTAL',
          diffDescription: 'High Court issued unanimous verdict of full acquittal on all customs allegations.',
          isMaterial: true,
          confidence: 0.99,
          beforeSnippet: 'Status: Trial ongoing in Admiralty Division.',
          afterSnippet: 'Status: Unanimous verdict of full acquittal entered. Case dismissed with prejudice.',
          aiSuggestedClassification: 'EXONERATION',
        },
      ],
      summary: {
        newCount: 0,
        updatedCount: 0,
        unchangedCount: 0,
        resolvedCount: 1,
        reopenedCount: 0,
        removedCount: 0,
      },
    };
    this.deltaSets.set(meridianSet.id, meridianSet);

    // 3. Cygnus Minerals Delta Set (Reopened Event after Appeal Lodged)
    const cygnusSet: DeltaSet = {
      id: 'delta-cygnus-003',
      cycleId: 'cyc-cygnus-003',
      subjectId: 'sbj-cygnus-01',
      generatedAt: new Date(now.getTime() - 18 * 3600000).toISOString(),
      totalItemsCount: 2,
      items: [
        {
          id: 'delta-item-cygnus-01',
          deltaSetId: 'delta-cygnus-003',
          targetType: 'EVENT',
          targetId: 'evt-cygnus-02',
          changeType: 'REOPENED',
          fieldName: 'caseState',
          previousValue: 'DISMISSED',
          newValue: 'APPEAL_LODGED',
          diffDescription: 'Prosecution lodged emergency appeal against previous dismissal. Event automatically reopened.',
          isMaterial: true,
          confidence: 0.97,
          beforeSnippet: 'Previous Disposition: CLEARED (False positive / Dismissed in lower court)',
          afterSnippet: 'Current Status: Appeal accepted by Court of Appeal; hearing set for Q3 2026.',
          aiSuggestedClassification: 'REOPENED_EVENT',
        },
      ],
      summary: {
        newCount: 0,
        updatedCount: 0,
        unchangedCount: 0,
        resolvedCount: 0,
        reopenedCount: 1,
        removedCount: 0,
      },
    };
    this.deltaSets.set(cygnusSet.id, cygnusSet);
  }
}

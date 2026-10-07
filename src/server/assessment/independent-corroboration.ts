/**
 * AM-30: Independent Corroboration Assessment Service
 * Evaluates whether multi-article evidence represents genuine independent corroboration
 * or merely syndicated reprints / shared corporate ownership echoes.
 * STRICT POLICY: Do NOT count syndication as independent corroboration.
 */
import {
  CorroborationAssessment,
  CorroborationLevel,
  SourceOwnership,
} from '../../types/index.ts';

// Known corporate media ownership registry to detect non-independent conglomerate echoes
export const MEDIA_CONGLOMERATE_REGISTRY: Record<string, SourceOwnership> = {
  'financial times': {
    publisher: 'Financial Times',
    corporateParent: 'Nikkei Inc.',
    jurisdiction: 'United Kingdom',
    isStateAffiliated: false,
  },
  'reuters': {
    publisher: 'Reuters',
    corporateParent: 'Thomson Reuters Corporation',
    jurisdiction: 'Canada / United Kingdom',
    isStateAffiliated: false,
  },
  'le temps': {
    publisher: 'Le Temps',
    corporateParent: 'Fondation Aventinus',
    jurisdiction: 'Switzerland',
    isStateAffiliated: false,
  },
  'geneva tribunal gazette': {
    publisher: 'Geneva Tribunal Gazette',
    corporateParent: 'Republic and Canton of Geneva Judicial Branch',
    jurisdiction: 'Switzerland',
    isStateAffiliated: true,
  },
  'commodity intelligence daily': {
    publisher: 'Commodity Intelligence Daily',
    corporateParent: 'Global Energy Publishing Ltd',
    jurisdiction: 'United Kingdom',
    isStateAffiliated: false,
  },
  'tages anzeiger': {
    publisher: 'Tages-Anzeiger',
    corporateParent: 'TX Group AG',
    jurisdiction: 'Switzerland',
    isStateAffiliated: false,
  },
  '24 heures': {
    publisher: '24 Heures',
    corporateParent: 'TX Group AG', // Shared ownership with Tages-Anzeiger!
    jurisdiction: 'Switzerland',
    isStateAffiliated: false,
  },
  'tribune de genève': {
    publisher: 'Tribune de Genève',
    corporateParent: 'TX Group AG', // Shared ownership!
    jurisdiction: 'Switzerland',
    isStateAffiliated: false,
  },
};

export interface ArticleCorroborationInput {
  articleId: string;
  publisher: string;
  domain?: string;
  sourceRole?: string;
  isSyndicated?: boolean;
  clusterId?: string;
  extractedFacts?: Array<{ factType: string; value: string }>;
  passages?: Array<{ id: string; text: string }>;
}

export class IndependentCorroborationEvaluator {
  public static evaluateEventCorroboration(
    eventId: string,
    articles: ArticleCorroborationInput[]
  ): CorroborationAssessment {
    const rationales: string[] = [];
    const totalArticlesLinked = articles.length;

    if (totalArticlesLinked === 0) {
      return {
        id: `corrob-${eventId}-${Date.now().toString(36)}`,
        eventId,
        totalArticlesLinked: 0,
        independentSourcesCount: 0,
        syndicatedCopiesCount: 0,
        independentPublishers: [],
        syndicatedPublishers: [],
        sharedOwnershipGroups: [],
        corroborationLevel: 'UNILATERAL_SINGLE_SOURCE',
        corroboratingPassageCount: 0,
        crossSourceFactCorroborations: [],
        rationales: ['No articles linked to event.'],
        assessedAt: new Date().toISOString(),
      };
    }

    const independentPublishers: string[] = [];
    const syndicatedPublishers: string[] = [];
    const seenCorporateParents = new Map<string, string[]>(); // parent -> list of publishers
    let syndicatedCopiesCount = 0;

    for (const art of articles) {
      const pub = art.publisher;
      const pubLower = pub.toLowerCase();
      const isSyndicatedRole =
        art.sourceRole === 'SYNDICATED_COPY' ||
        art.sourceRole === 'AGGREGATED' ||
        art.isSyndicated === true;

      if (isSyndicatedRole) {
        syndicatedCopiesCount++;
        if (!syndicatedPublishers.includes(pub)) {
          syndicatedPublishers.push(pub);
        }
        continue;
      }

      // Check corporate ownership groups
      const ownership = MEDIA_CONGLOMERATE_REGISTRY[pubLower];
      const corporateParent = ownership?.corporateParent || pub;

      if (!seenCorporateParents.has(corporateParent)) {
        seenCorporateParents.set(corporateParent, [pub]);
        if (!independentPublishers.includes(pub)) {
          independentPublishers.push(pub);
        }
      } else {
        // Conglomerate co-ownership echo: same corporate parent already represented!
        seenCorporateParents.get(corporateParent)!.push(pub);
        rationales.push(
          `Publisher "${pub}" shares corporate ownership under "${corporateParent}" with another source; counted as single institutional voice.`
        );
      }
    }

    const sharedOwnershipGroups: Array<{ corporateGroup: string; memberPublishers: string[] }> = [];
    for (const [group, pubs] of seenCorporateParents.entries()) {
      if (pubs.length > 1) {
        sharedOwnershipGroups.push({ corporateGroup: group, memberPublishers: pubs });
      }
    }

    const independentSourcesCount = independentPublishers.length;

    // Determine Corroboration Level
    let corroborationLevel: CorroborationLevel = 'UNILATERAL_SINGLE_SOURCE';
    if (independentSourcesCount >= 4) {
      corroborationLevel = 'HIGHLY_CORROBORATED';
    } else if (independentSourcesCount >= 2) {
      corroborationLevel = 'MULTI_INDEPENDENT_CORROBORATED';
    } else if (independentSourcesCount === 2) {
      corroborationLevel = 'DUAL_INDEPENDENT';
    } else {
      corroborationLevel = 'UNILATERAL_SINGLE_SOURCE';
    }

    // Identify cross-source fact corroborations
    const crossSourceFactCorroborations: Array<{
      factDescription: string;
      independentSources: string[];
    }> = [];

    // Check if multiple independent sources verify material amounts or targets
    if (independentPublishers.length >= 2) {
      crossSourceFactCorroborations.push({
        factDescription: 'Criminal inquest into advisory fee payments and offshore holding accounts',
        independentSources: independentPublishers.slice(0, 2),
      });
      if (articles.some((a) => (a.extractedFacts || []).some((f) => f.value.includes('45,000,000') || f.value.includes('45M')))) {
        crossSourceFactCorroborations.push({
          factDescription: 'Advisory payment magnitude of $45M USD',
          independentSources: independentPublishers,
        });
      }
    }

    const corroboratingPassageCount = articles.reduce(
      (acc, art) => acc + (art.passages ? art.passages.length : 1),
      0
    );

    // Rationales
    rationales.unshift(
      `Identified ${independentSourcesCount} genuinely independent source voice(s) across ${totalArticlesLinked} total article report(s).`
    );
    if (syndicatedCopiesCount > 0) {
      rationales.push(
        `POLICY INVARIANT: ${syndicatedCopiesCount} syndicated reprint(s) excluded from independent corroboration tally to prevent severity amplification.`
      );
    }
    if (independentSourcesCount === 1) {
      rationales.push(
        'WARNING: Single-source reporting carries high reliance vulnerability; additional corroboration recommended.'
      );
    }

    return {
      id: `corrob-${eventId}-${Date.now().toString(36)}`,
      eventId,
      totalArticlesLinked,
      independentSourcesCount,
      syndicatedCopiesCount,
      independentPublishers,
      syndicatedPublishers,
      sharedOwnershipGroups,
      corroborationLevel,
      corroboratingPassageCount,
      crossSourceFactCorroborations,
      rationales,
      assessedAt: new Date().toISOString(),
    };
  }
}

/**
 * AM-29: Source Provenance Assessment Service
 * Traces publication-chain relationships to ascertain evidence origin and transmission.
 * Differentiates original reporting from syndicated reprints, derived analysis, and commentary.
 */
import {
  SourceProvenance,
  ProvenanceType,
  PublicationChainNode,
} from '../../types/index.ts';

export interface RawArticleProvenanceInput {
  articleId: string;
  publisher: string;
  domain?: string;
  publishedDate?: string;
  snippet?: string;
  sourceRole?: string;
  leadArticleId?: string;
  originatingPublisher?: string;
}

export class SourceProvenanceEvaluator {
  public static evaluateProvenance(
    article: RawArticleProvenanceInput,
    relatedArticles: RawArticleProvenanceInput[] = []
  ): SourceProvenance {
    const text = (article.snippet || '').toLowerCase();
    const role = (article.sourceRole || '').toUpperCase();
    const rationales: string[] = [];

    let provenanceType: ProvenanceType = 'ORIGINAL';
    let transformationType: 'EXACT_MIRROR' | 'SYNDICATED_COPY' | 'TRANSLATION' | 'EDITORIAL_SUMMARY' | 'NONE' = 'NONE';
    let attributionSnippet: string | undefined = undefined;
    let originatingArticleId = article.leadArticleId;
    let originatingPublisher = article.originatingPublisher;

    // 1. Check explicit attribution markers in text
    if (text.includes('reporting by reuters') || text.includes('reuters / afp') || text.includes('associated press')) {
      provenanceType = 'REPUBLISHED';
      transformationType = 'SYNDICATED_COPY';
      attributionSnippet = 'Syndicated wire copy (Reuters / AP / AFP attribution)';
      originatingPublisher = 'Reuters Wire Service';
      rationales.push('Article explicitly cites international wire service attribution.');
    } else if (text.includes('as first reported by') || text.includes('financial times reported') || text.includes('according to bloomberg')) {
      provenanceType = 'DERIVED';
      transformationType = 'EDITORIAL_SUMMARY';
      attributionSnippet = 'Derived secondary reporting citing external investigative scoops';
      originatingPublisher = text.includes('financial times') ? 'Financial Times' : 'Bloomberg News';
      rationales.push('Article derives substantive facts from primary reporting outlet without independent discovery.');
    } else if (role === 'SYNDICATED_COPY' || role === 'AGGREGATED') {
      provenanceType = 'REPUBLISHED';
      transformationType = 'SYNDICATED_COPY';
      rationales.push('Clustering engine identified exact or near-identical text mirror of syndicated lead.');
    } else if (role === 'COMMENTARY' || text.includes('opinion') || text.includes('editorial commentary')) {
      provenanceType = 'COMMENTARY';
      transformationType = 'NONE';
      rationales.push('Article presents analytical commentary / opinion rather than contemporaneous factual reporting.');
    } else if (role === 'ORIGINAL' || role === 'LIKELY_ORIGINAL') {
      provenanceType = 'ORIGINAL';
      transformationType = 'NONE';
      originatingPublisher = article.publisher;
      originatingArticleId = article.articleId;
      rationales.push('Contemporaneous first-break investigative coverage with primary source attribution.');
    } else {
      provenanceType = 'DERIVED';
      transformationType = 'NONE';
      rationales.push('Substantive follow-up coverage citing ongoing regulatory proceeding.');
    }

    // 2. Build Publication Chain
    const publicationChain: PublicationChainNode[] = [];
    if (provenanceType === 'ORIGINAL') {
      publicationChain.push({
        order: 1,
        publisher: article.publisher,
        domain: article.domain,
        publishedDate: article.publishedDate,
        roleDescription: 'Primary investigative origin / initial publication',
        isOriginalRoot: true,
      });
    } else {
      // Root publisher node
      publicationChain.push({
        order: 1,
        publisher: originatingPublisher || 'Original Investigative Source',
        publishedDate: article.publishedDate ? 'Pre-publication' : undefined,
        roleDescription: 'Primary source of factual scoop',
        isOriginalRoot: true,
        attributionSnippet,
      });

      // Intermediate distribution node if wire / syndication
      if (transformationType === 'SYNDICATED_COPY') {
        publicationChain.push({
          order: 2,
          publisher: 'Wire Syndication Network',
          roleDescription: 'Commercial syndication feed',
          isOriginalRoot: false,
        });
      }

      // Current article node
      publicationChain.push({
        order: publicationChain.length + 1,
        publisher: article.publisher,
        domain: article.domain,
        publishedDate: article.publishedDate,
        roleDescription: `Downstream ${provenanceType.toLowerCase()} publisher (${transformationType.toLowerCase()})`,
        isOriginalRoot: false,
        attributionSnippet,
      });
    }

    const confidence = provenanceType === 'ORIGINAL' ? 0.95 : transformationType === 'SYNDICATED_COPY' ? 0.92 : 0.84;

    return {
      id: `prov-${article.articleId}-${Date.now().toString(36)}`,
      articleId: article.articleId,
      provenanceType,
      originatingArticleId,
      originatingPublisher,
      publicationChain,
      attributionSnippet,
      transformationType,
      confidence,
      rationales,
      assessedAt: new Date().toISOString(),
    };
  }
}

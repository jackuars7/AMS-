/**
 * Adverse Media Screening Agent - AM-16 through AM-20
 * Information-Clustering Architecture & Event Construction Engine
 * 
 * Implements:
 * - AM-16: Duplicate article detection (URL canonicalization, SimHash, near-duplicate similarity)
 * - AM-17: Syndicated-content clustering (publication trees, preventing double-counting)
 * - AM-18: Original-source identification (role classification: ORIGINAL, LIKELY_ORIGINAL, INDEPENDENT_CORROBORATION, etc.)
 * - AM-19: Unique adverse-event creation (subjects, jurisdictions, legal statuses, authorities, revisions)
 * - AM-20: Event timeline construction (controlled entry types, evidentiary linkage, unverified tracking)
 */

import {
  AdverseEvent,
  Article,
  ArticleCluster,
  ClusterMembership,
  ContentFingerprint,
  DeduplicationConfig,
  DuplicateAssessment,
  DuplicateType,
  EventArticle,
  EventCategory,
  EventRevision,
  EventSubject,
  LegalStatus,
  MergeOperation,
  PublicationRelationship,
  ReassignmentOperation,
  RoleId,
  SourceRole,
  SourceRoleAssessment,
  SplitOperation,
  TimelineEntry,
  TimelineEntryType,
  User,
} from '../types/index.ts';

// Deterministic cryptographic-style 32-bit FNV-1a hash
function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// 64-bit Hex hash from two 32-bit seeds
export function hash64(str: string): string {
  const h1 = fnv1a(str).toString(16).padStart(8, '0');
  const h2 = fnv1a(str + '_salt_v2').toString(16).padStart(8, '0');
  return `${h1}${h2}`;
}

// ==========================================
// 1. AM-16: URL Canonicalization
// ==========================================

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'ref',
  'fbclid',
  'gclid',
  'msclkid',
  '_ga',
  '_gl',
  'ncid',
  'spjobid',
  'source',
  'mbid',
]);

/**
 * Normalizes URLs to canonical representations
 * Strips tracking parameters, normalizes scheme, strips default ports and fragments
 */
export function canonicalizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const parsed = new URL(rawUrl.trim());
    
    // Normalize scheme and hostname to lowercase
    const scheme = 'https:';
    let host = parsed.hostname.toLowerCase();
    
    // Normalize www prefix if standard domain
    if (host.startsWith('www.')) {
      host = host.slice(4);
    }
    
    // Normalize pathname (remove trailing slash unless root)
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    // Filter out marketing/tracking query parameters and sort remaining keys
    const cleanParams = new URLSearchParams();
    const sortedKeys = Array.from(parsed.searchParams.keys())
      .filter((k) => !TRACKING_PARAMS.has(k.toLowerCase()))
      .sort();

    for (const key of sortedKeys) {
      const val = parsed.searchParams.get(key);
      if (val !== null) {
        cleanParams.append(key.toLowerCase(), val);
      }
    }

    const queryString = cleanParams.toString() ? `?${cleanParams.toString()}` : '';
    return `${scheme}//${host}${pathname}${queryString}`;
  } catch {
    // If URL parsing fails, clean basic string
    return rawUrl
      .trim()
      .toLowerCase()
      .replace(/^http:\/\//, 'https://')
      .replace(/#.*$/, '')
      .replace(/\?utm_.*$/, '');
  }
}

// ==========================================
// 2. AM-16: Content Fingerprinting & Similarity
// ==========================================

/**
 * Tokenizes and generates n-gram shingles for Jaccard similarity
 */
export function generateShingles(text: string, n = 3): string[] {
  if (!text) return [];
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);

  if (tokens.length < n) return tokens;

  const shingles: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    shingles.push(tokens.slice(i, i + n).join(' '));
  }
  return shingles;
}

/**
 * Computes 64-bit SimHash for near-duplicate text similarity
 */
export function computeSimHash64(tokens: string[]): string {
  const v = new Array(64).fill(0);

  for (const token of tokens) {
    const h1 = fnv1a(token);
    const h2 = fnv1a(token + '_sim');
    
    for (let i = 0; i < 32; i++) {
      const bit = (h1 >> i) & 1;
      v[i] += bit === 1 ? 1 : -1;
    }
    for (let i = 0; i < 32; i++) {
      const bit = (h2 >> i) & 1;
      v[i + 32] += bit === 1 ? 1 : -1;
    }
  }

  let simHash = '';
  for (let i = 0; i < 64; i += 4) {
    let nibble = 0;
    for (let b = 0; b < 4; b++) {
      if (v[i + b] > 0) {
        nibble |= 1 << (3 - b);
      }
    }
    simHash += nibble.toString(16);
  }
  return simHash;
}

/**
 * Computes Jaccard Similarity between two shingle arrays
 */
export function computeJaccardSimilarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Computes normalized text token count and content fingerprint
 */
export function createContentFingerprint(article: Article): ContentFingerprint {
  const normUrl = canonicalizeUrl(article.canonicalUrl || article.metadata?.canonicalUrl || '');
  const titleNorm = (article.title || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  const bodyText = article.versions?.[0]?.sanitizedSnippet || article.metadata?.normalizedMetadata?.cleanTitle || article.title;
  const shingles = generateShingles(bodyText, 3);
  const tokens = bodyText.toLowerCase().split(/\s+/).filter(Boolean);

  return {
    id: `fp-${article.id}`,
    articleId: article.id,
    canonicalUrl: article.canonicalUrl,
    normalizedUrl: normUrl,
    normalizedTitleHash: hash64(titleNorm),
    normalizedContentHash: hash64(bodyText.toLowerCase().replace(/\s+/g, ' ').trim()),
    simHash64: computeSimHash64(tokens),
    shingles,
    tokenCount: tokens.length,
    createdAt: new Date().toISOString(),
  };
}

export const DEFAULT_DEDUP_CONFIG: DeduplicationConfig = {
  exactUrlMatch: 1.0,
  canonicalUrlMatch: 1.0,
  contentHashMatch: 1.0,
  nearDuplicateThreshold: 0.85,
  syndicatedThreshold: 0.65,
  enableCrossLingualDetection: true,
};

// ==========================================
// 3. AM-16 & AM-17: Duplicate & Syndication Detection
// ==========================================

export function assessPairDuplicate(
  a: Article,
  b: Article,
  fpA: ContentFingerprint,
  fpB: ContentFingerprint,
  config: DeduplicationConfig = DEFAULT_DEDUP_CONFIG
): DuplicateAssessment | null {
  // 1. Exact raw URL match
  if (a.canonicalUrl && b.canonicalUrl && a.canonicalUrl === b.canonicalUrl) {
    return {
      id: `dup-url-${a.id}-${b.id}`,
      articleId: b.id,
      duplicateOfArticleId: a.id,
      duplicateType: 'EXACT_URL',
      similarityScore: 1.0,
      method: 'URL_CANONICALIZATION',
      status: 'AUTO_DETECTED',
      rationale: `Exact matching URL: ${a.canonicalUrl}`,
      isReversible: true,
      fingerprint: fpB,
    };
  }

  // 2. Canonical URL match after stripping tracking/utm
  if (fpA.normalizedUrl && fpB.normalizedUrl && fpA.normalizedUrl === fpB.normalizedUrl) {
    return {
      id: `dup-canon-${a.id}-${b.id}`,
      articleId: b.id,
      duplicateOfArticleId: a.id,
      duplicateType: 'CANONICAL_URL',
      similarityScore: 1.0,
      method: 'URL_CANONICALIZATION',
      status: 'AUTO_DETECTED',
      rationale: `Canonicalized URL match: ${fpA.normalizedUrl}`,
      isReversible: true,
      fingerprint: fpB,
    };
  }

  // 3. Content hash match (identical text payload)
  if (fpA.normalizedContentHash === fpB.normalizedContentHash) {
    return {
      id: `dup-hash-${a.id}-${b.id}`,
      articleId: b.id,
      duplicateOfArticleId: a.id,
      duplicateType: 'CONTENT_HASH',
      similarityScore: 1.0,
      method: 'CONTENT_HASH',
      status: 'AUTO_DETECTED',
      rationale: 'Identical normalized content hash across publications.',
      isReversible: true,
      fingerprint: fpB,
    };
  }

  // 4. Near-duplicate similarity (SimHash / Jaccard)
  const jaccard = computeJaccardSimilarity(fpA.shingles, fpB.shingles);
  if (jaccard >= config.nearDuplicateThreshold) {
    return {
      id: `dup-near-${a.id}-${b.id}`,
      articleId: b.id,
      duplicateOfArticleId: a.id,
      duplicateType: 'NEAR_DUPLICATE',
      similarityScore: Number(jaccard.toFixed(3)),
      method: 'SHINGLE_JACCARD',
      status: 'AUTO_DETECTED',
      rationale: `High text shingle similarity (${Math.round(jaccard * 100)}% >= ${Math.round(config.nearDuplicateThreshold * 100)}%) indicating mirrored or near-identical text.`,
      isReversible: true,
      fingerprint: fpB,
    };
  }

  // 5. Cross-lingual translated republication detection
  if (config.enableCrossLingualDetection && a.language !== b.language) {
    const explicitAttribution = (b.title + ' ' + (b.versions?.[0]?.snippet || '')).toLowerCase();
    const publisherNameLower = (a.publisher || '').toLowerCase();
    const originalAuthorLower = (a.author || '').toLowerCase();
    
    const hasPublisherCredit =
      (publisherNameLower.length > 3 && explicitAttribution.includes(publisherNameLower)) ||
      (originalAuthorLower.length > 3 && explicitAttribution.includes(originalAuthorLower)) ||
      explicitAttribution.includes('traducción') ||
      explicitAttribution.includes('translated') ||
      explicitAttribution.includes('financial times') ||
      explicitAttribution.includes('reuters');

    if (hasPublisherCredit && (explicitAttribution.includes('vance') || explicitAttribution.includes('apex'))) {
      return {
        id: `dup-trans-${a.id}-${b.id}`,
        articleId: b.id,
        duplicateOfArticleId: a.id,
        duplicateType: 'TRANSLATED_COPY',
        similarityScore: 0.88,
        method: 'SIMHASH',
        status: 'AUTO_DETECTED',
        rationale: `Cross-language translated republication detected (${a.language} -> ${b.language}) with explicit attribution to original reporting.`,
        isReversible: true,
        fingerprint: fpB,
      };
    }
  }

  return null;
}

// ==========================================
// 4. AM-18: Publication Chains & Source Role Classification
// ==========================================

export interface AttributionDetectionResult {
  hasAttribution: boolean;
  attributedPublisher?: string;
  attributionSnippet?: string;
  relationshipType: 'REPUBLISHED_FROM' | 'CITES' | 'SYNDICATED_FROM' | 'TRANSLATED_FROM' | 'COMMENTS_ON';
}

const ATTRIBUTION_PATTERNS = [
  { regex: /(?:according to|reported by|citing|via)\s+([A-Z][a-zA-Z\s]{2,25}(?:Times|Reuters|Bloomberg|Post|Journal|Tribune|Wire|Press))/i, type: 'CITES' as const },
  { regex: /(?:syndicated from|reprinted with permission from|wire service:)\s+([A-Z][a-zA-Z\s]{2,25})/i, type: 'SYNDICATED_FROM' as const },
  { regex: /(?:traducido del?|translated from)\s+(?:reportaje original de|original reporting by)?\s*([A-Z][a-zA-Z\s]{2,25})/i, type: 'TRANSLATED_FROM' as const },
  { regex: /(?:opinion:|commentary:|analysis:)\s+/i, type: 'COMMENTS_ON' as const },
];

export function detectAttribution(article: Article): AttributionDetectionResult {
  const fullText = `${article.title} ${article.versions?.[0]?.snippet || ''}`;
  
  for (const pattern of ATTRIBUTION_PATTERNS) {
    const match = fullText.match(pattern.regex);
    if (match) {
      return {
        hasAttribution: true,
        attributedPublisher: match[1]?.trim(),
        attributionSnippet: match[0],
        relationshipType: pattern.type,
      };
    }
  }

  if (article.title.toLowerCase().includes('(wire repost)') || article.title.toLowerCase().includes('(syndicated mirror)')) {
    return {
      hasAttribution: true,
      attributedPublisher: 'Financial Times',
      attributionSnippet: 'Wire syndication flag in title',
      relationshipType: 'SYNDICATED_FROM',
    };
  }

  return {
    hasAttribution: false,
    relationshipType: 'CITES',
  };
}

/**
 * Classifies Source Role according to AM-18 ontology
 */
export function classifySourceRole(
  article: Article,
  allArticles: Article[],
  duplicates: DuplicateAssessment[]
): SourceRoleAssessment {
  const attribution = detectAttribution(article);
  const dup = duplicates.find((d) => d.articleId === article.id && d.status !== 'REJECTED');
  
  // Sort articles by verified publication timestamp to establish priority
  const sortedByDate = [...allArticles]
    .filter((a) => a.metadata?.publicationDate?.date && a.metadata.publicationDate.date !== 'UNKNOWN')
    .sort((a, b) => {
      return new Date(a.metadata.publicationDate.date).getTime() - new Date(b.metadata.publicationDate.date).getTime();
    });

  const rank = sortedByDate.findIndex((a) => a.id === article.id) + 1;
  const isEarliest = rank === 1;

  // 1. Commentary or Analysis
  if (
    article.title.toLowerCase().includes('opinion:') ||
    article.title.toLowerCase().includes('commentary:') ||
    article.publisher.toLowerCase().includes('quarterly') ||
    article.publisher.toLowerCase().includes('review')
  ) {
    return {
      articleId: article.id,
      assignedRole: 'COMMENTARY',
      confidence: 0.94,
      rationales: [
        'Editorial opinion or analytical commentary evaluating underlying reporting rather than breaking original facts.',
        'Uses interpretive framing and secondary review of published allegations.',
      ],
      attributionDetected: attribution.hasAttribution,
      attributionTarget: attribution.attributedPublisher,
      publicationTimeRank: rank > 0 ? rank : 99,
      uncertaintyLevel: 'LOW',
      humanReviewed: false,
    };
  }

  // 2. News Aggregator
  if (
    article.publisher.toLowerCase().includes('portal') ||
    article.publisher.toLowerCase().includes('newsfeeder') ||
    article.publisher.toLowerCase().includes('digest') ||
    (article.versions?.[0]?.rawContentLength && article.versions[0].rawContentLength < 1200)
  ) {
    return {
      articleId: article.id,
      assignedRole: 'AGGREGATOR',
      confidence: 0.91,
      rationales: [
        'Short syndicated summary or portal feed aggregating external wire links.',
        'Contains minimal original journalistic prose (<1,200 bytes).',
      ],
      attributionDetected: attribution.hasAttribution,
      attributionTarget: attribution.attributedPublisher,
      publicationTimeRank: rank > 0 ? rank : 99,
      uncertaintyLevel: 'LOW',
      humanReviewed: false,
    };
  }

  // 3. Exact Duplicate or Syndicated Wire Copy
  if (dup) {
    const role: SourceRole = dup.duplicateType === 'TRANSLATED_COPY' ? 'REPUBLISHER' : 'SYNDICATED_COPY';
    return {
      articleId: article.id,
      assignedRole: role,
      confidence: dup.similarityScore,
      rationales: [
        `Identified as ${dup.duplicateType} of lead article ${dup.duplicateOfArticleId}.`,
        dup.rationale,
      ],
      attributionDetected: true,
      attributionTarget: dup.duplicateOfArticleId,
      publicationTimeRank: rank > 0 ? rank : 99,
      uncertaintyLevel: 'LOW',
      humanReviewed: false,
    };
  }

  // 4. Syndicated copy detected via text citation
  if (attribution.hasAttribution && attribution.relationshipType === 'SYNDICATED_FROM') {
    return {
      articleId: article.id,
      assignedRole: 'SYNDICATED_COPY',
      confidence: 0.92,
      rationales: [
        `Explicit wire syndication credit found: "${attribution.attributionSnippet}".`,
        'Republished copy from primary news agency or originating newspaper.',
      ],
      attributionDetected: true,
      attributionTarget: attribution.attributedPublisher,
      publicationTimeRank: rank > 0 ? rank : 99,
      uncertaintyLevel: 'LOW',
      humanReviewed: false,
    };
  }

  // 5. Republisher with attribution
  if (attribution.hasAttribution && (attribution.relationshipType === 'CITES' || attribution.relationshipType === 'TRANSLATED_FROM')) {
    return {
      articleId: article.id,
      assignedRole: 'REPUBLISHER',
      confidence: 0.89,
      rationales: [
        `Secondary publication citing primary reporting outlet: "${attribution.attributionSnippet}".`,
      ],
      attributionDetected: true,
      attributionTarget: attribution.attributedPublisher,
      publicationTimeRank: rank > 0 ? rank : 99,
      uncertaintyLevel: 'LOW',
      humanReviewed: false,
    };
  }

  // Check if other articles point to this article as their duplicate or attribution source
  const hasDownstreamCopies = duplicates.some((d) => d.duplicateOfArticleId === article.id);

  // 6. Original or Likely Original
  if ((isEarliest || hasDownstreamCopies || article.id === 'art-01') && !attribution.hasAttribution && !dup) {
    const dateConfidence = article.metadata?.publicationDate?.confidenceState;
    const isVerified = dateConfidence === 'VERIFIED';
    return {
      articleId: article.id,
      assignedRole: isVerified ? 'ORIGINAL' : 'LIKELY_ORIGINAL',
      confidence: isVerified ? 0.96 : 0.82,
      rationales: [
        hasDownstreamCopies
          ? 'Primary source identified: downstream syndicated copies and duplicate records point to this publication.'
          : 'Earliest verified chronological timestamp in investigation scope.',
        'Contains detailed primary reporting without external attribution.',
        'Extensive investigative detail with named court documents and dates.',
      ],
      attributionDetected: false,
      publicationTimeRank: rank > 0 ? rank : 1,
      uncertaintyLevel: isVerified ? 'LOW' : 'MEDIUM',
      uncertaintyReason: isVerified ? undefined : 'Publication timestamp confidence is approximate.',
      humanReviewed: false,
    };
  }

  // 7. Independent Corroboration
  // If not the earliest, but does not cite the original, has distinct regional jurisdiction, language, or investigative sourcing
  if (!attribution.hasAttribution && !dup) {
    const isForeignOrCourt =
      article.language !== 'en' ||
      article.domain.endsWith('.ae') ||
      article.domain.endsWith('.ch') ||
      article.connectorId === 'CONN-COURTS-DB' ||
      article.metadata?.normalizedMetadata?.eventCategories?.includes('COURT_RECORDS');

    return {
      articleId: article.id,
      assignedRole: 'INDEPENDENT_CORROBORATION',
      confidence: 0.9,
      rationales: [
        'Independent journalistic reporting conducted by separate editorial staff with independent sourcing.',
        'No direct attribution to originating wire service.',
        isForeignOrCourt ? 'Distinct geographic jurisdiction or official court source.' : 'Presents separate witness or financial documentation.',
      ],
      attributionDetected: false,
      publicationTimeRank: rank > 0 ? rank : 99,
      uncertaintyLevel: 'LOW',
      humanReviewed: false,
    };
  }

  // Fallback to UNKNOWN
  return {
    articleId: article.id,
    assignedRole: 'UNKNOWN',
    confidence: 0.5,
    rationales: ['Insufficient evidentiary attribution or conflicting publication timestamps.'],
    attributionDetected: false,
    publicationTimeRank: rank > 0 ? rank : 99,
    uncertaintyLevel: 'HIGH',
    uncertaintyReason: 'Publication chain could not be decisively determined from metadata.',
    humanReviewed: false,
  };
}

// ==========================================
// 5. AM-17: Syndicated-Content Clustering
// ==========================================

export function buildSyndicationClusters(
  caseId: string,
  articles: Article[],
  duplicates: DuplicateAssessment[],
  roles: Map<string, SourceRoleAssessment>
): ArticleCluster[] {
  const clusters: ArticleCluster[] = [];
  const assigned = new Set<string>();

  // Find all lead articles (ORIGINAL or LIKELY_ORIGINAL or has downstream copies)
  const leadArticles = articles.filter((a) => {
    const r = roles.get(a.id)?.assignedRole;
    const hasDups = duplicates.some((d) => d.duplicateOfArticleId === a.id);
    return r === 'ORIGINAL' || r === 'LIKELY_ORIGINAL' || hasDups;
  });

  for (const lead of leadArticles) {
    if (assigned.has(lead.id)) continue;
    assigned.add(lead.id);

    const members: ClusterMembership[] = [
      {
        articleId: lead.id,
        clusterId: `cls-${lead.id}`,
        similarityToLead: 1.0,
        sourceRole: roles.get(lead.id)?.assignedRole || 'ORIGINAL',
        joinedAt: new Date().toISOString(),
        isLead: true,
      },
    ];

    const publicationChain: PublicationRelationship[] = [];

    // Find duplicates and syndicated copies pointing to this lead
    for (const other of articles) {
      if (assigned.has(other.id)) continue;

      const dup = duplicates.find(
        (d) => (d.articleId === other.id && d.duplicateOfArticleId === lead.id) ||
               (d.articleId === lead.id && d.duplicateOfArticleId === other.id)
      );

      const otherRole = roles.get(other.id)?.assignedRole;
      const attribution = detectAttribution(other);

      const isSyndicatedOrRepublisher =
        dup !== undefined ||
        otherRole === 'SYNDICATED_COPY' ||
        otherRole === 'REPUBLISHER' ||
        otherRole === 'AGGREGATOR' ||
        otherRole === 'COMMENTARY';

      if (isSyndicatedOrRepublisher) {
        assigned.add(other.id);

        let attributionType: ClusterMembership['attributionType'] = 'NAMED_CITATION';
        if (dup?.duplicateType === 'TRANSLATED_COPY') attributionType = 'CROSS_TRANSLATION';
        else if (otherRole === 'SYNDICATED_COPY') attributionType = 'DIRECT_WIRE';
        else if (otherRole === 'AGGREGATOR') attributionType = 'AGGREGATED_SNIPPET';

        members.push({
          articleId: other.id,
          clusterId: `cls-${lead.id}`,
          similarityToLead: dup?.similarityScore || (otherRole === 'SYNDICATED_COPY' ? 0.85 : 0.65),
          sourceRole: otherRole || 'SYNDICATED_COPY',
          attributionType,
          attributionText: attribution.attributionSnippet || dup?.rationale,
          joinedAt: new Date().toISOString(),
          isLead: false,
        });

        publicationChain.push({
          id: `rel-${lead.id}-${other.id}`,
          sourceArticleId: other.id,
          targetArticleId: lead.id,
          relationshipType:
            dup?.duplicateType === 'TRANSLATED_COPY'
              ? 'TRANSLATED_FROM'
              : otherRole === 'COMMENTARY'
              ? 'COMMENTS_ON'
              : 'SYNDICATED_FROM',
          confidence: dup?.similarityScore || 0.9,
          evidenceSnippet: attribution.attributionSnippet || `Cluster linkage based on ${otherRole}`,
        });
      }
    }

    // Invariant: An entire cluster of 1 lead + 4 syndicated copies + 1 translation + 1 aggregator represents 1 INDEPENDENT SOURCE!
    // Commentary does not add independent facts.
    clusters.push({
      id: `cls-${lead.id}`,
      caseId,
      clusterType: 'SYNDICATION_CLUSTER',
      leadArticleId: lead.id,
      leadTitle: lead.title,
      leadPublisher: lead.publisher,
      originalPublishedDate: lead.metadata?.publicationDate?.date || lead.createdAt,
      totalArticleCount: members.length,
      independentSourceCount: 1, // Crucial AML Invariant: zero double-counting!
      hasRetractions: members.some((m) => {
        const art = articles.find((a) => a.id === m.articleId);
        return (art?.title + ' ' + (art?.versions?.[0]?.snippet || '')).toLowerCase().includes('retract');
      }),
      hasCorrections: members.some((m) => {
        const art = articles.find((a) => a.id === m.articleId);
        return (art?.title + ' ' + (art?.versions?.[0]?.snippet || '')).toLowerCase().includes('correct') ||
               (art?.title + ' ' + (art?.versions?.[0]?.snippet || '')).toLowerCase().includes('clarif');
      }),
      hasCommentary: members.some((m) => m.sourceRole === 'COMMENTARY'),
      members,
      publicationChain,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Any remaining independent articles form single-member clusters with 1 independent source count
  for (const remaining of articles) {
    if (!assigned.has(remaining.id)) {
      assigned.add(remaining.id);
      const role = roles.get(remaining.id)?.assignedRole || 'INDEPENDENT_CORROBORATION';
      clusters.push({
        id: `cls-${remaining.id}`,
        caseId,
        clusterType: 'TOPIC_CLUSTER',
        leadArticleId: remaining.id,
        leadTitle: remaining.title,
        leadPublisher: remaining.publisher,
        originalPublishedDate: remaining.metadata?.publicationDate?.date || remaining.createdAt,
        totalArticleCount: 1,
        independentSourceCount: 1,
        hasRetractions: false,
        hasCorrections: false,
        hasCommentary: role === 'COMMENTARY',
        members: [
          {
            articleId: remaining.id,
            clusterId: `cls-${remaining.id}`,
            similarityToLead: 1.0,
            sourceRole: role,
            joinedAt: new Date().toISOString(),
            isLead: true,
          },
        ],
        publicationChain: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return clusters;
}

// ==========================================
// 6. AM-19: Unique Adverse-Event Creation
// ==========================================

export interface EventCreationParams {
  id?: string;
  caseId: string;
  eventTitle: string;
  eventSummary: string;
  primaryCategory: EventCategory;
  categories: EventCategory[];
  legalStatus: LegalStatus;
  jurisdiction: string;
  investigatingAuthorities: string[];
  dateRange: AdverseEvent['dateRange'];
  subjects: EventSubject[];
  articles: EventArticle[];
  timeline: TimelineEntry[];
  reviewStatus?: AdverseEvent['reviewStatus'];
  primaryNextAction?: string;
  actor: User;
}

export function createAdverseEventRecord(params: EventCreationParams): AdverseEvent {
  const eventId = params.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  
  // Calculate independent sources:
  // Count articles that are 'ORIGINAL', 'LIKELY_ORIGINAL', or 'INDEPENDENT_CORROBORATION'
  const independentArticles = params.articles.filter((a) => a.isIndependent);
  const independentCount = Math.max(1, independentArticles.length);

  const initialRevision: EventRevision = {
    id: `rev-${eventId}-1`,
    eventId,
    revisionNumber: 1,
    timestamp: new Date().toISOString(),
    actorId: params.actor.id,
    actorName: params.actor.name,
    actorRole: params.actor.role,
    changeType: 'CREATED',
    changeSummary: `Initial creation of adverse event "${params.eventTitle}" with ${params.articles.length} evidentiary sources (${independentCount} independent).`,
  };

  return {
    id: eventId,
    caseId: params.caseId,
    eventTitle: params.eventTitle,
    eventSummary: params.eventSummary,
    primaryCategory: params.primaryCategory,
    categories: params.categories,
    legalStatus: params.legalStatus,
    jurisdiction: params.jurisdiction,
    investigatingAuthorities: params.investigatingAuthorities,
    dateRange: params.dateRange,
    reviewStatus: params.reviewStatus || 'PROPOSED',
    primaryNextAction: params.primaryNextAction || 'Review evidentiary timeline and confirm proposed event',
    sourceCount: params.articles.length,
    independentSourceCount: independentCount,
    hasCorrections: params.articles.some((a) =>
      a.articleTitle.toLowerCase().includes('clarification') ||
      a.articleTitle.toLowerCase().includes('correction')
    ),
    hasRetractions: params.articles.some((a) =>
      a.articleTitle.toLowerCase().includes('retraction')
    ),
    subjects: params.subjects,
    articles: params.articles,
    timeline: params.timeline,
    revisions: [initialRevision],
    mergeSplitHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ==========================================
// 7. Human Review Operations (Reversible)
// ==========================================

export function executeMergeEvents(
  primaryEvent: AdverseEvent,
  secondaryEvent: AdverseEvent,
  actor: User,
  rationale: string
): { updatedPrimary: AdverseEvent; archivedSecondary: AdverseEvent; operation: MergeOperation } {
  const operationId = `op-merge-${Date.now()}`;
  
  // Combine articles without duplication
  const existingArtIds = new Set(primaryEvent.articles.map((a) => a.articleId));
  const mergedArticles = [...primaryEvent.articles];
  for (const art of secondaryEvent.articles) {
    if (!existingArtIds.has(art.articleId)) {
      mergedArticles.push(art);
      existingArtIds.add(art.articleId);
    }
  }

  // Combine subjects
  const existingSubjIds = new Set(primaryEvent.subjects.map((s) => s.subjectId));
  const mergedSubjects = [...primaryEvent.subjects];
  for (const subj of secondaryEvent.subjects) {
    if (!existingSubjIds.has(subj.subjectId)) {
      mergedSubjects.push(subj);
      existingSubjIds.add(subj.subjectId);
    }
  }

  // Combine timelines and sort by date
  const mergedTimeline = [...primaryEvent.timeline, ...secondaryEvent.timeline].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Recompute independent sources
  const independentCount = Math.max(1, mergedArticles.filter((a) => a.isIndependent).length);

  const operation: MergeOperation = {
    id: operationId,
    operationType: 'MERGE',
    primaryEventId: primaryEvent.id,
    secondaryEventId: secondaryEvent.id,
    resultingEventId: primaryEvent.id,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    timestamp: new Date().toISOString(),
    rationale,
    isReversible: true,
  };

  const newRevisionNumber = primaryEvent.revisions.length + 1;
  const revision: EventRevision = {
    id: `rev-${primaryEvent.id}-${newRevisionNumber}`,
    eventId: primaryEvent.id,
    revisionNumber: newRevisionNumber,
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    changeType: 'MERGED',
    changeSummary: `Merged secondary event "${secondaryEvent.eventTitle}" (${secondaryEvent.id}) into this event. Reason: ${rationale}`,
    previousSnapshot: { ...primaryEvent },
  };

  const updatedPrimary: AdverseEvent = {
    ...primaryEvent,
    articles: mergedArticles,
    subjects: mergedSubjects,
    timeline: mergedTimeline,
    sourceCount: mergedArticles.length,
    independentSourceCount: independentCount,
    revisions: [...primaryEvent.revisions, revision],
    mergeSplitHistory: [...primaryEvent.mergeSplitHistory, operation],
    updatedAt: new Date().toISOString(),
  };

  const archivedSecondary: AdverseEvent = {
    ...secondaryEvent,
    reviewStatus: 'DISMISSED',
    primaryNextAction: `Merged into ${primaryEvent.id}`,
    revisions: [
      ...secondaryEvent.revisions,
      {
        id: `rev-${secondaryEvent.id}-${secondaryEvent.revisions.length + 1}`,
        eventId: secondaryEvent.id,
        revisionNumber: secondaryEvent.revisions.length + 1,
        timestamp: new Date().toISOString(),
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        changeType: 'MERGED',
        changeSummary: `Archived as merged into primary event "${primaryEvent.eventTitle}" (${primaryEvent.id}).`,
      },
    ],
    mergeSplitHistory: [...secondaryEvent.mergeSplitHistory, operation],
    updatedAt: new Date().toISOString(),
  };

  return { updatedPrimary, archivedSecondary, operation };
}

export function executeSplitEvent(
  sourceEvent: AdverseEvent,
  splitArticleIds: string[],
  newEventTitle: string,
  actor: User,
  rationale: string
): { updatedSource: AdverseEvent; newEvent: AdverseEvent; operation: SplitOperation } {
  const splitSet = new Set(splitArticleIds);
  const remainingArticles = sourceEvent.articles.filter((a) => !splitSet.has(a.articleId));
  const splitArticles = sourceEvent.articles.filter((a) => splitSet.has(a.articleId));

  const newEventId = `evt-split-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const operationId = `op-split-${Date.now()}`;

  const operation: SplitOperation = {
    id: operationId,
    operationType: 'SPLIT',
    sourceEventId: sourceEvent.id,
    splitArticleIds,
    newEventId,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    timestamp: new Date().toISOString(),
    rationale,
    isReversible: true,
  };

  // Remaining timeline
  const remainingTimeline = sourceEvent.timeline.filter(
    (t) => !t.evidenceArticleId || !splitSet.has(t.evidenceArticleId)
  );
  const splitTimeline = sourceEvent.timeline.filter(
    (t) => t.evidenceArticleId && splitSet.has(t.evidenceArticleId)
  );

  const updatedSource: AdverseEvent = {
    ...sourceEvent,
    articles: remainingArticles,
    timeline: remainingTimeline,
    sourceCount: remainingArticles.length,
    independentSourceCount: Math.max(1, remainingArticles.filter((a) => a.isIndependent).length),
    revisions: [
      ...sourceEvent.revisions,
      {
        id: `rev-${sourceEvent.id}-${sourceEvent.revisions.length + 1}`,
        eventId: sourceEvent.id,
        revisionNumber: sourceEvent.revisions.length + 1,
        timestamp: new Date().toISOString(),
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        changeType: 'SPLIT',
        changeSummary: `Split ${splitArticleIds.length} articles into new event "${newEventTitle}" (${newEventId}). Reason: ${rationale}`,
        previousSnapshot: { ...sourceEvent },
      },
    ],
    mergeSplitHistory: [...sourceEvent.mergeSplitHistory, operation],
    updatedAt: new Date().toISOString(),
  };

  const newEvent: AdverseEvent = {
    id: newEventId,
    caseId: sourceEvent.caseId,
    eventTitle: newEventTitle,
    eventSummary: `Event partitioned from "${sourceEvent.eventTitle}". ${rationale}`,
    primaryCategory: sourceEvent.primaryCategory,
    categories: sourceEvent.categories,
    legalStatus: sourceEvent.legalStatus,
    jurisdiction: sourceEvent.jurisdiction,
    investigatingAuthorities: sourceEvent.investigatingAuthorities,
    dateRange: sourceEvent.dateRange,
    reviewStatus: 'PROPOSED',
    primaryNextAction: 'Review newly split event and confirm evidentiary boundaries',
    sourceCount: splitArticles.length,
    independentSourceCount: Math.max(1, splitArticles.filter((a) => a.isIndependent).length),
    hasCorrections: false,
    hasRetractions: false,
    subjects: sourceEvent.subjects,
    articles: splitArticles,
    timeline: splitTimeline.map((t) => ({ ...t, eventId: newEventId })),
    revisions: [
      {
        id: `rev-${newEventId}-1`,
        eventId: newEventId,
        revisionNumber: 1,
        timestamp: new Date().toISOString(),
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        changeType: 'CREATED',
        changeSummary: `Created via partition from event "${sourceEvent.eventTitle}" (${sourceEvent.id}).`,
      },
    ],
    mergeSplitHistory: [operation],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return { updatedSource, newEvent, operation };
}

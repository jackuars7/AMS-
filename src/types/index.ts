/**
 * Enterprise AML/KYC Adverse Media Screening Agent - Domain Types
 * Stage 1 Foundation
 */

export type RoleId =
  | 'ANALYST'
  | 'CHECKER'
  | 'COMPLIANCE_OFFICER'
  | 'MLRO'
  | 'OPERATIONS_MANAGER'
  | 'POLICY_ADMINISTRATOR'
  | 'SYSTEM_ADMINISTRATOR'
  | 'AUDITOR';

export type UserRole = RoleId;

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  department: string;
  avatarUrl?: string;
}

export type PermissionKey =
  | 'case:view'
  | 'case:edit'
  | 'case:assign'
  | 'case:submit_review'
  | 'case:approve_close'
  | 'subject:create_edit'
  | 'alias:propose'
  | 'alias:approve'
  | 'screening:run'
  | 'screening:pause_resume'
  | 'manifest:view'
  | 'manifest:revise'
  | 'historical_exception:request'
  | 'historical_exception:approve'
  | 'saved_view:manage'
  | 'exemption:request'
  | 'exemption:approve'
  | 'policy:view'
  | 'policy:edit'
  | 'search_config:edit'
  | 'connector:manage'
  | 'audit:view'
  | 'audit:export'
  | 'event:view'
  | 'event:edit'
  | 'event:merge_split'
  | 'event:recluster'
  | 'timeline:edit';

export type CustomerType = 'CORPORATE' | 'INDIVIDUAL' | 'FINANCIAL_INSTITUTION' | 'TRUST';

export type CaseStatus =
  | 'DRAFT'
  | 'SCREENING_PENDING'
  | 'IN_REVIEW'
  | 'ESCALATED'
  | 'COMPLETED'
  | 'REJECTED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export type ScreeningStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ACTION_REQUIRED'
  | 'BLOCKED';

export type InvestigationStatus =
  | 'UNASSIGNED'
  | 'TRIAGE'
  | 'IN_PROGRESS'
  | 'PENDING_EXEMPTIONS'
  | 'AWAITING_CHECKER'
  | 'REWORK_REQUESTED'
  | 'ESCALATED_COMPLIANCE'
  | 'ESCALATED_MLRO'
  | 'READY_FOR_DECISION'
  | 'COMPLETED'
  | 'CLOSED';

export interface KycCase {
  id: string;
  reference: string;
  customerName: string;
  customerType: 'CORPORATE' | 'INDIVIDUAL';
  jurisdiction: string;
  riskLevel: RiskLevel;
  status: CaseStatus;
  screeningStatus: ScreeningStatus;
  investigationStatus: InvestigationStatus;
  assignedTo: string;
  assignedToName: string;
  assignedRole: RoleId;
  slaDueDate: string; // ISO UTC
  createdAt: string;
  updatedAt: string;
  blockingConditions: string[];
  primaryNextAction: string;
  notes?: string;
  policyVersionId: string;
}

export type PartyRole =
  | 'PRIMARY_CUSTOMER'
  | 'UBO'
  | 'DIRECTOR'
  | 'CONTROLLER'
  | 'AUTHORIZED_SIGNATORY'
  | 'TRUSTEE'
  | 'BENEFICIARY';

export interface Party {
  id: string;
  caseId: string;
  name: string;
  partyType: 'INDIVIDUAL' | 'CORPORATE';
  role: PartyRole;
  ownershipPercentage?: number;
  jurisdiction: string;
  isMandatoryScreening: boolean;
  relationshipNotes?: string;
}

export type ObligationStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXEMPTED'
  | 'BLOCKED';

export interface ScreeningObligation {
  id: string;
  caseId: string;
  partyId: string;
  subjectId: string;
  partyName: string;
  partyRole: PartyRole;
  policyVersion: string;
  ruleId: string;
  mandatory: boolean;
  status: ObligationStatus;
  lastRunId?: string;
  lastRunTimestamp?: string;
  exemption?: ExemptionRecord;
  createdAt: string;
  updatedAt: string;
}

export interface ExemptionRecord {
  id: string;
  obligationId: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  reasonCode: 'LEGACY_CLEARED' | 'REGULATORY_CARVE_OUT' | 'DUPLICATE_ENTITY' | 'LOW_RISK_SUBSIDIARY' | 'OTHER';
  justification: string;
  evidenceReference: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  approvalNotes?: string;
}

export interface SubjectAttribute {
  id: string;
  subjectId: string;
  fieldName: string;
  fieldLabel: string;
  fieldValue: string;
  source: string;
  sourceRecordRef: string;
  captureMethod: 'AUTOMATED_INGESTION' | 'DOCUMENT_OCR' | 'ANALYST_MANUAL_ENTRY' | 'EXTERNAL_API' | 'REGISTRY';
  confidence: number; // 0.00 to 1.00
  validationStatus: 'VERIFIED' | 'UNVERIFIED' | 'DISPUTED' | 'CONFLICTING';
  effectiveDate: string;
  conflictState?: {
    hasConflict: boolean;
    conflictingValues?: Array<{ value: string; source: string; confidence: number; documentRef?: string }>;
    resolutionNotes?: string;
  };
  provenance?: {
    sourceSystem: string;
    ingestedAt: string;
    sourceDocumentRef: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type AliasType =
  | 'FORMER_NAME'
  | 'LOCAL_SCRIPT'
  | 'TRANSLITERATION'
  | 'INITIALS'
  | 'ABBREVIATION'
  | 'MAIDEN_NAME'
  | 'TRADING_NAME'
  | 'LEGAL_NAME'
  | 'COMMON_NAME'
  | 'ENTITY_SUFFIX_VARIATION'
  | 'ANALYST_ADDED'
  | 'AI_SUGGESTED';

export type AliasState =
  | 'SOURCED'
  | 'GENERATED'
  | 'ANALYST_ADDED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETIRED';

export interface Alias {
  id: string;
  subjectId: string;
  aliasName: string;
  aliasType: AliasType;
  state: AliasState;
  script: string; // e.g. "LATN", "CYRL", "ARAB", "HANI"
  source: string;
  confidence: number;
  addedBy: string;
  addedByName: string;
  addedAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface Subject {
  id: string;
  caseId: string;
  partyId: string;
  primaryName: string;
  subjectType: 'NATURAL_PERSON' | 'LEGAL_ENTITY';
  role: PartyRole;
  ownershipPercentage?: number;
  jurisdiction: string;
  attributes: SubjectAttribute[];
  aliases: Alias[];
  completenessScore: number; // 0 - 100
  hasConflicts: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SourceCategory =
  | 'REGULATORY_ENFORCEMENT'
  | 'GOVERNMENT_GAZETTES'
  | 'COURT_RECORDS'
  | 'LICENSED_NEWS'
  | 'INVESTIGATIVE_MEDIA'
  | 'INTERNAL_WATCHLISTS';

export type EventCategory =
  | 'BRIBERY_CORRUPTION'
  | 'FINANCIAL_CRIME_FRAUD'
  | 'TERRORIST_FINANCING'
  | 'NARCOTICS_TRAFFICKING'
  | 'SANCTIONS_EVASION'
  | 'ORGANIZED_CRIME'
  | 'TAX_EVASION'
  | 'ENVIRONMENTAL_CRIME'
  | 'COURT_RECORDS';

export interface SearchConfiguration {
  id: string;
  name: string;
  version: string;
  isDefault: boolean;
  jurisdictions: string[];
  sourceCategories: SourceCategory[];
  eventCategories: EventCategory[];
  languages: string[];
  keywords: string[];
  allowedDomains: string[];
  excludedDomains: string[];
  dateRangeMonths: number;
  searchDepth: 'STANDARD' | 'ENHANCED' | 'DEEP_FORENSIC';
  maxResultsPerSource: number;
  requiredSourceCoverage: number; // e.g. 80 (80%)
  connectorPreferences: string[];
  exceptions?: Array<{
    reasonCode: string;
    approvedBy: string;
    description: string;
    timestamp: string;
  }>;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  clientType: 'CORPORATE' | 'INDIVIDUAL' | 'ANY';
  subjectRole: PartyRole | 'ANY';
  jurisdictionRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'ANY';
  customerRisk: RiskLevel | 'ANY';
  minOwnershipPercent?: number;
  mandatesScreening: boolean;
  requiredCategories: SourceCategory[];
  searchDepth: 'STANDARD' | 'ENHANCED' | 'DEEP_FORENSIC';
  dateRangeMonths: number;
}

export interface PolicyVersion {
  id: string;
  policyId: string;
  versionNumber: string;
  effectiveFrom: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedBy?: string;
  publishedAt?: string;
  rules: PolicyRule[];
  description: string;
}

export interface PolicyResolution {
  policyVersion: string;
  caseId: string;
  partyId: string;
  evaluatedAt: string;
  inputs: {
    clientType: string;
    subjectRole: string;
    jurisdiction: string;
    ownershipPercentage?: number;
    customerRisk: string;
  };
  matchedRules: string[];
  requiresScreening: boolean;
  mandatory: boolean;
  recommendedSearchDepth: string;
  explanation: string;
}

export type ConnectorHealthStatus = 'ACTIVE' | 'DEGRADED' | 'CIRCUIT_OPEN' | 'MAINTENANCE';
export type ConnectorStatus = ConnectorHealthStatus;

export interface SourceConnector {
  id: string;
  name: string;
  category: SourceCategory;
  provider: string;
  status: ConnectorHealthStatus;
  rateLimitPerMin: number;
  circuitBreakerThreshold: number;
  consecutiveFailures: number;
  lastHealthCheck: string;
  avgLatencyMs: number;
  errorRatePercent: number;
  isAllowlisted: boolean;
  description: string;
}

export interface CoverageOutcome {
  connectorId: string;
  connectorName: string;
  category: SourceCategory;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED' | 'SKIPPED';
  articlesRetrieved: number;
  executionDurationMs: number;
  errorMessage?: string;
  errorCategory?: 'RATE_LIMIT' | 'TIMEOUT' | 'AUTH_ERROR' | 'CIRCUIT_OPEN' | 'BAD_GATEWAY';
  retryCount: number;
  checkpointId?: string;
}

export interface AdverseMediaArticle {
  id: string;
  title: string;
  publisher: string;
  publishedDate: string;
  url: string;
  domain: string;
  language: string;
  eventCategories: EventCategory[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sentimentScore: number; // -1.0 to 1.0
  relevanceScore: number; // 0.0 to 1.0
  snippet: string;
  extractedEntities: string[];
  matchedAliases: string[];
  connectorId: string;
  sourceCategory: SourceCategory;
}

export interface ScreeningRun {
  id: string;
  caseId: string;
  subjectId: string;
  subjectName: string;
  searchConfigVersion: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'PARTIAL_SUCCESS' | 'FAILED' | 'PAUSED';
  startedAt: string;
  completedAt?: string;
  executedBy: string;
  executedByName: string;
  coverageOutcomes: CoverageOutcome[];
  overallCoveragePercent: number;
  totalArticlesFound: number;
  articles: AdverseMediaArticle[];
  isDeterministicMock: boolean;
  idempotencyKey: string;
  manifestId?: string;
  queryVariants?: QueryVariant[];
  coverageGaps?: CoverageGap[];
  historicalPeriod?: HistoricalPeriodResolution;
}

export interface WorkItem {
  id: string;
  caseId: string;
  caseReference: string;
  customerName: string;
  riskLevel: RiskLevel;
  caseStatus: CaseStatus;
  type: 'TRIAGE' | 'OBLIGATION_REVIEW' | 'ALIAS_APPROVAL' | 'EXEMPTION_REQUEST' | 'CHECKER_REVIEW' | 'FAILED_CONNECTOR';
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  assignedRole: RoleId;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  slaDueDate: string;
  isOverdue: boolean;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string; // UTC ISO
  actorId: string;
  actorName: string;
  actorRole: RoleId;
  action: string;
  entityType:
    | 'CASE'
    | 'PARTY'
    | 'SUBJECT'
    | 'ALIAS'
    | 'OBLIGATION'
    | 'EXEMPTION'
    | 'POLICY'
    | 'SEARCH_CONFIG'
    | 'SCREENING_RUN'
    | 'SEARCH_MANIFEST'
    | 'ARTICLE'
    | 'HISTORICAL_PERIOD'
    | 'SAVED_VIEW'
    | 'CONNECTOR'
    | 'ADVERSE_EVENT'
    | 'EVENT_CLUSTER';
  entityId: string;
  caseReference?: string;
  correlationId?: string;
  details: string;
  delta?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
}

// ==========================================
// AM-07: Multilingual Query Expansion & Translation
// ==========================================

export type QueryVariantType =
  | 'PRIMARY_NAME'
  | 'APPROVED_ALIAS'
  | 'LOCAL_SCRIPT'
  | 'TRANSLITERATION'
  | 'KEYWORD_EXPANSION'
  | 'SEMANTIC_EXPANSION';

export interface TranslationRecord {
  id: string;
  sourceText: string;
  sourceLanguage: string;
  targetText: string;
  targetLanguage: string;
  translationMethod:
    | 'APPROVED_RULE'
    | 'OFFICIAL_REGISTRY'
    | 'PROVIDER_DICTIONARY'
    | 'AI_ASSISTED_REVIEWED'
    | 'DETERMINISTIC_TRANSLITERATOR';
  translationVersion: string;
  confidence: number;
  approvedBy: string;
  approvedAt: string;
  approvalState: 'APPROVED' | 'PENDING_APPROVAL';
}

export interface QueryVariant {
  id: string;
  runId: string;
  subjectId: string;
  language: string; // 'en', 'ar', 'hi', 'ml', 'es', 'ru'
  script: string; // 'LATN', 'ARAB', 'DEVA', 'MLYM', 'CYRL'
  originalQuery: string;
  normalizedQuery: string;
  variantType: QueryVariantType;
  searchType: 'LEXICAL' | 'SEMANTIC';
  keywords: string[];
  eventCategories: EventCategory[];
  isRTL: boolean;
  approvalState: 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  translationRecord?: TranslationRecord;
}

// ==========================================
// AM-09: Article Retrieval, Normalization & Assertions
// ==========================================

export type DateConfidenceState =
  | 'VERIFIED'
  | 'PROVIDER_REPORTED'
  | 'APPROXIMATE'
  | 'CONFLICTING'
  | 'INFERRED_UNVERIFIED'
  | 'UNAVAILABLE'
  | 'UNKNOWN';

export interface DateAssertion {
  date: string | null; // ISO string if known/approx, null if unknown/unavailable
  confidenceState: DateConfidenceState;
  rawDateString?: string;
  sourceField?: string;
  conflictingDates?: Array<{ date: string; source: string; note: string }>;
  explanation?: string;
}

export interface LanguageAssessment {
  detectedLanguage: string; // ISO 639-1: en, ar, hi, ml, es, ru
  confidence: number;
  method: 'HTTP_HEADER' | 'HTML_LANG_ATTR' | 'STATISTICAL_N_GRAM' | 'METADATA_EXTRACTOR';
  isRTL: boolean;
  script: string;
}

export type ArticleAccessStatus =
  | 'ACCESSIBLE'
  | 'PAYWALL'
  | 'RESTRICTED'
  | 'FAILED'
  | 'BLOCKED_BY_POLICY';

export interface ArticleVersion {
  versionNumber: number;
  retrievedAt: string;
  contentHash: string; // SHA-256
  snippet: string;
  sanitizedSnippet: string;
  rawContentLength: number;
  accessStatus: ArticleAccessStatus;
  httpStatus?: number;
  contentChanged: boolean;
}

export interface ArticleMetadata {
  id: string;
  articleId: string;
  canonicalUrl: string;
  publisher: string | null;
  publisherStatus: 'VERIFIED' | 'PROVIDER_REPORTED' | 'UNKNOWN';
  author: string | null;
  authorStatus: 'VERIFIED' | 'PROVIDER_REPORTED' | 'UNKNOWN';
  publicationLocation: string | null;
  publicationLocationStatus: 'VERIFIED' | 'PROVIDER_REPORTED' | 'UNKNOWN';
  publicationDate: DateAssertion;
  updateDate?: DateAssertion;
  republicationDate?: DateAssertion;
  languageAssessment: LanguageAssessment;
  providerMetadata: Record<string, unknown>; // raw untouched
  normalizedMetadata: {
    cleanTitle: string;
    cleanPublisher: string;
    normalizedDomain: string;
    normalizedKeywords: string[];
    sentimentScore: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    eventCategories: EventCategory[];
  };
}

export interface Article {
  id: string;
  caseId: string;
  subjectId: string;
  screeningRunId: string;
  connectorId: string;
  title: string;
  canonicalUrl: string;
  domain: string;
  publisher: string;
  author: string;
  language: string;
  isRTL: boolean;
  contentHash: string; // SHA-256 of current version
  accessStatus: ArticleAccessStatus;
  currentVersion: number;
  versions: ArticleVersion[];
  metadata: ArticleMetadata;
  // Assessment placeholders - strictly "Not assessed" or "Unknown" until future stage or analyst review
  identityAssessment: 'CONFIRMED_MATCH' | 'POTENTIAL_MATCH' | 'FALSE_POSITIVE' | 'NOT_ASSESSED';
  legalStatus: 'Not assessed' | string;
  credibility: 'Not assessed' | string;
  materiality: 'Not assessed' | string;
  relevanceScore: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  matchedAliases: string[];
  matchedKeywords: string[];
  retrievalRecordId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RetrievalRecord {
  id: string;
  runId: string;
  articleId: string;
  connectorId: string;
  url: string;
  canonicalUrl: string;
  retrievalTimestamp: string;
  durationMs: number;
  httpStatus: number;
  contentLengthBytes: number;
  contentHash: string;
  accessStatus: ArticleAccessStatus;
  ssrfValidated: boolean;
  domainAllowlisted: boolean;
  sanitizationResult: {
    rawPayloadStripped: boolean;
    maliciousInstructionsDetected: boolean;
    detectedThreats: string[];
  };
}

// ==========================================
// AM-10: Configurable Historical Search Periods
// ==========================================

export type ReviewType = 'ONBOARDING' | 'PERIODIC' | 'TRIGGERED_EVENT' | 'REMEDIATION';

export interface HistoricalPeriodRule {
  id: string;
  name: string;
  description: string;
  clientType: 'CORPORATE' | 'INDIVIDUAL' | 'ANY';
  subjectRole: PartyRole | 'ANY';
  riskLevel: RiskLevel | 'ANY';
  jurisdiction: string | 'ANY';
  reviewType: ReviewType | 'ANY';
  eventCategory: EventCategory | 'ANY';
  lookbackMonths: number;
  minimumLookbackMonths: number;
  priority: number;
  policyVersion: string;
  effectiveFrom: string;
}

export interface HistoricalPeriodResolution {
  ruleId: string;
  policyVersion: string;
  resolvedLookbackMonths: number;
  earliestSearchDate: string; // YYYY-MM-DD
  latestSearchDate: string; // YYYY-MM-DD
  isAuthorizedException: boolean;
  exceptionRecord?: {
    id: string;
    originalMonths: number;
    overrideMonths: number;
    justification: string;
    requestedBy: string;
    requestedAt: string;
    approvedBy: string;
    approvedAt: string;
  };
  explanation: string;
}

// ==========================================
// AM-08: Search Audit Records & Manifest
// ==========================================

export interface ConnectorAttempt {
  id: string;
  connectorId: string;
  connectorName: string;
  attemptNumber: number;
  timestamp: string;
  durationMs: number;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED' | 'CIRCUIT_BROKEN';
  articlesFound: number;
  httpStatusCode?: number;
  errorMessage?: string;
  errorCategory?: 'RATE_LIMIT' | 'TIMEOUT' | 'AUTH_ERROR' | 'CIRCUIT_OPEN' | 'BAD_GATEWAY';
  queryVariantsScreened: number;
}

export interface CoverageGap {
  id: string;
  connectorId: string;
  connectorName: string;
  category: SourceCategory;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  errorCategory: 'RATE_LIMIT' | 'TIMEOUT' | 'AUTH_ERROR' | 'CIRCUIT_OPEN' | 'BAD_GATEWAY' | 'POLICY_EXCLUSION';
  failedAttempts: number;
  canRetry: boolean;
  remediationAction: string;
}

export interface SearchExecution {
  id: string;
  manifestId: string;
  startedAt: string;
  completedAt?: string;
  totalDurationMs?: number;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'PARTIAL_SUCCESS' | 'FAILED' | 'PAUSED';
  attempts: ConnectorAttempt[];
  queryVariants: QueryVariant[];
  coverageOutcomes: CoverageOutcome[];
  coverageGaps: CoverageGap[];
  totalResultsCount: number;
  accessibleResultsCount: number;
}

export interface SearchManifestRevision {
  revisionNumber: number;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: RoleId;
  changeReason: string;
  deltaSummary: string;
  supersededManifestId: string;
}

export interface SearchManifest {
  id: string;
  runId: string;
  caseId: string;
  subjectId: string;
  subjectName: string;
  manifestHash?: string;
  approvedAliases: string[];
  queryVariants: QueryVariant[];
  languages: string[];
  keywords: string[];
  eventCategories: EventCategory[];
  allowedDomains: string[];
  historicalPeriod: HistoricalPeriodResolution;
  policyVersion: string;
  searchConfigVersion: string;
  connectors: Array<{ id: string; name: string; category: SourceCategory; provider: string }>;
  execution: SearchExecution;
  attempts?: ConnectorAttempt[];
  totalResultsCount?: number;
  sealedAt?: string;
  status?: string;
  initiatingActorId: string;
  initiatingActorName: string;
  initiatingActorRole: RoleId;
  initiatingSystem: string;
  correlationId: string;
  createdAt: string;
  completedAt?: string;
  isImmutable: boolean;
  activeRevisionNumber: number;
  revisions: SearchManifestRevision[];
}

// ==========================================
// AM-11: Result Review, Filtering, and Saved Views
// ==========================================

export interface SavedView {
  id: string;
  name: string;
  isDefault: boolean;
  ownerId: string;
  filters: {
    searchQuery?: string;
    languages?: string[];
    eventCategories?: EventCategory[];
    sourceConnectors?: string[];
    accessStatus?: ArticleAccessStatus[];
    identityAssessment?: string[];
    dateFrom?: string;
    dateTo?: string;
    minRelevance?: number;
    severity?: string[];
  };
  visibleColumns: string[];
  sortBy: 'publishedDate' | 'retrievalDate' | 'relevanceScore' | 'publisher' | 'severity';
  sortDirection: 'asc' | 'desc';
  pageSize: number;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// AM-16: Duplicate Article Detection
// ==========================================

export type DuplicateType =
  | 'EXACT_URL'
  | 'CANONICAL_URL'
  | 'CONTENT_HASH'
  | 'NEAR_DUPLICATE'
  | 'TRANSLATED_COPY'
  | 'NOT_DUPLICATE';

export interface ContentFingerprint {
  id: string;
  articleId: string;
  canonicalUrl: string;
  normalizedUrl: string;
  normalizedTitleHash: string;
  normalizedContentHash: string; // Stripped of boilerplate/HTML
  simHash64: string; // 64-bit SimHash hex
  shingles: string[]; // 3-gram or 4-gram shingles
  tokenCount: number;
  createdAt: string;
}

export interface DuplicateAssessment {
  id: string;
  articleId: string;
  duplicateOfArticleId?: string;
  duplicateType: DuplicateType;
  similarityScore: number; // 0.0 to 1.0
  method: 'URL_CANONICALIZATION' | 'CONTENT_HASH' | 'SIMHASH' | 'SHINGLE_JACCARD' | 'HUMAN_OVERRIDE';
  status: 'AUTO_DETECTED' | 'CONFIRMED_BY_HUMAN' | 'SPLIT_BY_HUMAN' | 'REJECTED';
  adjudicatedBy?: string;
  adjudicatedByName?: string;
  adjudicatedAt?: string;
  rationale: string;
  isReversible: boolean;
  fingerprint?: ContentFingerprint;
}

export interface DeduplicationConfig {
  exactUrlMatch: number; // 1.0
  canonicalUrlMatch: number; // 1.0
  contentHashMatch: number; // 1.0
  nearDuplicateThreshold: number; // default 0.85
  syndicatedThreshold: number; // default 0.65
  enableCrossLingualDetection: boolean;
}

// ==========================================
// AM-17: Syndicated-Content Clustering
// ==========================================

export type ClusterType = 'SYNDICATION_CLUSTER' | 'DUPLICATE_GROUP' | 'TOPIC_CLUSTER';

export interface ClusterMembership {
  articleId: string;
  clusterId: string;
  similarityToLead: number;
  sourceRole: SourceRole;
  attributionType?:
    | 'DIRECT_WIRE'
    | 'NAMED_CITATION'
    | 'REPRINT'
    | 'CROSS_TRANSLATION'
    | 'INDEPENDENT_REPORTING'
    | 'AGGREGATED_SNIPPET';
  attributionText?: string;
  joinedAt: string;
  isLead: boolean;
}

export interface ArticleCluster {
  id: string;
  caseId: string;
  clusterType: ClusterType;
  leadArticleId: string;
  leadTitle: string;
  leadPublisher: string;
  originalPublishedDate: string;
  totalArticleCount: number;
  independentSourceCount: number; // Crucial: prevents double counting!
  hasRetractions: boolean;
  hasCorrections: boolean;
  hasCommentary: boolean;
  members: ClusterMembership[];
  publicationChain: PublicationRelationship[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// AM-18: Original-Source Identification
// ==========================================

export type SourceRole =
  | 'ORIGINAL'
  | 'LIKELY_ORIGINAL'
  | 'INDEPENDENT_CORROBORATION'
  | 'REPUBLISHER'
  | 'SYNDICATED_COPY'
  | 'AGGREGATOR'
  | 'COMMENTARY'
  | 'UNKNOWN';

export interface PublicationRelationship {
  id: string;
  sourceArticleId: string;
  targetArticleId: string;
  relationshipType:
    | 'REPUBLISHED_FROM'
    | 'CITES'
    | 'SYNDICATED_FROM'
    | 'TRANSLATED_FROM'
    | 'INDEPENDENTLY_CORROBORATES'
    | 'COMMENTS_ON';
  confidence: number;
  evidenceSnippet: string;
  uncertaintyNotes?: string;
}

export interface SourceRoleAssessment {
  articleId: string;
  assignedRole: SourceRole;
  confidence: number; // 0.0 to 1.0
  rationales: string[];
  attributionDetected: boolean;
  attributionTarget?: string;
  publicationTimeRank: number; // 1 = earliest verified
  uncertaintyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  uncertaintyReason?: string;
  humanReviewed: boolean;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
}

// ==========================================
// AM-19: Unique Adverse-Event Creation
// ==========================================

export type LegalStatus =
  | 'ALLEGATION'
  | 'REGULATORY_INQUIRY'
  | 'INVESTIGATION_UNDERWAY'
  | 'FORMAL_CHARGES_FILED'
  | 'ARREST_WARRANT'
  | 'TRIAL_PROCEEDING'
  | 'CONVICTION'
  | 'ACQUITTAL'
  | 'SETTLEMENT'
  | 'DISMISSED'
  | 'REMEDIATED'
  | 'RETRACTED'
  | 'NOT_ASSESSED';

export type EventSubjectRole =
  | 'ALLEGED_PERPETRATOR'
  | 'ENTITY_UNDER_INVESTIGATION'
  | 'DIRECTOR_EXECUTIVE'
  | 'CO_CONSPIRATOR'
  | 'WITNESS'
  | 'VICTIM'
  | 'CONNECTED_PARTY';

export interface EventSubject {
  subjectId: string;
  subjectName: string;
  roleInEvent: EventSubjectRole;
  relevanceScore: number;
  relevanceRationale: string;
}

export interface EventArticle {
  articleId: string;
  articleTitle: string;
  publisher: string;
  publishedDate: string;
  sourceRole: SourceRole;
  isOriginal: boolean;
  isIndependent: boolean;
  relevanceToEvent: number;
  attributionSnippet?: string;
}

export interface AdverseEvent {
  id: string;
  caseId: string;
  eventTitle: string;
  eventSummary: string;
  primaryCategory: EventCategory;
  categories: EventCategory[];
  legalStatus: LegalStatus;
  jurisdiction: string;
  investigatingAuthorities: string[];
  dateRange: {
    startDate: string | null;
    endDate: string | null;
    isOngoing: boolean;
    confidence: 'VERIFIED' | 'APPROXIMATE' | 'UNKNOWN';
  };
  reviewStatus: 'PROPOSED' | 'CONFIRMED' | 'IN_REVIEW' | 'DISMISSED';
  primaryNextAction: string;
  sourceCount: number;
  independentSourceCount: number; // Invariant: Independent count <= source count
  hasCorrections: boolean;
  hasRetractions: boolean;
  subjects: EventSubject[];
  articles: EventArticle[];
  timeline: TimelineEntry[];
  revisions: EventRevision[];
  mergeSplitHistory: Array<MergeOperation | SplitOperation | ReassignmentOperation>;
  createdAt: string;
  updatedAt: string;
  confirmedBy?: string;
  confirmedByName?: string;
  confirmedAt?: string;
}

export interface EventRevision {
  id: string;
  eventId: string;
  revisionNumber: number;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: RoleId;
  changeType:
    | 'CREATED'
    | 'CONFIRMED'
    | 'METADATA_UPDATED'
    | 'ARTICLE_ADDED'
    | 'ARTICLE_REMOVED'
    | 'TIMELINE_MODIFIED'
    | 'MERGED'
    | 'SPLIT'
    | 'REASSIGNED'
    | 'SOURCE_ROLE_UPDATED';
  changeSummary: string;
  previousSnapshot?: Partial<AdverseEvent>;
}

// ==========================================
// AM-20: Event Timeline Construction
// ==========================================

export type TimelineEntryType =
  | 'ALLEGED_CONDUCT'
  | 'INVESTIGATION'
  | 'ARREST'
  | 'CHARGE'
  | 'FILING'
  | 'HEARING'
  | 'JUDGMENT'
  | 'CONVICTION'
  | 'ACQUITTAL'
  | 'APPEAL'
  | 'SETTLEMENT'
  | 'DISMISSAL'
  | 'REMEDIATION'
  | 'RETRACTION'
  | 'CORRECTION'
  | 'OTHER';

export interface TimelineEntry {
  id: string;
  eventId: string;
  entryType: TimelineEntryType;
  date: string | null; // ISO YYYY-MM-DD or null
  dateConfidence: 'VERIFIED' | 'APPROXIMATE' | 'UNKNOWN';
  title: string;
  description: string;
  evidenceArticleId?: string;
  evidenceArticleTitle?: string;
  evidenceSnippet?: string;
  unverified: boolean;
  unverifiedReason?: string;
  jurisdiction?: string;
  authority?: string;
  sequenceOrder: number;
}

// ==========================================
// Human Review Operations (Reversible)
// ==========================================

export interface MergeOperation {
  id: string;
  operationType: 'MERGE';
  primaryEventId: string;
  secondaryEventId: string;
  resultingEventId: string;
  actorId: string;
  actorName: string;
  actorRole: RoleId;
  timestamp: string;
  rationale: string;
  isReversible: boolean;
  reversedAt?: string;
  reversedBy?: string;
}

export interface SplitOperation {
  id: string;
  operationType: 'SPLIT';
  sourceEventId: string;
  splitArticleIds: string[];
  newEventId: string;
  actorId: string;
  actorName: string;
  actorRole: RoleId;
  timestamp: string;
  rationale: string;
  isReversible: boolean;
  reversedAt?: string;
  reversedBy?: string;
}

export interface ReassignmentOperation {
  id: string;
  operationType: 'REASSIGNMENT';
  articleId: string;
  fromEventId: string;
  toEventId: string;
  actorId: string;
  actorName: string;
  actorRole: RoleId;
  timestamp: string;
  rationale: string;
}

// ==========================================
// AM-21 to AM-27: Grounded Content Extraction & Evidence Review
// ==========================================

export type SummaryCategory =
  | 'REPORTED_ALLEGATIONS'
  | 'REPORTED_FACTS'
  | 'VERIFIED_FINDINGS'
  | 'LEGAL_PROCEDURAL_OUTCOMES'
  | 'UNRESOLVED_POINTS'
  | 'CONTRADICTORY_INFORMATION';

export type ClaimValidationState =
  | 'VALIDATED'
  | 'FLAGGED_UNSUPPORTED'
  | 'HUMAN_CORRECTED'
  | 'PENDING_REVIEW';

export interface SummaryClaim {
  id: string;
  articleId: string;
  category: SummaryCategory;
  claimText: string;
  confidence: number; // 0.0 - 1.0
  supportingPassageIds: string[];
  validationState: ClaimValidationState;
  validationNotes?: string;
  isVerifiedFinding: boolean;
  isContradiction?: boolean;
  contradictionDetails?: string;
}

export interface ArticleSummary {
  id: string;
  articleId: string;
  articleVersion: number;
  executiveSummary: string;
  claims: SummaryClaim[];
  generatedAt: string;
  modelId: string;
  promptVersion: string;
  citationCoverageScore: number; // percentage of statements backed by valid passages
  humanReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
}

// AM-22: Configurable, Versioned Multi-Label Taxonomy
export interface TaxonomyCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  riskWeight: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  indicators: string[];
  isActive: boolean;
}

export interface TaxonomyVersion {
  versionId: string;
  versionNumber: number;
  name: string;
  effectiveDate: string;
  categories: TaxonomyCategory[];
  isCurrent: boolean;
  createdBy: string;
}

export interface EventClassification {
  id: string;
  articleId: string;
  taxonomyVersionId: string;
  categoryCode: string;
  categoryName: string;
  confidence: number;
  evidencePassageIds: string[];
  rationale: string;
  assignedBy: 'AI_PIPELINE' | 'HUMAN_ANALYST';
  status: 'PROPOSED' | 'CONFIRMED' | 'REJECTED';
  reviewNotes?: string;
}

// AM-23: Controlled Legal Status & State Machine
export type ControlledLegalStatus =
  | 'ALLEGATION'
  | 'INVESTIGATION'
  | 'FORMAL_CHARGES_FILED'
  | 'ARREST_WARRANT'
  | 'TRIAL_PROCEEDING'
  | 'CONVICTION'
  | 'ACQUITTAL'
  | 'SETTLEMENT'
  | 'DISMISSAL'
  | 'REMEDIATED'
  | 'RETRACTED';

export interface LegalStatusTransitionRule {
  fromStatus: ControlledLegalStatus;
  toStatus: ControlledLegalStatus;
  allowed: boolean;
  requiresEvidence: boolean;
  ruleDescription: string;
}

export interface LegalStatusAssertion {
  id: string;
  articleId: string;
  status: ControlledLegalStatus;
  previousStatus?: ControlledLegalStatus;
  jurisdiction: string;
  authority: string;
  assertionDate: string | null;
  subject: string;
  evidencePassageIds: string[];
  confidence: number;
  validationState: 'VALIDATED' | 'HUMAN_OVERRIDDEN' | 'PENDING_VERIFICATION';
  transitionRationale?: string;
  recordedAt: string;
  recordedBy: string;
}

// AM-24: Entity and Participant Extraction
export type ExtractedEntityType =
  | 'PERSON'
  | 'ORGANIZATION'
  | 'REGULATOR'
  | 'COURT'
  | 'ENFORCEMENT_AGENCY'
  | 'OTHER_AUTHORITY';

export type ParticipantRoleType =
  | 'ALLEGED_PERPETRATOR'
  | 'ENTITY_UNDER_INVESTIGATION'
  | 'COMPLAINANT_VICTIM'
  | 'CO_CONSPIRATOR'
  | 'WHISTLEBLOWER'
  | 'INVESTIGATING_AUTHORITY'
  | 'PRESIDING_JUDGE'
  | 'LEGAL_COUNSEL'
  | 'THIRD_PARTY_WITNESS'
  | 'UNAFFILIATED_MENTION';

export interface EntityRelationship {
  targetEntityName: string;
  relationshipType: string;
  confidence: number;
}

export interface ExtractedEntity {
  id: string;
  articleId: string;
  name: string;
  entityType: ExtractedEntityType;
  participantRole: ParticipantRoleType;
  confidence: number;
  aliases: string[];
  jurisdiction?: string;
  evidencePassageIds: string[];
  relationships: EntityRelationship[];
  isScreenedSubjectMatch: boolean;
  screenedSubjectId?: string;
}

// AM-25: Jurisdiction and Location Extraction (Distinct from publication location)
export interface CrossBorderLinkage {
  originCountry: string;
  destinationCountry: string;
  nexusReason: string;
}

export interface JurisdictionAssertion {
  id: string;
  articleId: string;
  countryCode: string; // ISO-3166-1 alpha-2
  countryName: string;
  legalJurisdiction: string; // e.g. "US Southern District of New York"
  eventLocation?: string; // Physical location of conduct
  courtLocation?: string; // Court location
  enforcementLocation?: string; // Authority HQ
  crossBorderLinkage?: CrossBorderLinkage;
  evidencePassageIds: string[];
  confidence: number;
}

// AM-26: Material Fact Extraction
export type MaterialFactType =
  | 'DATE'
  | 'AMOUNT'
  | 'CONDUCT'
  | 'OFFENSE'
  | 'PENALTY'
  | 'CASE_NUMBER'
  | 'AFFECTED_PARTY'
  | 'OUTCOME'
  | 'REMEDIATION';

export interface NormalizedFactValue {
  numericAmount?: number;
  currency?: string;
  isoDate?: string;
  statutoryReference?: string;
}

export interface MaterialFact {
  id: string;
  articleId: string;
  factType: MaterialFactType;
  label: string;
  value: string;
  normalizedValue?: NormalizedFactValue;
  confidence: number;
  evidencePassageIds: string[];
  verificationState: 'VERIFIED' | 'REPORTED' | 'CONTESTED';
  notes?: string;
}

// AM-27: Supporting Evidence Passages with Exact Offsets
export interface EvidencePassage {
  id: string;
  articleId: string;
  articleVersion: number;
  passageIndex: number;
  text: string;
  startOffset: number; // 0-indexed character offset
  endOffset: number; // 0-indexed character offset
  surroundingContext: {
    prefix: string;
    suffix: string;
  };
  language: string;
  translation?: string;
  retrievalTime: string;
  extractionConfidence: number;
  linkedClaimIds: string[];
  linkedFactIds: string[];
  linkedEntityIds: string[];
}

// Pipeline Run and Validation Records
export interface ExtractionRun {
  id: string;
  articleId: string;
  articleVersion: number;
  status: 'SUCCESS' | 'PARTIAL' | 'REJECTED' | 'ABSTAINED';
  executedAt: string;
  promptVersion: string;
  modelVersion: string;
  totalPassagesExtracted: number;
  totalClaimsGenerated: number;
  totalFactsExtracted: number;
  totalEntitiesExtracted: number;
  validationErrors: string[];
  citationIntegrityScore: number; // 0.0 - 1.0 (1.0 = all offsets verified against source)
  schemaCompliant: boolean;
}

export interface HumanCorrection {
  id: string;
  articleId: string;
  targetType: 'CLAIM' | 'FACT' | 'ENTITY' | 'CLASSIFICATION' | 'LEGAL_STATUS' | 'PASSAGE';
  targetId: string;
  fieldModified: string;
  previousValue: unknown;
  newValue: unknown;
  rationale: string;
  actorId: string;
  actorName: string;
  actorRole: RoleId;
  timestamp: string;
  isReversible: boolean;
}

export interface ArticleExtractionBundle {
  articleId: string;
  articleVersion: number;
  summary: ArticleSummary;
  classifications: EventClassification[];
  legalStatus: LegalStatusAssertion;
  entities: ExtractedEntity[];
  jurisdictions: JurisdictionAssertion[];
  materialFacts: MaterialFact[];
  passages: EvidencePassage[];
  corrections: HumanCorrection[];
  lastExtractionRun: ExtractionRun;
}

// ============================================================================
// STAGE 4: AM-28 to AM-37 EXPLAINABLE EVENT ASSESSMENT & REASONING ENGINE
// ============================================================================

// AM-28: Source Credibility
export type SourceType =
  | 'REGULATORY_AUTHORITY'
  | 'JUDICIAL_GAZETTE'
  | 'MAJOR_INVESTIGATIVE_OUTLET'
  | 'SPECIALIZED_INDUSTRY_JOURNAL'
  | 'REGIONAL_COMMERCIAL_MEDIA'
  | 'UNVERIFIED_BLOG'
  | 'UNKNOWN';

export type EditorialStandard =
  | 'STRICT_PEER_REVIEW'
  | 'VERIFIED_EDITORIAL_BOARD'
  | 'COMMERCIAL_NEWSROOM'
  | 'UNREGULATED';

export type AuthorshipTransparency =
  | 'BYLINED_IDENTIFIED'
  | 'ORGANIZATIONAL_BYLINE'
  | 'ANONYMOUS_UNVERIFIED';

export type CorrectionPolicyType =
  | 'TRANSPARENT_CORRECTION_POLICY'
  | 'BASIC_CORRECTION'
  | 'NONE_DOCUMENTED';

export type CredibilityTier = 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';

export interface CredibilityAssessment {
  id: string;
  articleId: string;
  sourceId: string;
  sourceName: string;
  domain: string;
  sourceType: SourceType;
  credibilityScore: number; // 0.0 - 1.0 (versioned formula, not mere popularity)
  credibilityTier: CredibilityTier;
  editorialStandards: EditorialStandard;
  authorshipTransparency: AuthorshipTransparency;
  correctionPolicy: CorrectionPolicyType;
  isFirstPartyReporting: boolean;
  historicalReliability: number; // 0.0 - 1.0 approved metric
  evidencePassageIds: string[];
  rationales: string[];
  assessedAt: string;
  policyVersion: string;
}

// AM-29: Source Provenance
export type ProvenanceType =
  | 'ORIGINAL'
  | 'DERIVED'
  | 'REPUBLISHED'
  | 'AGGREGATED'
  | 'COMMENTARY'
  | 'UNKNOWN';

export interface PublicationChainNode {
  order: number;
  publisher: string;
  domain?: string;
  publishedDate?: string;
  roleDescription: string;
  isOriginalRoot: boolean;
  attributionSnippet?: string;
}

export interface SourceProvenance {
  id: string;
  articleId: string;
  provenanceType: ProvenanceType;
  originatingArticleId?: string;
  originatingPublisher?: string;
  publicationChain: PublicationChainNode[];
  attributionSnippet?: string;
  transformationType: 'EXACT_MIRROR' | 'SYNDICATED_COPY' | 'TRANSLATION' | 'EDITORIAL_SUMMARY' | 'NONE';
  confidence: number;
  rationales: string[];
  assessedAt: string;
}

// AM-30: Independent Corroboration
export interface SourceOwnership {
  publisher: string;
  corporateParent: string;
  ultimateBeneficialOwner?: string;
  jurisdiction: string;
  isStateAffiliated: boolean;
}

export type CorroborationLevel =
  | 'UNILATERAL_SINGLE_SOURCE'
  | 'DUAL_INDEPENDENT'
  | 'MULTI_INDEPENDENT_CORROBORATED'
  | 'HIGHLY_CORROBORATED';

export interface CorroborationAssessment {
  id: string;
  eventId: string;
  totalArticlesLinked: number;
  independentSourcesCount: number; // Excludes syndication and corporate co-ownership
  syndicatedCopiesCount: number;
  independentPublishers: string[];
  syndicatedPublishers: string[];
  sharedOwnershipGroups: Array<{ corporateGroup: string; memberPublishers: string[] }>;
  corroborationLevel: CorroborationLevel;
  corroboratingPassageCount: number;
  crossSourceFactCorroborations: Array<{
    factDescription: string;
    independentSources: string[];
  }>;
  rationales: string[];
  assessedAt: string;
}

// AM-31: Content Update & Retraction Monitoring
export type ContentUpdateType =
  | 'CORRECTION'
  | 'RETRACTION'
  | 'CLARIFICATION'
  | 'MATERIAL_UPDATE'
  | 'CLAIM_REMOVAL'
  | 'LEGAL_STATUS_CHANGE';

export interface ContentUpdateRecord {
  id: string;
  articleId: string;
  eventId: string;
  updateType: ContentUpdateType;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  detectedAt: string;
  originalTextSnippet?: string;
  updatedTextSnippet?: string;
  rationale: string;
  reopenedEvent: boolean;
  workOwnerNotified: boolean;
  notifiedActorId?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
  reassessmentTriggered: boolean;
}

// AM-32: Evidence Strength (Decoupled from sentiment)
export type EvidenceStrengthTier =
  | 'VERY_STRONG'
  | 'STRONG'
  | 'MODERATE'
  | 'WEAK'
  | 'UNSUPPORTED';

export interface EvidenceStrengthAssessment {
  id: string;
  eventId: string;
  strengthScore: number; // 0.0 - 1.0
  strengthTier: EvidenceStrengthTier;
  credibilityContribution: number;
  independenceContribution: number;
  legalStatusContribution: number;
  identityConfidenceContribution: number;
  evidenceSpecificityContribution: number;
  deductionsForContradictions: number;
  deductionsForRetractions: number;
  sentimentIsolated: true; // Strict audit proof: sentiment score not conflated
  rationales: string[];
  assessedAt: string;
}

// AM-33: Relationship Relevance
export type SubjectRelationshipType =
  | 'DIRECT_TARGET'
  | 'OFFICER_DIRECTOR'
  | 'BENEFICIAL_OWNER'
  | 'SHAREHOLDER'
  | 'SUBSIDIARY_ENTITY'
  | 'AFFILIATE'
  | 'INTERMEDIARY'
  | 'INCIDENTAL_MENTION';

export type ControlLevel =
  | 'DIRECT_EXECUTIVE_CONTROL'
  | 'SUBSTANTIAL_OWNERSHIP'
  | 'FORMAL_GOVERNANCE'
  | 'MINORITY_PASSIVE'
  | 'NONE';

export type RelevanceTier =
  | 'DIRECT_PRIMARY'
  | 'HIGH_RELEVANCE'
  | 'MODERATE_NEXUS'
  | 'TENUOUS'
  | 'IRRELEVANT';

export interface RelevanceAssessment {
  id: string;
  eventId: string;
  subjectId: string;
  subjectName: string;
  relationshipType: SubjectRelationshipType;
  controlLevel: ControlLevel;
  roleAtEventTime: string;
  currentRole: string;
  relationshipStartDate?: string;
  relationshipEndDate?: string;
  eventWithinTenure: boolean;
  distanceFromCustomer: number; // 0 = Customer/Target directly, 1 = First degree, 2 = Second degree
  serviceContext: string;
  relevanceScore: number; // 0.0 - 1.0
  relevanceTier: RelevanceTier;
  rationales: string[];
  assessedAt: string;
}

// AM-34: Recency Assessment
export type ConductRecencyStatus =
  | 'CONTINUING'
  | 'REPEATED'
  | 'HISTORIC_SINGLE_INCIDENT'
  | 'RESOLVED_REMEDIATED'
  | 'LEGAL_DISMISSAL';

export type RecencyTier =
  | 'ACTIVE_CONTINUING'
  | 'RECENT_HIGH_RELEVANCE'
  | 'MID_PERIOD'
  | 'AGED_REDUCED_WEIGHT'
  | 'HISTORICAL_OUT_OF_SCOPE';

export interface RecencyAssessment {
  id: string;
  eventId: string;
  eventDate: string | null;
  publicationDate: string;
  yearsElapsed: number;
  conductStatus: ConductRecencyStatus;
  isContinuingConduct: boolean;
  hasRepeatedOccurrences: boolean;
  remediationDocumented: boolean;
  remediationDetails?: string;
  recencyScore: number; // 0.0 - 1.0
  recencyTier: RecencyTier;
  rationales: string[];
  assessedAt: string;
}

// AM-35: Severity Assessment
export type SeverityTier =
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'INFORMATIONAL';

export interface SeverityAssessment {
  id: string;
  eventId: string;
  conductType: string;
  severityScore: number; // 0.0 - 1.0
  severityTier: SeverityTier;
  monetaryMagnitude?: {
    rawAmountText: string;
    amount: number;
    currency: string;
    normalizedUSD: number;
  };
  affectedPartiesCount?: number;
  seniorityOfInvolvedParties: 'EXECUTIVE_C_SUITE' | 'SENIOR_MANAGEMENT' | 'OPERATIONAL_STAFF' | 'UNKNOWN';
  systemicNature: 'SYSTEMIC_ORGANIZATIONAL' | 'REPEATED_DEPARTMENTAL' | 'ISOLATED_INDIVIDUAL';
  enforcementActionTaken: boolean;
  penaltyImposed?: string;
  statutoryFramework?: string;
  rationales: string[];
  assessedAt: string;
}

// AM-37: Contradictory and Exculpatory Evidence
export type ContradictionType =
  | 'DENIAL'
  | 'DISMISSAL'
  | 'ACQUITTAL'
  | 'CORRECTION'
  | 'RETRACTION'
  | 'SUCCESSFUL_APPEAL'
  | 'REMEDIATION_CONFIRMATION'
  | 'MATERIAL_INCONSISTENCY';

export interface ContradictoryEvidence {
  id: string;
  eventId: string;
  contradictionType: ContradictionType;
  evidenceTitle: string;
  claimContradicted: string;
  contradictorySnippet: string;
  evidenceArticleId?: string;
  evidencePassageId?: string;
  authorityOrPublisher: string;
  dateReported: string;
  isMaterial: boolean;
  addressedByAnalyst: boolean;
  analystResolutionNotes?: string;
  analystResolutionAction?: 'DISMISSED_WITH_EVIDENCE' | 'MITIGATING_FACTOR_ACCEPTED' | 'ESCALATED_FOR_LEGAL_REVIEW' | 'UNRESOLVED';
  addressedAt?: string;
  addressedBy?: string;
}

// Explainable Factors & Rules
export interface FactorResult {
  factorId: string;
  factorName: string;
  category: 'EVIDENCE' | 'IDENTITY' | 'LEGAL' | 'SEVERITY' | 'RECENCY' | 'RELEVANCE' | 'CONTRADICTION';
  direction: 'INCREASING_RISK' | 'DECREASING_RISK' | 'NEUTRAL';
  weight: number;
  score: number;
  explanation: string;
  supportingEvidenceSnippet?: string;
  supportingPassageIds: string[];
}

export interface RuleExecution {
  ruleId: string;
  ruleName: string;
  ruleDescription: string;
  inputParams: Record<string, any>;
  evaluatedCondition: string;
  result: boolean;
  outputAdjustment: string;
  policyVersion: string;
  executedAt: string;
}

export interface AssessmentOverride {
  id: string;
  eventId: string;
  field: string;
  previousValue: any;
  overriddenValue: any;
  rationale: string;
  performedBy: { id: string; name: string; role: RoleId };
  authorizedBy?: { id: string; name: string; role: RoleId };
  requiresDualAuthorization: boolean;
  status: 'ACTIVE' | 'REVOKED' | 'PENDING_APPROVAL';
  timestamp: string;
}

export interface RecalculationRecord {
  id: string;
  timestamp: string;
  triggerReason: string;
  actorId: string;
  actorName: string;
  previousRecommendation: string;
  newRecommendation: string;
  changedFactors: string[];
  policyVersion: string;
}

// AM-36: Explainable Materiality Recommendation
export type MaterialityRecommendationValue =
  | 'MATERIAL_ADVERSE'
  | 'POTENTIALLY_MATERIAL'
  | 'INCONCLUSIVE'
  | 'IMMATERIAL';

export interface MaterialityRecommendation {
  recommendation: MaterialityRecommendationValue;
  confidenceScore: number; // 0.0 - 1.0
  keyDrivers: FactorResult[];
  mitigatingFactors: FactorResult[];
  missingEvidenceGaps: string[];
  unresolvedContradictionsCount: number;
  requiredNextActions: string[];
  isHumanDecision: false; // Never an autonomous compliance decision
  policyVersion: string;
  taxonomyVersion: string;
  modelVersion: string;
  promptVersion: string;
  calculatedAt: string;
}

// Unified Event Assessment Record
export interface EventAssessment {
  id: string;
  eventId: string;
  caseId: string;
  subjectId: string;
  materiality: MaterialityRecommendation;
  credibilityAssessments: CredibilityAssessment[];
  provenanceAssessments: SourceProvenance[];
  corroboration: CorroborationAssessment;
  contentUpdates: ContentUpdateRecord[];
  evidenceStrength: EvidenceStrengthAssessment;
  relevanceAssessments: RelevanceAssessment[];
  recency: RecencyAssessment;
  severity: SeverityAssessment;
  contradictions: ContradictoryEvidence[];
  ruleExecutions: RuleExecution[];
  overrides: AssessmentOverride[];
  recalculationHistory: RecalculationRecord[];
  status: 'PROPOSED' | 'ANALYST_REVIEWED' | 'CHECKER_APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// AM-38 through AM-44: Investigation Workflow, Dispositions, Maker-Checker, Escalations, Human Decisions & Tasks
// ==========================================

export interface Investigation {
  id: string;
  caseId: string;
  caseReference: string;
  subjectId: string;
  subjectName: string;
  status: InvestigationStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedAnalystId?: string;
  assignedAnalystName?: string;
  assignedReviewerId?: string;
  assignedReviewerName?: string;
  escalatedToOfficerId?: string;
  escalatedToOfficerName?: string;
  mlroId?: string;
  mlroName?: string;
  activeDraftId?: string;
  slaDueDate: string;
  slaBreached: boolean;
  slaRemainingMs: number;
  totalEventsCount: number;
  unresolvedContradictionsCount: number;
  pendingTasksCount: number;
  reworkCount: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  summary: string;
  blockingConditions: string[];
  tags: string[];
  aiRecommendation?: {
    id: string;
    materialityRecommendation: string;
    confidenceScore: number;
    summaryRationale: string;
    calculatedAt: string;
    modelVersion: string;
    promptVersion: string;
    isHumanDecision: false;
  };
  primaryNextAction?: string;
  currentAnalystConclusion?: AnalystConclusion;
  currentReviewDecision?: ReviewDecision;
  activeEscalationId?: string;
}

export interface WorkspaceState {
  caseId: string;
  selectedEventId?: string;
  selectedArticleId?: string;
  selectedFactId?: string;
  splitPaneRatio: number; // e.g. 50 (50/50), 65, etc.
  splitPaneView: 'evidence' | 'timeline' | 'disposition' | 'contradictions' | 'tasks';
  activeDeckTab: 'disposition' | 'review' | 'escalation' | 'tasks' | 'overrides' | 'comments';
  filterCategory?: string;
  filterSeverity?: string;
  filterLanguage?: string;
  lastDraftSavedAt?: string;
  hasUnsavedChanges: boolean;
  searchFilter: string;
  focusMode: boolean;
}

export interface Draft {
  id: string;
  investigationId: string;
  caseId: string;
  actorId: string;
  actorRole: RoleId;
  draftType: 'ANALYST_DISPOSITION' | 'REVIEWER_FEEDBACK' | 'ESCALATION_NOTE' | 'MLRO_DETERMINATION';
  payload: Record<string, any>;
  lastSavedAt: string;
  version: number;
  isDirty: boolean;
}

export type DispositionOutcome =
  | 'TRUE_POSITIVE_MATERIAL'
  | 'TRUE_POSITIVE_NON_MATERIAL'
  | 'FALSE_POSITIVE'
  | 'ESCALATE_COMPLIANCE'
  | 'ESCALATE_MLRO'
  | 'INCONCLUSIVE_MORE_INFO';

export type FindingClassification =
  | 'TRUE_POSITIVE'
  | 'FALSE_POSITIVE'
  | 'INCONCLUSIVE'
  | 'RETRACTED'
  | DispositionOutcome;

export type RiskRating = 'HIGH' | 'MEDIUM' | 'LOW';

export type RecommendedNextAction =
  | 'CLOSE_CASE'
  | 'ENHANCED_DUE_DILIGENCE'
  | 'EXIT_RELATIONSHIP'
  | 'FILE_SAR_STR'
  | 'PERIODIC_REVIEW'
  | 'REQUEST_MORE_DOCS';

export type ActionRecommendation =
  | 'ESCALATE_SAR'
  | 'DISMISS'
  | 'ENHANCED_MONITORING'
  | 'EXEMPTION_REQUEST'
  | RecommendedNextAction;

export type ReviewDecisionType = 'APPROVE' | 'RETURN_FOR_REWORK' | 'REASSIGN' | 'ESCALATE';

export type ComplianceDecisionType = ComplianceAuthorizedOutcome;

export type MlroStatutoryDecision =
  | 'FILE_SAR'
  | 'DISMISS_NO_SAR'
  | 'REFER_LAW_ENFORCEMENT'
  | MlroDetermination;

export type EscalationRecord = Escalation;

export interface AnalystConclusion {
  id: string;
  investigationId: string;
  caseId: string;
  subjectId: string;
  outcome: DispositionOutcome;
  rationale: string;
  evidenceConsidered: string[]; // Article, passage, or fact IDs
  contradictionsConsidered: Array<{
    contradictionId: string;
    resolutionSummary: string;
  }>;
  missingInformationNotes?: string;
  recommendedNextAction: RecommendedNextAction;
  policyRequiredFields: {
    customerTenureVerified: boolean;
    pepStatusConfirmed: boolean;
    financialScaleAssessed: boolean;
    dualIndependentSourcesChecked: boolean;
    mitigatingEvidenceWeighed: boolean;
  };
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  submissionStatus: 'DRAFT' | 'SUBMITTED_FOR_REVIEW' | 'REWORK_REQUIRED' | 'ACCEPTED';
  submittedBy: string;
  submittedByName: string;
  submittedByRole: RoleId;
  submittedAt: string;
  version: number;
  reworkFeedback?: {
    reworkReason: string;
    reworkChecklist: string[];
    returnedBy: string;
    returnedAt: string;
  };
}

export interface ReviewDecision {
  id: string;
  investigationId: string;
  caseId: string;
  decisionType: 'APPROVE' | 'RETURN_FOR_REWORK' | 'REASSIGN' | 'ESCALATE';
  reviewerId: string;
  reviewerName: string;
  reviewerRole: RoleId;
  decisionNotes: string;
  reworkReason?: string;
  reworkChecklist?: string[];
  reassignedToId?: string;
  reassignedToName?: string;
  decisionAt: string;
  previousAnalystConclusionId: string;
  approvalEvidenceSummary: string;
  makerId: string; // Used to strictly enforce server-side no-self-approval
}

export type ComplianceAuthorizedOutcome =
  | 'SAR_FILING_RECOMMENDED'
  | 'EXIT_CUSTOMER'
  | 'RESTRICT_ACCOUNT'
  | 'APPROVE_WITH_CONDITIONS'
  | 'DISMISS_ESCALATION'
  | 'RETURN_FOR_INFO'
  | 'RETURN_WITH_GUIDANCE'
  | 'REFER_TO_MLRO';

export interface ComplianceDecision {
  id: string;
  investigationId: string;
  caseId: string;
  escalationId: string;
  outcome: ComplianceAuthorizedOutcome;
  rationale: string;
  conditionsAttached: string[];
  furtherActions: string[];
  officerId: string;
  officerName: string;
  officerRole: RoleId;
  decidedAt: string;
  status: 'FINAL' | 'PENDING_MLRO';
}

export type MlroDetermination =
  | 'SAR_FILED'
  | 'NO_SAR_DISMISSED'
  | 'SPECIAL_MEASURES_APPROVED'
  | 'RETURN_TO_COMPLIANCE';

export interface MlroDecision {
  id: string;
  investigationId: string;
  caseId: string;
  escalationId: string;
  sarFilingRequired: boolean;
  sarFilingReference?: string;
  determination: MlroDetermination;
  rationale: string;
  mlroId: string;
  mlroName: string;
  mlroRole: RoleId;
  decidedAt: string;
  regulatoryNoticeReference?: string;
  statutoryDeadline?: string;
}

export interface InvestigationOverride {
  id: string;
  investigationId: string;
  caseId: string;
  eventId?: string;
  field: string;
  originalValue: any;
  revisedValue: any;
  reason: string;
  evidenceCitations: string[];
  actor: {
    id: string;
    name: string;
    role: RoleId;
  };
  timestamp: string;
  approvalRequirement: 'NONE' | 'FOUR_EYES_CHECKER' | 'COMPLIANCE_OFFICER';
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'REVERTED';
  approver?: {
    id: string;
    name: string;
    role: RoleId;
    decidedAt: string;
    notes: string;
  };
  downstreamImpact: string;
  recalculationStatus: 'PENDING' | 'RECALCULATED' | 'NOT_APPLICABLE';
}

export type EscalationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EscalationReason =
  | 'SANCTIONS_EXPOSURE'
  | 'HIGH_SEVERITY_CORRUPTION'
  | 'PEP_INVOLVEMENT'
  | 'REPUTATIONAL_RISK'
  | 'MATERIAL_ADVERSE_MEDIA'
  | 'REGULATORY_ENQUIRY';

export type EscalationQueue = 'ESCALATIONS_COMPLIANCE' | 'ESCALATIONS_MLRO';

export type EscalationStatus = 'OPEN' | 'IN_REVIEW' | 'MORE_INFO_REQUESTED' | 'RESOLVED' | 'DISMISSED';

export interface EscalationEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: RoleId;
  action: string;
  notes: string;
}

export interface Escalation {
  id: string;
  investigationId: string;
  caseId: string;
  caseReference: string;
  customerName: string;
  priority: EscalationPriority;
  reason: EscalationReason;
  requiredEvidence: string[];
  slaHours: number;
  slaDueDate: string;
  slaStatus: 'ON_TRACK' | 'AT_RISK' | 'BREACHED';
  queue: EscalationQueue;
  ownerId?: string;
  ownerName?: string;
  escalatedById: string;
  escalatedByName: string;
  escalatedByRole: RoleId;
  escalatedAt: string;
  status: EscalationStatus;
  history: EscalationEvent[];
  authorizedOutcome?: string;
  rationaleNotes: string;
}

export type QueueItemType =
  | 'ANALYST_TRIAGE'
  | 'CHECKER_REVIEW'
  | 'COMPLIANCE_ESCALATIONS'
  | 'MLRO_ESCALATIONS'
  | 'REWORK_QUEUE';

export interface QueueItem {
  id: string;
  investigationId: string;
  caseId: string;
  caseReference: string;
  customerName: string;
  queueType: QueueItemType;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedToId?: string;
  assignedToName?: string;
  assignedRole: RoleId;
  slaDueDate: string;
  slaBreached: boolean;
  slaRemainingMs: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  investigationStatus?: InvestigationStatus;
  summary: string;
  blockingConditionsCount?: number;
  primaryNextAction?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskType =
  | 'DOCUMENT_REQUEST'
  | 'PUBLIC_RECORD_SEARCH'
  | 'ADVERSE_MEDIA_FOLLOWUP'
  | 'EDD_REPORT'
  | 'COMPLIANCE_QUERY'
  | 'AUDIT_VERIFICATION';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';

export interface TaskDependency {
  taskId: string;
  requiredStatus: TaskStatus;
}

export interface TaskReminder {
  id: string;
  remindAt: string;
  recipientId: string;
  message: string;
  isTriggered: boolean;
}

export interface TaskCompletionEvidence {
  notes: string;
  documentLinks?: string[];
  completedBy: string;
  completedByName: string;
  completedAt: string;
}

export interface InvestigationTask {
  id: string;
  investigationId: string;
  caseId: string;
  subjectId: string;
  eventId?: string;
  taskType: TaskType;
  title: string;
  description: string;
  ownerId: string;
  ownerName: string;
  ownerRole: RoleId;
  dueDate: string;
  priority: TaskPriority;
  dependencies: string[]; // Task IDs that must be completed first
  status: TaskStatus;
  reminders: TaskReminder[];
  completionEvidence?: TaskCompletionEvidence;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SLAClockStatus = 'ACTIVE' | 'PAUSED' | 'BREACHED' | 'SATISFIED';

export interface SLAClock {
  id: string;
  entityType: 'INVESTIGATION' | 'ESCALATION' | 'TASK';
  entityId: string;
  totalDurationHours: number;
  startedAt: string;
  dueAt: string;
  remainingMs: number;
  status: SLAClockStatus;
  warningThresholdMs: number;
  isAtRisk: boolean;
  isBreached: boolean;
}

export interface InvestigationComment {
  id: string;
  investigationId: string;
  caseId: string;
  eventId?: string;
  taskId?: string;
  authorId: string;
  authorName: string;
  authorRole: RoleId;
  text: string;
  mentions: string[];
  isInternal?: boolean;
  createdAt: string;
}

export interface DecisionVersion {
  version: number;
  decisionType: 'ANALYST_CONCLUSION' | 'REVIEW_DECISION' | 'COMPLIANCE_DECISION' | 'MLRO_DECISION';
  decisionId: string;
  data: Record<string, any>;
  actorId: string;
  actorRole: RoleId;
  timestamp: string;
  hash: string;
  previousVersionHash?: string;
}

export interface WorkflowTransition {
  id: string;
  investigationId: string;
  caseId: string;
  fromStatus: InvestigationStatus;
  toStatus: InvestigationStatus;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: RoleId;
  timestamp: string;
  rationale?: string;
  validationChecklist: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// AM-45: KYC Case Integration Types
// ---------------------------------------------------------------------------
export type IntegrationSyncStatus = 'SYNCED' | 'OUT_OF_SYNC' | 'PENDING_RECONCILIATION' | 'FAILED';
export type OutboxStatus = 'PENDING' | 'TRANSMITTED' | 'RETRYING' | 'ACKNOWLEDGED' | 'FAILED' | 'DEAD_LETTER';

export interface KycCaseLink {
  id: string;
  caseId: string;
  caseReference: string;
  screeningRunIds: string[];
  subjectIds: string[];
  eventIds: string[];
  evidenceIds: string[];
  conclusionIds: string[];
  taskIds: string[];
  approvalIds: string[];
  blockers: string[];
  conditionIds: string[];
  integrationStatus: IntegrationSyncStatus;
  lastReconciledAt: string;
  reconciliationChecksum: string;
  contractVersion: string;
  outboxStatus: OutboxStatus;
}

// ---------------------------------------------------------------------------
// AM-46: Risk-Factor Integration & Approved Finding Types
// ---------------------------------------------------------------------------
export interface ApprovedFinding {
  id: string;
  investigationId: string;
  caseId: string;
  sourceDecisionId: string;
  sourceDecisionType: 'ANALYST_CONCLUSION' | 'REVIEW_DECISION' | 'COMPLIANCE_DECISION' | 'MLRO_DECISION';
  approvedByUserId: string;
  approvedByUserName: string;
  approvedByUserRole: RoleId;
  approvedAt: string;
  findingClassification: FindingClassification;
  eventIds: string[];
  primaryAdverseCategory: string;
  legalStatus: string;
  isMaterial: boolean;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  credibilityTier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  humanJustification: string;
  isTransmittedToRiskEngine: boolean;
  transmissionTimestamp?: string;
  transmissionHash?: string;
}

export interface RiskFactor {
  id: string;
  code: string;
  name: string;
  category: 'FINANCIAL_CRIME' | 'POLITICAL_EXPOSURE' | 'SANCTIONS_TERROR' | 'REGULATORY_ENFORCEMENT' | 'REPUTATIONAL';
  weight: number;
  score: number;
  sourceFindingId: string;
  ruleId: string;
  direction: 'INCREASE' | 'DECREASE' | 'NEUTRAL';
  notes: string;
}

export interface RiskCalculation {
  id: string;
  investigationId: string;
  caseId: string;
  calculatedAt: string;
  riskRuleVersion: string;
  previousRating: RiskRating;
  proposedRating: RiskRating;
  overallScore: number;
  materialDrivers: Array<{
    factorCode: string;
    factorName: string;
    scoreContribution: number;
    findingId: string;
    rationale: string;
    appliedRule: string;
  }>;
  reducingFactors: Array<{
    factorName: string;
    mitigationType: string;
    reductionValue: number;
    rationale: string;
  }>;
  humanOverrides: Array<{
    overrideId: string;
    targetField: string;
    originalValue: any;
    overriddenValue: any;
    justification: string;
    approvedBy: string;
    impactOnScore: number;
  }>;
  unresolvedDependencies: string[];
  deliveryStatus: OutboxStatus;
  deliveryAttempts: number;
  reconciliationState: 'RECONCILED' | 'PENDING' | 'MISMATCH';
  checksum: string;
  signedByRole?: RoleId;
  signedByUserId?: string;
}

// ---------------------------------------------------------------------------
// AM-47: Risk-Rating Impact Explanation Types
// ---------------------------------------------------------------------------
export interface RiskImpact {
  caseId: string;
  investigationId: string;
  hasHumanApprovedFindings: boolean;
  activeApprovedFindingCount: number;
  previousRating: RiskRating;
  proposedRating: RiskRating;
  ratingDelta: 'UPGRADE_RISK' | 'DOWNGRADE_RISK' | 'NO_CHANGE';
  isBlocked: boolean;
  blockingReason?: string;
  explanationSummary: string;
  appliedRules: string[];
  calculation: RiskCalculation;
}

// ---------------------------------------------------------------------------
// AM-48: EDD Triggers & Investigation Plans Types
// ---------------------------------------------------------------------------
export type EddStatus = 'TRIGGERED' | 'PLAN_DRAFTED' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED' | 'WAIVED';

export interface EddQuestion {
  id: string;
  questionText: string;
  category: 'SOURCE_OF_WEALTH' | 'BENEFICIAL_OWNERSHIP' | 'LEGAL_DISPUTE' | 'TRANSACTION_RATIONALE' | 'REPUTATION';
  isMandatory: boolean;
  aiDrafted: boolean;
  humanApproved: boolean;
  humanApprovedBy?: string;
  responseSummary?: string;
  evidenceAttached: string[];
  status: 'OPEN' | 'ADDRESSED' | 'VERIFIED';
}

export interface EddAdditionalSubject {
  id: string;
  name: string;
  role: 'UBO_AFFILIATE' | 'NOMINEE_DIRECTOR' | 'CO_DEFENDANT' | 'HOLDING_ENTITY';
  jurisdiction: string;
  screeningStatus: 'NOT_SCREENED' | 'IN_PROGRESS' | 'CLEARED' | 'FLAGGED';
}

export interface EddEvidenceRequirement {
  id: string;
  documentType: 'CERTIFIED_REGISTRY' | 'COURT_TRANSCRIPT' | 'TAX_CLEARANCE' | 'BANK_REFERENCE' | 'SWORN_DECLARATION';
  description: string;
  isMandatory: boolean;
  status: 'REQUIRED' | 'OBTAINED' | 'VALIDATED' | 'WAIVED';
  documentRef?: string;
}

export interface InvestigationPlan {
  id: string;
  eddCaseId: string;
  title: string;
  questions: EddQuestion[];
  researchTasks: string[];
  additionalSubjects: EddAdditionalSubject[];
  evidenceRequirements: EddEvidenceRequirement[];
  targetDueDate: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

export interface EddCase {
  id: string;
  caseId: string;
  investigationId: string;
  status: EddStatus;
  triggerCode: string;
  triggerReason: string;
  triggeredAt: string;
  triggeredBy: string;
  plan: InvestigationPlan;
  approvalStages: Array<{
    stage: 'ANALYST_DRAFT' | 'CHECKER_REVIEW' | 'COMPLIANCE_SIGN_OFF';
    approverId?: string;
    approverName?: string;
    status: 'PENDING' | 'APPROVED' | 'RETURNED';
    notes?: string;
    timestamp?: string;
  }>;
  completionCriteriaMet: boolean;
  completionReport?: string;
  closedAt?: string;
}

// ---------------------------------------------------------------------------
// AM-49: Client Information Requests (CIR) Types
// ---------------------------------------------------------------------------
export type InformationRequestStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'TRANSMITTED'
  | 'PARTIALLY_RESPONDED'
  | 'RESPONDED'
  | 'CLOSED'
  | 'EXPIRED';

export interface InformationRequestItem {
  id: string;
  title: string;
  description: string;
  dueDays: number;
  mandatory: boolean;
  status: 'PENDING' | 'FULFILLED' | 'INSUFFICIENT';
  clientComment?: string;
  attachedDocId?: string;
}

export interface RequestApproval {
  id: string;
  requestId: string;
  stage: 'INTERNAL_LEAD' | 'LEGAL_COMPLIANCE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewerId: string;
  reviewerName: string;
  reviewerRole: RoleId;
  reviewedAt?: string;
  notes?: string;
}

export interface ClientResponseDocument {
  id: string;
  filename: string;
  filesizeBytes: number;
  mimeType: string;
  sha256Checksum: string;
  storageUri: string;
  verificationStatus: 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
}

export interface ClientResponse {
  id: string;
  requestId: string;
  submittedAt: string;
  submittedBy: string;
  responsePayload: string;
  documents: ClientResponseDocument[];
  analystReviewNotes?: string;
  isAdequate: boolean;
}

export interface InformationRequest {
  id: string;
  caseId: string;
  investigationId: string;
  title: string;
  requestReference: string;
  recipient: {
    name: string;
    email: string;
    role: 'LEGAL_REPRESENTATIVE' | 'PRIMARY_CONTACT' | 'AUTHORIZED_SIGNATORY';
    validationStatus: 'VALIDATED' | 'UNVERIFIED';
    validatedAt?: string;
  };
  deliveryChannel: 'SECURE_CLIENT_PORTAL' | 'ENCRYPTED_EMAIL' | 'SWIFT_SECURE';
  status: InformationRequestStatus;
  isAiAssistedDraft: boolean;
  aiDraftPrompt?: string;
  requiresComplianceApproval: boolean;
  requestItems: InformationRequestItem[];
  dueDate: string;
  remindersSent: number;
  lastReminderAt?: string;
  approvals: RequestApproval[];
  responses: ClientResponse[];
  transmittedAt?: string;
  closedAt?: string;
  closureNotes?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// AM-50: Compliance Decision Pack Types
// ---------------------------------------------------------------------------
export interface DecisionPack {
  id: string;
  investigationId: string;
  caseId: string;
  packReference: string;
  version: number;
  generatedAt: string;
  generatedById: string;
  generatedByName: string;
  generatedByRole: RoleId;
  status: 'DRAFT' | 'SEALED' | 'SUPERSEDED';
  screeningCoverageSummary: {
    connectorsExecuted: number;
    totalQueriesRun: number;
    historicalLookbackYears: number;
    coverageGapsIdentified: string[];
  };
  subjects: Array<{ id: string; name: string; role: string; screeningOutcome: string }>;
  eventsSummary: Array<{
    eventId: string;
    title: string;
    category: string;
    legalStatus: string;
    credibilityTier: string;
    independentCorroborations: number;
  }>;
  identityConclusions: string;
  evidenceFindings: string;
  contradictionsSummary: string;
  materialityRecommendations: string;
  riskImpactSummary: {
    previousRating: RiskRating;
    revisedRating: RiskRating;
    materialDrivers: string[];
    reducingFactors: string[];
    ruleVersion: string;
  };
  humanDecisions: Array<{
    type: string;
    decision: string;
    decidedBy: string;
    role: string;
    timestamp: string;
    rationale: string;
  }>;
  exceptions: string[];
  outstandingActions: string[];
  cryptographicSignature: {
    algorithm: 'SHA-256';
    manifestHash: string;
    signatureTime: string;
    signatoryUserId: string;
    signatoryName: string;
    signatoryRole: string;
  };
  authorizedDownload: {
    downloadToken: string;
    expiresAt: string;
    accessCount: number;
    maxAccessAllowed: number;
  };
}

// ---------------------------------------------------------------------------
// AM-51: Acceptance Conditions Types
// ---------------------------------------------------------------------------
export type ConditionStatus = 'PENDING' | 'MET' | 'WAIVED' | 'BREACHED';

export interface ConditionEvidence {
  id: string;
  conditionId: string;
  documentTitle: string;
  referenceNumber: string;
  uploadedAt: string;
  uploadedBy: string;
  verifiedBy?: string;
  verifiedAt?: string;
  notes: string;
}

export interface AcceptanceCondition {
  id: string;
  caseId: string;
  investigationId: string;
  title: string;
  description: string;
  category: 'EDD_DOCUMENTATION' | 'TRANSACTION_LIMIT' | 'PERIODIC_REVIEW' | 'LEGAL_DISCLOSURE' | 'SOURCE_OF_FUNDS';
  ownerId: string;
  ownerName: string;
  ownerRole: RoleId;
  assignedDepartment: 'COMPLIANCE' | 'FIRST_LINE_RM' | 'OPERATIONS' | 'LEGAL';
  dueDate: string;
  status: ConditionStatus;
  isBlocking: boolean;
  blockingScope: 'BLOCK_ONBOARDING' | 'BLOCK_TRANSACTIONS' | 'POST_ONBOARDING_MONITOR';
  reviewFrequencyDays: number;
  nextReviewDate: string;
  evidence: ConditionEvidence[];
  signOffs: Array<{
    role: 'ANALYST' | 'CHECKER' | 'COMPLIANCE_OFFICER';
    signedBy: string;
    signedAt: string;
    status: 'APPROVED' | 'REJECTED';
  }>;
  breachEscalation?: {
    isEscalated: boolean;
    escalatedAt?: string;
    escalationReason?: string;
    escalationRef?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// AM-52: BAU Handover & Anti-Corruption Layer Types
// ---------------------------------------------------------------------------
export interface HandoverPackage {
  id: string;
  caseId: string;
  investigationId: string;
  packageRef: string;
  targetSystem: 'BAU_CORE_BANKING' | 'FIRST_LINE_CRM' | 'ONGOING_TRANSACTION_MONITORING';
  createdAt: string;
  createdBy: string;
  status: 'DRAFT' | 'APPROVED_FOR_TRANSMISSION' | 'IN_OUTBOX' | 'TRANSMITTED' | 'ACKNOWLEDGED' | 'FAILED' | 'DEAD_LETTER';
  dataMinimizationRules: {
    maskConfidentialSarNotes: boolean;
    restrictRawMediaArticles: boolean;
    includeOnlyPermittedDisclosures: boolean;
  };
  permittedDisclosures: {
    approvedFactsSummary: string;
    restrictions: string[];
    activeConditionsCount: number;
    activeConditions: Array<{ id: string; title: string; dueDate: string; owner: string }>;
    monitoringFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
    nextReviewDate: string;
    riskRating: RiskRating;
    ownershipTeam: string;
  };
  outboxDelivery: {
    outboxId: string;
    idempotencyKey: string;
    scheduledAt: string;
    lastAttemptAt?: string;
    attemptCount: number;
    maxRetries: number;
    deliveryStatus: OutboxStatus;
    acknowledgementRef?: string;
    responsePayload?: any;
  };
  reconciliation: ReconciliationRecord;
}

export interface DeliveryAttempt {
  id: string;
  outboxId: string;
  targetSystem: string;
  attemptNumber: number;
  attemptedAt: string;
  status: 'SUCCESS' | 'NETWORK_ERROR' | 'TIMEOUT' | 'SCHEMA_REJECTION' | 'DEAD_LETTER';
  responseCode: number;
  responseBody: string;
  latencyMs: number;
  errorDetails?: string;
}

export interface ReconciliationRecord {
  id: string;
  entityType: 'KYC_CASE' | 'RISK_ENGINE' | 'BAU_HANDOVER';
  entityId: string;
  sourceSystem: 'ADVERSE_MEDIA_SCREENING_AGENT';
  targetSystem: string;
  localChecksum: string;
  remoteChecksum: string;
  reconciledAt: string;
  status: 'MATCH' | 'MISMATCH' | 'DISCREPANCY_DETECTED';
  discrepancyDetails?: string;
  reconciledBy: string;
}

// ============================================================================
// AM-53 through AM-59: Continuous Monitoring & Delta Intelligence Models
// ============================================================================

// AM-53: Scheduled Rescreening & Recalculation
export type ScheduleStatus = 'UPCOMING' | 'DUE' | 'OVERDUE' | 'EXECUTING' | 'COMPLETED' | 'PAUSED';
export type ScheduleReviewType = 'PERIODIC' | 'TRIGGERED' | 'EVENT_DRIVEN' | 'EXCEPTION_OVERRIDE';
export type ScheduleEscalationStatus = 'NORMAL' | 'ESCALATED_WARNING' | 'ESCALATED_BREACH';

export interface ScreeningSchedule {
  id: string;
  subscriptionId: string;
  caseId: string;
  subjectId: string;
  reviewType: ScheduleReviewType;
  customerRisk: RiskRating;
  relationshipType: string;
  intervalDays: number;
  reviewFrequencyDays?: number;
  calculatedNextDate: string;
  nextScreeningAt?: string;
  isOverdue?: boolean;
  status: ScheduleStatus;
  escalationStatus: ScheduleEscalationStatus;
  lastCalculatedAt: string;
  lastExecutedAt?: string;
  ruleRef: string;
  policyRuleApplied?: string;
  ruleVersion: string;
  isPaused: boolean;
  pausedReason?: string;
  authorizedExceptionRef?: string;
  revisionCount: number;
}

export interface ScheduleRevision {
  id: string;
  scheduleId: string;
  revisionNumber: number;
  previousDate: string;
  newDate: string;
  triggerReason: 'RISK_UPGRADE' | 'RISK_DOWNGRADE' | 'POLICY_UPDATE' | 'AUTHORISED_EXCEPTION' | 'MANUAL_OVERRIDE' | 'POST_DISPOSITION';
  changedBy: string;
  changedAt: string;
  rationale: string;
  previousIntervalDays: number;
  newIntervalDays: number;
}

// AM-54: Continuous Adverse-Media Monitoring Subscriptions
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'SUSPENDED';
export type MonitoringFrequency = 'CONTINUOUS' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SCHEDULED_TRIGGER';

export interface MonitoringSubscription {
  id: string;
  caseId: string;
  subjectId: string;
  subjectName: string;
  status: SubscriptionStatus;
  frequency: MonitoringFrequency;
  riskLevel: RiskRating;
  relationshipType: string;
  connectors: string[];
  searchDepth: 'STANDARD' | 'ENHANCED' | 'DEEP_FORENSIC';
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  policyVersion: string;
  lastScreenedAt?: string;
  nextScheduledAt: string;
  activeCycleId?: string;
  pausedReason?: string;
  checkpoints?: JobCheckpoint[];
  queryAliases?: string[];
  customParameters?: Record<string, any>;
}

export interface JobCheckpoint {
  id: string;
  cycleId: string;
  connectorId: string;
  lastProcessedOffset: number;
  lastPublishedDate: string;
  processedArticleIds: string[];
  statePayload: Record<string, any>;
  createdAt: string;
  canResume: boolean;
}

export interface MonitoringCycle {
  id: string;
  cycleNumber: number;
  subscriptionId: string;
  scheduleId?: string;
  subjectId: string;
  startedAt: string;
  completedAt?: string;
  status: 'RUNNING' | 'COMPLETED' | 'PARTIAL_FAILURE' | 'FAILED' | 'RECOVERED';
  connectorStatuses: Record<string, 'SUCCESS' | 'DEGRADED' | 'FAILED' | 'RECOVERED'>;
  totalArticlesRetrieved: number;
  deltaSetId?: string;
  alertCount: number;
  alertsGenerated?: number;
  suppressedCount: number;
  triggeredCaseCount: number;
  checkpointId?: string;
  executionDurationMs?: number;
  failureReason?: string;
}

// AM-55: Delta Analysis
export type DeltaTargetType = 'SUBJECT' | 'ALIAS' | 'ARTICLE' | 'EVENT' | 'LEGAL_STATUS' | 'EVIDENCE' | 'SOURCE' | 'DECISION';
export type DeltaChangeType = 'NEW' | 'UPDATED' | 'UNCHANGED' | 'RESOLVED' | 'REOPENED' | 'REMOVED_FROM_SOURCE' | 'UNKNOWN';

export interface DeltaItem {
  id: string;
  deltaSetId: string;
  targetType: DeltaTargetType;
  targetId: string;
  changeType: DeltaChangeType;
  fieldName?: string;
  previousValue: any;
  newValue: any;
  diffDescription: string;
  isMaterial: boolean;
  confidence: number;
  aiSuggestedClassification?: string;
  aiSummary?: string;
  beforeSnippet?: string;
  afterSnippet?: string;
  entityType?: string;
  changeClassification?: DeltaChangeType;
  materialChangeType?: string;
  isSuppressed?: boolean;
  explanation?: string;
}

export interface DeltaSet {
  id: string;
  cycleId: string;
  subjectId: string;
  generatedAt: string;
  totalItemsCount: number;
  items: DeltaItem[];
  summary: {
    newCount: number;
    updatedCount: number;
    unchangedCount: number;
    resolvedCount: number;
    reopenedCount: number;
    removedCount: number;
  };
}

// AM-56: Suppression of Unchanged Cleared Results
export type SuppressionStatus = 'SUPPRESSED' | 'UNSUPPRESSED' | 'REOPENED';

export interface SuppressionDecision {
  id: string;
  cycleId: string;
  targetArticleId?: string;
  targetEventId?: string;
  subjectName?: string;
  suppressionStatus: SuppressionStatus;
  status?: SuppressionStatus;
  isSuppressed?: boolean;
  isReopened?: boolean;
  suppressionRuleId: string;
  ruleId?: string;
  reopeningRationale?: string;
  ruleVersion: string;
  evaluatedAt: string;
  priorDisposition: string;
  priorRationale: string;
  contentFingerprint: string;
  preservedEvidenceIds: string[];
  reopeningCriteria: string[];
  isAiSuggested: boolean;
  humanAuthorizedBy?: string;
  explanation: string;
}

// AM-57: Material-Update Detection
export type MaterialUpdateCategory =
  | 'CHARGE'
  | 'RULING'
  | 'CONVICTION'
  | 'ACQUITTAL'
  | 'DISMISSAL'
  | 'APPEAL'
  | 'SETTLEMENT'
  | 'CORRECTION'
  | 'RETRACTION'
  | 'NEW_INDEPENDENT_CORROBORATION'
  | 'NEW_CONTRADICTION'
  | 'SIGNIFICANT_IDENTITY_CHANGE'
  | 'OTHER_MATERIAL';

export interface MaterialUpdate {
  id: string;
  cycleId: string;
  eventId: string;
  articleId?: string;
  subjectId: string;
  subjectName?: string;
  updateCategory: MaterialUpdateCategory;
  changeType?: string;
  previousStatus?: string;
  newStatus: string;
  headline: string;
  summary: string;
  sourceEvidencePassageIds: string[];
  detectedAt: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresImmediateEscalation: boolean;
  aiNarrativeDraft?: string;
}

// AM-58: Trigger-Event Case Creation
export type TriggerWorkflowTarget =
  | 'KYC_REFRESH'
  | 'RISK_REVIEW'
  | 'EDD'
  | 'COMPLIANCE_REVIEW'
  | 'MLRO_ESCALATION'
  | 'MONITORING_INVESTIGATION';

export interface TriggerRule {
  id: string;
  ruleCode: string;
  name: string;
  description: string;
  conditionDescription: string;
  targetWorkflow: TriggerWorkflowTarget;
  defaultPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  slaHours: number;
  active: boolean;
  version: string;
}

export interface TriggeredCase {
  id: string;
  triggerRuleId: string;
  sourceMonitoringAlertId?: string;
  sourceMaterialUpdateId?: string;
  originalCaseId: string;
  subjectId: string;
  subjectName: string;
  targetWorkflow: TriggerWorkflowTarget;
  workflowReference: string;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'MERGED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  owner: string;
  slaDeadline: string;
  createdAt: string;
  idempotencyKey: string;
  notificationsSent: string[];
  evidenceSummary: string;
}

// AM-59: Monitoring Alert Prioritization
export type MonitoringAlertType =
  | 'MATERIAL_EVENT_UPDATE'
  | 'NEW_ADVERSE_FINDING'
  | 'REOPENED_CLEARED_EVENT'
  | 'IDENTITY_MODIFICATION'
  | 'CONTRADICTORY_EVIDENCE_EMERGENCE'
  | 'OVERDUE_RESCREENING';

export type MonitoringAlertStatus =
  | 'NEW'
  | 'INVESTIGATING'
  | 'ESCALATED'
  | 'CLEARED'
  | 'SUPPRESSED'
  | 'CONVERTED_TO_CASE'
  | 'ACKNOWLEDGED'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'DISMISSED';

export interface PriorityAssessment {
  id: string;
  overallScore: number; // 0 - 100
  tier?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  slaHours?: number;
  contributingFactors?: Array<{ factor: string; weight: number; max: number }>;
  customerRiskWeight: number;
  severityWeight: number;
  legalStatusWeight: number;
  evidenceStrengthWeight: number;
  relationshipRelevanceWeight: number;
  recencyWeight: number;
  identityConfidenceWeight: number;
  updateTypeWeight: number;
  formulaTrace: string;
  calculatedAt: string;
  ruleVersion: string;
}

export interface MonitoringAlert {
  id: string;
  cycleId: string;
  caseId: string;
  subjectId: string;
  subjectName: string;
  eventId?: string;
  articleId?: string;
  alertType: MonitoringAlertType;
  status: MonitoringAlertStatus;
  priorityScore: number;
  priorityTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priorityAssessment: PriorityAssessment;
  title: string;
  deltaExplanation: string;
  priorDecisionSummary?: string;
  requiredAction: string;
  deepLinkContext: {
    caseId: string;
    subjectId: string;
    eventId?: string;
    articleId?: string;
  };
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  resolvedAt?: string;
  resolutionDisposition?: string;
  aiDraftExplanation?: string;
}

// Monitoring Observability Metrics
export interface MonitoringMetrics {
  totalActiveSubscriptions: number;
  upcomingSchedulesCount: number;
  overdueSchedulesCount: number;
  activeAlertsCount: number;
  criticalAlertsCount: number;
  materialUpdatesCount: number;
  reopenedEventsCount: number;
  suppressionRatePercent: number;
  avgCycleExecutionMs: number;
  connectorHealth: {
    totalConnectors: number;
    healthyConnectors: number;
    trippedCircuitBreakers: number;
  };
  queueLagMinutes: number;
  triggerSuccessRatePercent: number;
}






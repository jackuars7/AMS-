# Enterprise Data Dictionary

This data dictionary documents the core domain entities, fields, types, and constraints required for Stage 1.

---

## 1. KycCase
* `id` (UUID, PK): Unique case identifier.
* `reference` (String): Human-readable business reference (e.g. `CAS-2026-0891`).
* `customerName` (String): Primary corporate or individual customer name.
* `customerType` (Enum: `CORPORATE`, `INDIVIDUAL`): Primary entity classification.
* `jurisdiction` (ISO-3166-1 alpha-2): Operating or incorporation jurisdiction.
* `riskLevel` (Enum: `LOW`, `MEDIUM`, `HIGH`, `VERY_HIGH`): Evaluated AML risk tier.
* `status` (Enum: `DRAFT`, `SCREENING_PENDING`, `IN_REVIEW`, `ESCALATED`, `COMPLETED`, `REJECTED`): Case lifecycle status.
* `screeningStatus` (Enum: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `ACTION_REQUIRED`): Summary status across all screening obligations.
* `assignedTo` (UUID / String): User ID of active owner.
* `assignedRole` (Enum): Role handling the current workflow stage.
* `slaDueDate` (ISO-8601 UTC): Case SLA deadline.
* `blockingConditions` (Array of Strings): Active gates blocking progression (e.g. unresolved mandatory obligations).
* `createdAt`, `updatedAt` (ISO-8601 UTC).

## 2. Party & Relationship
* `id` (UUID, PK): Unique party identifier.
* `caseId` (UUID, FK): Associated KYC case.
* `name` (String): Legal name of connected party.
* `partyType` (Enum: `INDIVIDUAL`, `CORPORATE`): Subject classification.
* `role` (Enum: `PRIMARY_CUSTOMER`, `UBO`, `DIRECTOR`, `CONTROLLER`, `AUTHORIZED_SIGNATORY`, `TRUSTEE`, `BENEFICIARY`): Relationship role to customer.
* `ownershipPercentage` (Number, nullable): Direct or indirect ownership percentage (e.g., 25.0 for UBO threshold).
* `jurisdiction` (String): Nationality or incorporation country.
* `isMandatoryScreening` (Boolean): Calculated from active policy whether screening is strictly required.

## 3. ScreeningObligation (AM-01)
* `id` (UUID, PK): Unique obligation identifier.
* `caseId` (UUID, FK): Associated case.
* `subjectId` (UUID, FK): Target subject party.
* `policyVersionId` (UUID): Specific policy version under which obligation was resolved.
* `ruleId` (String): Rule identifier triggering this obligation.
* `status` (Enum: `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `EXEMPTED`, `BLOCKED`): Status of obligation.
* `exemptionRequestId` (UUID, nullable): Pointer to approved or pending exemption.
* `mandatory` (Boolean): If true, blocks case completion when status != `COMPLETED` and status != `EXEMPTED`.
* `resolvedAt` (ISO-8601 UTC): Timestamp obligation was evaluated.

## 4. Subject & SubjectAttribute (AM-02)
* `Subject`:
  * `id` (UUID, PK): Subject identifier.
  * `partyId` (UUID, FK): Linked party record.
  * `primaryName` (String): Primary validated legal name.
  * `subjectType` (Enum: `NATURAL_PERSON`, `LEGAL_ENTITY`).
  * `completenessScore` (Number): Percentage 0-100 of profile attributes populated.
  * `conflictCount` (Number): Number of conflicting multi-source attributes.
* `SubjectAttribute`:
  * `id` (UUID, PK): Unique attribute identifier.
  * `subjectId` (UUID, FK): Linked subject.
  * `fieldName` (String): Attribute key (e.g. `date_of_birth`, `nationality`, `residential_country`, `tax_id`, `occupation`).
  * `fieldValue` (String): Value.
  * `source` (String): Source system (e.g. `CORE_BANKING_CRM`, `NATIONAL_REGISTRY`, `COMPANIES_HOUSE`, `PASSPORT_SCAN`).
  * `captureMethod` (Enum: `AUTOMATED_INGESTION`, `DOCUMENT_OCR`, `ANALYST_MANUAL_ENTRY`, `EXTERNAL_API`).
  * `confidence` (Number: 0.0 - 1.0): Provenance confidence level.
  * `validationStatus` (Enum: `VERIFIED`, `UNVERIFIED`, `DISPUTED`, `CONFLICTING`).
  * `effectiveDate` (ISO-8601 Date).
  * `conflictNotes` (String, nullable).

## 5. Alias (AM-03)
* `id` (UUID, PK): Unique alias identifier.
* `subjectId` (UUID, FK): Linked subject.
* `aliasName` (String): Alternative name string.
* `aliasType` (Enum: `FORMER_NAME`, `LOCAL_SCRIPT`, `TRANSLITERATION`, `INITIALS`, `ABBREVIATION`, `MAIDEN_NAME`, `TRADING_NAME`, `LEGAL_NAME`, `COMMON_NAME`, `ENTITY_SUFFIX_VARIATION`, `ANALYST_ADDED`, `AI_SUGGESTED`).
* `state` (Enum: `SOURCED`, `GENERATED`, `ANALYST_ADDED`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `RETIRED`): Lifecycle state.
* `script` (String): Language/script code (e.g. `LATN`, `CYRL`, `ARAB`, `HANI`).
* `source` (String): Where alias originated (e.g., `REGISTRY_FILING`, `GEMINI_TRANSLITERATION_MODEL`, `ANALYST_INPUT`).
* `confidence` (Number): Model or source confidence rating.
* `approvedBy` (UUID / String, nullable): Human reviewer who approved alias for screening.
* `approvedAt` (ISO-8601 UTC, nullable).

## 6. Policy & PolicyRule (AM-05)
* `Policy`:
  * `id` (UUID, PK): Policy identifier.
  * `name` (String): Descriptive policy title.
  * `activeVersionId` (UUID): Current in-force version.
* `PolicyVersion`:
  * `id` (UUID, PK): Version identifier.
  * `versionNumber` (String): Semantic version (e.g., `2.4.0`).
  * `effectiveFrom` (ISO-8601 UTC).
  * `status` (Enum: `DRAFT`, `PUBLISHED`, `ARCHIVED`).
* `PolicyRule`:
  * `id` (UUID, PK): Rule identifier (e.g. `RULE-UBO-25`, `RULE-HIGH-RISK-DIRECTORS`).
  * `policyVersionId` (UUID, FK).
  * `triggerCondition` (Object): Predicates (client type, relationship, ownership %, country tier).
  * `mandatedActions` (Array): Mandatory screening obligation, required source categories, search depth.

## 7. SearchConfiguration & SearchPlan (AM-04)
* `id` (UUID, PK): Unique configuration identifier.
* `name` (String): Configuration preset title.
* `version` (String): Semantic version (e.g. `1.2.0`).
* `jurisdictions` (Array of ISO country codes).
* `sourceCategories` (Array of Enums: `REGULATORY_ENFORCEMENT`, `GOVERNMENT_GAZETTES`, `COURT_RECORDS`, `LICENSED_NEWS`, `INVESTIGATIVE_MEDIA`, `INTERNAL_WATCHLISTS`).
* `eventCategories` (Array of Enums: `BRIBERY_CORRUPTION`, `FINANCIAL_CRIME_FRAUD`, `TERRORIST_FINANCING`, `NARCOTICS_TRAFFICKING`, `SANCTIONS_EVASION`, `ORGANIZED_CRIME`, `TAX_EVASION`, `ENVIRONMENTAL_CRIME`).
* `languages` (Array of ISO language codes).
* `keywords` (Array of Strings).
* `allowedDomains` (Array of Strings): Server-enforced domain allowlist.
* `excludedDomains` (Array of Strings): Explicit domain exclusion list.
* `dateRangeMonths` (Number): E.g., 60 (5 years) or 120 (10 years).
* `searchDepth` (Enum: `STANDARD`, `ENHANCED`, `DEEP_FORENSIC`).
* `maxResultsPerSource` (Number): Limit on retrieved articles.

## 8. SourceConnector & CoverageOutcome (AM-06)
* `SourceConnector`:
  * `id` (String, PK): Connector ID (e.g. `CONN-REGULATORY-FEED`, `CONN-GLOBAL-MEDIA-ARCHIVE`, `CONN-COURTS-DB`).
  * `name` (String): Connector title.
  * `category` (Enum: `REGULATORY`, `GOVERNMENT`, `COURT`, `LICENSED_MEDIA`, `INTERNAL`).
  * `status` (Enum: `ACTIVE`, `DEGRADED`, `CIRCUIT_OPEN`, `MAINTENANCE`).
  * `rateLimitPerMin` (Number).
  * `circuitBreakerThreshold` (Number of consecutive errors).
  * `lastHealthCheck` (ISO-8601 UTC).
* `CoverageOutcome`:
  * `id` (UUID, PK): Coverage record identifier.
  * `screeningRunId` (UUID, FK).
  * `connectorId` (String, FK).
  * `status` (Enum: `SUCCESS`, `PARTIAL_SUCCESS`, `FAILED`, `SKIPPED`).
  * `articlesRetrieved` (Number).
  * `executionDurationMs` (Number).
  * `errorMessage` (String, nullable).
  * `retryCount` (Number).

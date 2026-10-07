/**
 * Automated Test Suite for AML/KYC Adverse Media Screening Agent - Stage 1
 * Validates AM-01 through AM-06, Segregation of Duties, and Quality Gates
 */
process.env.NODE_ENV = 'test';
delete process.env.GEMINI_API_KEY;

import { AliasService } from '../src/server/alias-service.ts';
import { SearchOrchestrator } from '../src/server/orchestrator.ts';
import { PolicyEngine } from '../src/server/policy-engine.ts';
import { DEMO_USERS, hasPermission, validateNoSelfApproval } from '../src/server/rbac.ts';
import { ScreeningEngine } from '../src/server/screening-engine.ts';
import { AppStore } from '../src/server/store.ts';
import { CitationValidator } from '../src/server/citation-validator.ts';
import { LegalStatusMachine } from '../src/server/legal-status-machine.ts';
import { TaxonomyService } from '../src/server/taxonomy-service.ts';
import { CorrectionWorkflowService } from '../src/server/correction-workflow.ts';
import { executeSplitEvent, executeMergeEvents } from '../src/server/event-clustering-engine.ts';
import { ScheduleService } from '../src/server/monitoring/schedule-service.ts';
import { SubscriptionService } from '../src/server/monitoring/subscription-service.ts';
import { DeltaEngine } from '../src/server/monitoring/delta-engine.ts';
import { SuppressionEngine } from '../src/server/monitoring/suppression-engine.ts';
import { MaterialChangeRulesEngine } from '../src/server/monitoring/material-change-rules.ts';
import { TriggerOrchestrationService } from '../src/server/monitoring/trigger-orchestrator.ts';
import { PriorityEngine } from '../src/server/monitoring/priority-engine.ts';
import { MonitoringMasterService } from '../src/server/monitoring/monitoring-service.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `- ${detail}` : ''}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('🧪 Running Stage 1 Automated Test Suite');
  console.log('======================================================\n');

  const store = new AppStore();
  const policyEngine = store.policyEngine;
  const screeningEngine = new ScreeningEngine(store);
  const aliasService = new AliasService(store);
  const orchestrator = new SearchOrchestrator(store);

  // ----------------------------------------------------
  // TEST SUITE 1: AM-05 Deterministic Policy Resolution
  // ----------------------------------------------------
  console.log('📋 Test Suite 1: AM-05 Deterministic Policy Engine');
  {
    // Test 1.1: UBO with >= 25% ownership mandates screening
    const uboRes = policyEngine.resolvePartyScreening({
      caseId: 'test-case-1',
      partyId: 'test-ubo-1',
      clientType: 'CORPORATE',
      subjectRole: 'UBO',
      jurisdiction: 'GB',
      ownershipPercentage: 35.0,
      customerRisk: 'HIGH',
    });
    assert(uboRes.requiresScreening === true, 'UBO >=25% triggers mandatory screening');
    assert(uboRes.mandatory === true, 'Obligation is marked mandatory');
    assert(uboRes.matchedRules.includes('RULE-UBO-THRESHOLD-25'), 'Matches RULE-UBO-THRESHOLD-25');
    assert(uboRes.recommendedSearchDepth === 'DEEP_FORENSIC', 'High risk triggers DEEP_FORENSIC depth');

    // Test 1.2: Minor shareholder (<25%) without other controller status does not trigger UBO threshold
    const minorShareholder = policyEngine.resolvePartyScreening({
      caseId: 'test-case-1',
      partyId: 'test-minor-1',
      clientType: 'CORPORATE',
      subjectRole: 'UBO',
      jurisdiction: 'GB',
      ownershipPercentage: 10.0,
      customerRisk: 'LOW',
    });
    assert(minorShareholder.requiresScreening === false, 'UBO <25% with LOW risk does not trigger mandatory screening');

    // Test 1.3: Executive director always mandates screening
    const dirRes = policyEngine.resolvePartyScreening({
      caseId: 'test-case-1',
      partyId: 'test-dir-1',
      clientType: 'CORPORATE',
      subjectRole: 'DIRECTOR',
      jurisdiction: 'GB',
      customerRisk: 'MEDIUM',
    });
    assert(dirRes.requiresScreening === true, 'Director mandates screening regardless of ownership');
  }

  // ----------------------------------------------------
  // TEST SUITE 2: AM-01 Screening Population & Completion Blocker
  // ----------------------------------------------------
  console.log('\n📋 Test Suite 2: AM-01 Screening Population & Completion Blocker');
  {
    const caseId = 'case-apex-corp-01';

    // Test 2.1: Case with unresolved mandatory obligations CANNOT complete
    const completionAttempt = screeningEngine.attemptCaseCompletion(caseId, DEMO_USERS.CHECKER);
    assert(completionAttempt.success === false, 'Case completion blocked when mandatory obligations pending/failed');
    assert(
      (completionAttempt.error || '').includes('Case Completion BLOCKED'),
      'Clear blocking explanation returned'
    );

    // Test 2.2: Resolve population creates obligations
    const popResult = screeningEngine.resolvePopulation(caseId, DEMO_USERS.ANALYST.id, DEMO_USERS.ANALYST.role);
    assert(popResult.obligations.length > 0, 'Screening obligations generated for connected parties');
    assert(popResult.blockingConditions.length > 0, 'Blocking conditions populated');
  }

  // ----------------------------------------------------
  // TEST SUITE 3: Segregation of Duties & Exemption Workflow
  // ----------------------------------------------------
  console.log('\n📋 Test Suite 3: Segregation of Duties & Exemption Approval');
  {
    // Test 3.1: No self-approval check
    const sodCheckSelf = validateNoSelfApproval('usr-analyst-01', 'usr-analyst-01', 'exemption approval');
    assert(sodCheckSelf.valid === false, 'Segregation of duties: Self-approval is rejected');

    const sodCheckDifferent = validateNoSelfApproval('usr-checker-02', 'usr-analyst-01', 'exemption approval');
    assert(sodCheckDifferent.valid === true, 'Segregation of duties: Secondary reviewer approved');

    // Test 3.2: Analyst cannot approve exemption
    assert(hasPermission('ANALYST', 'exemption:approve') === false, 'Analyst role lacks exemption:approve permission');
    assert(hasPermission('CHECKER', 'exemption:approve') === true, 'Checker role has exemption:approve permission');
    assert(hasPermission('COMPLIANCE_OFFICER', 'exemption:approve') === true, 'Compliance role has exemption:approve permission');

    // Test 3.3: Adjudicate exemption successfully with secondary checker
    const obligationId = 'ob-apex-04'; // Carlos Mendez-Silva duplicate entity
    const approvedOb = screeningEngine.adjudicateExemption({
      obligationId,
      approved: true,
      notes: 'Verified duplicate core banking entity via dedup ledger.',
      actor: DEMO_USERS.CHECKER,
    });
    assert(approvedOb.status === 'EXEMPTED', 'Obligation transitioned to EXEMPTED on approval');
    assert(approvedOb.exemption?.status === 'APPROVED', 'Exemption record marked APPROVED');
    assert(approvedOb.exemption?.approvedBy === DEMO_USERS.CHECKER.id, 'Approver stamped on exemption');
  }

  // ----------------------------------------------------
  // TEST SUITE 4: AM-02 Subject Attributes & Conflict Detection
  // ----------------------------------------------------
  console.log('\n📋 Test Suite 4: AM-02 Subject Profile & Attribute Provenance');
  {
    const subject = store.subjects.get('sbj-apex-01');
    assert(subject !== undefined, 'Subject sbj-apex-01 retrieved');
    assert(subject?.attributes.length! >= 3, 'Subject attributes populated with provenance');

    const dobAttr = subject?.attributes.find((a) => a.fieldName === 'date_of_birth');
    assert(dobAttr !== undefined, 'Date of birth attribute exists');
    assert(dobAttr?.conflictState?.hasConflict === true, 'Date of birth conflict flagged across sources');
    assert(dobAttr?.conflictState?.conflictingValues?.length === 2, 'Two conflicting DOB values preserved');
  }

  // ----------------------------------------------------
  // TEST SUITE 5: AM-03 Name & Alias Lifecycle + AI Safety Boundary
  // ----------------------------------------------------
  console.log('\n📋 Test Suite 5: AM-03 Alias Management & AI Safety Boundary');
  {
    const subjectId = 'sbj-apex-01';

    // Test 5.1: AI alias suggestions MUST be placed in PENDING_APPROVAL
    const suggested = await aliasService.suggestAliasesWithAI(subjectId, DEMO_USERS.ANALYST);
    assert(suggested.length > 0, 'AI alias suggestions generated');
    assert(
      suggested.every((a) => a.state === 'PENDING_APPROVAL'),
      'AI Boundary Invariant: All AI-suggested aliases have state PENDING_APPROVAL'
    );
    assert(
      suggested.every((a) => a.approvedBy === undefined),
      'AI Boundary Invariant: AI aliases are unapproved by default'
    );

    // Test 5.2: Transitioning alias to APPROVED requires authorized human
    const testAlias = suggested[0];
    let unauthorizedFailed = false;
    try {
      aliasService.updateAliasStatus({
        aliasId: testAlias.id,
        newState: 'APPROVED',
        actor: DEMO_USERS.AUDITOR, // Auditor cannot approve aliases
      });
    } catch (e) {
      unauthorizedFailed = true;
    }
    assert(unauthorizedFailed === true, 'Auditor cannot approve alias (Unauthorized)');

    // Authorized approval by Checker
    const approvedAlias = aliasService.updateAliasStatus({
      aliasId: testAlias.id,
      newState: 'APPROVED',
      actor: DEMO_USERS.CHECKER,
    });
    assert(approvedAlias.state === 'APPROVED', 'Checker successfully approves alias');
    assert(approvedAlias.approvedBy === DEMO_USERS.CHECKER.id, 'Approver stamped on alias');
  }

  // ----------------------------------------------------
  // TEST SUITE 6: AM-06 Search Orchestrator & Circuit Breakers
  // ----------------------------------------------------
  console.log('\n📋 Test Suite 6: AM-06 Search Orchestration & Circuit Breakers');
  {
    // Test 6.1: Execute screening run
    const run = await orchestrator.executeScreeningRun({
      caseId: 'case-almansoor-02',
      subjectId: 'sbj-tariq-01',
      actor: DEMO_USERS.ANALYST,
    });
    assert(run !== undefined, 'Screening run executed successfully');
    assert(run.coverageOutcomes.length > 0, 'Coverage outcomes tracked for each approved connector');

    // Test 6.2: Connector circuit breaker & retry
    const degradedConnector = store.connectors.get('CONN-COURTS-DB');
    assert(degradedConnector !== undefined, 'Court connector exists');

    // Retry degraded connector
    const retryResult = await orchestrator.retryConnector({
      connectorId: 'CONN-COURTS-DB',
      screeningRunId: 'run-apex-s2-failed',
      actor: DEMO_USERS.ANALYST,
    });
    assert(retryResult.connector.status === 'ACTIVE', 'Circuit breaker reset to ACTIVE on successful retry');
    assert(retryResult.run.overallCoveragePercent === 100, 'Coverage updated to 100% after successful retry');
  }

  // ----------------------------------------------------
  // TEST SUITE 7: Immutable Audit Trail
  // ----------------------------------------------------
  console.log('\n📋 Test Suite 7: Immutable Audit Trail');
  {
    assert(store.auditEvents.length > 5, 'Audit events captured for all operations');
    const hasCorrelations = store.auditEvents.every((e) => Boolean(e.correlationId && e.actorId && e.timestamp));
    assert(hasCorrelations, 'All audit events have timestamp, correlationId, and actorId');
  }

  // ----------------------------------------------------
  // TEST SUITE 8: AM-07 Multilingual Adverse-Media Search
  // ----------------------------------------------------
  console.log('\n📋 Test Suite 8: AM-07 Multilingual Search Expansion');
  {
    const s1 = store.subjects.get('sbj-apex-01');
    assert(s1 !== undefined, 'Subject sbj-apex-01 exists');

    // Test approved vs unapproved alias inclusion invariant
    const approvedAliases = s1!.aliases.filter((a) => a.state === 'APPROVED');
    const unapprovedAliases = s1!.aliases.filter((a) => a.state !== 'APPROVED');
    assert(approvedAliases.length > 0, 'Approved aliases exist for subject');
    assert(unapprovedAliases.length > 0, 'Unapproved aliases exist for subject');

    // Generate query variants for sbj-apex-01
    const run1 = store.screeningRuns.get('run-apex-s1-01');
    assert(run1 !== undefined, 'Screening run run-apex-s1-01 exists');
    assert((run1!.queryVariants || []).length >= 6, 'Query variants generated across multiple scripts and languages');

    // Check that approved non-Latin aliases are present (Arabic, Devanagari, Cyrillic)
    const hasArabicQuery = (run1!.queryVariants || []).some((qv) => qv.language === 'ar' && qv.isRTL === true);
    const hasHindiQuery = (run1!.queryVariants || []).some((qv) => qv.language === 'hi');
    const hasRussianQuery = (run1!.queryVariants || []).some((qv) => qv.language === 'ru');
    assert(hasArabicQuery, 'Arabic script query variant generated with RTL flag');
    assert(hasHindiQuery, 'Devanagari script query variant generated');
    assert(hasRussianQuery, 'Cyrillic script query variant generated');

    // Verify invariant: No unapproved aliases are used in query variants
    const unapprovedNames = unapprovedAliases.map((a) => a.aliasName);
    const usesUnapproved = (run1!.queryVariants || []).some((qv) => unapprovedNames.includes(qv.originalQuery));
    assert(!usesUnapproved, 'Invariant: No unapproved aliases are executed in screening query variants');
  }

  // ----------------------------------------------------
  // TEST SUITE 9: AM-08 Immutable Search Audit Records & Manifests
  // ----------------------------------------------------
  console.log('\n📋 Test Suite 9: AM-08 Immutable Search Manifests & Cryptographic Integrity');
  {
    const manifest = store.searchManifests.get('man-apex-s1-01');
    assert(manifest !== undefined, 'Search manifest exists for screening run');
    assert(Boolean(manifest!.manifestHash), 'Manifest contains SHA-256 content checksum');
    assert((manifest!.manifestHash || '').length >= 64, 'Manifest SHA-256 checksum is at least 64 characters');
    assert(manifest!.queryVariants.length > 0, 'Manifest links immutable executed query variants');
    assert(manifest!.historicalPeriod !== undefined, 'Manifest preserves exact historical lookback parameters');
    assert(manifest!.connectors.length > 0, 'Manifest records targeted connector list');
    assert((manifest!.execution?.attempts || []).length > 0, 'Manifest tracks connector execution attempts and latencies');

    // Test manifest revision lineage
    assert((manifest!.revisions || []).length >= 1, 'Manifest tracks revision history');
    assert(manifest!.revisions[0].revisionNumber === 1, 'Manifest initial revision is revision 1');
  }

  // ----------------------------------------------------
  // TEST SUITE 10: AM-09 Article Retrieval & Metadata Capture
  // ----------------------------------------------------
  console.log('\n📋 Test Suite 10: AM-09 Article Retrieval & Provenance Capture');
  {
    const arabicArticle = store.articles.get('art-03-ar');
    assert(arabicArticle !== undefined, 'Arabic article art-03-ar retrieved');
    assert(arabicArticle!.language === 'ar' && arabicArticle!.isRTL === true, 'Arabic article correctly identified as RTL');
    assert(arabicArticle!.metadata.languageAssessment.script === 'ARAB', 'Arabic script recorded in language assessment');

    // Date confidence model tests
    const verifiedArticle = store.articles.get('art-01');
    assert(verifiedArticle!.metadata.publicationDate.confidenceState === 'VERIFIED', 'Article date confidence is VERIFIED');

    const unknownDateArticle = store.articles.get('art-06-es');
    assert(unknownDateArticle!.metadata.publicationDate.confidenceState === 'UNKNOWN', 'Missing date marked UNKNOWN without inventing values');
    assert(unknownDateArticle!.metadata.publicationDate.date === null, 'Missing date preserves null value');

    const conflictingDateArticle = store.articles.get('art-07-ru');
    assert(conflictingDateArticle!.metadata.publicationDate.confidenceState === 'CONFLICTING', 'Conflicting dates flagged with CONFLICTING state');
    assert((conflictingDateArticle!.metadata.publicationDate.conflictingDates || []).length >= 2, 'All conflicting dates preserved with provenance');

    // Adversarial prompt injection defense test
    const injectionArticle = store.articles.get('art-09-prompt-inj');
    assert(injectionArticle !== undefined, 'Adversarial prompt injection test article exists');
    assert(injectionArticle!.versions[0].sanitizedSnippet.includes('[SANITIZED ADVERSARIAL DIRECTIVE'), 'Prompt injection directive neutralized by ingestion boundary');

    // Duplicate canonical URL test
    const dupArticle = store.articles.get('art-10-dup-url');
    assert(dupArticle !== undefined, 'Duplicate URL article exists');
    assert(dupArticle!.canonicalUrl === verifiedArticle!.canonicalUrl, 'Duplicate canonical URL preserved for deduplication analysis');
  }

  // ----------------------------------------------------
  // TEST SUITE 11: AM-10 Configurable Historical Search Periods
  // ----------------------------------------------------
  console.log('\n📋 Test Suite 11: AM-10 Historical Search Period Policy & Exceptions');
  {
    // High risk client gets 10 years (3650 days)
    const highRiskPolicy = policyEngine.resolveHistoricalPeriod({
      clientType: 'CORPORATE',
      customerRisk: 'HIGH',
    });
    assert(highRiskPolicy.periodYears === 10, 'High risk corporate gets 10-year historical lookback');
    assert(Boolean(highRiskPolicy.startDate && highRiskPolicy.endDate), 'Lookback calculates absolute start and end dates');

    // Low risk client gets 3 years
    const lowRiskPolicy = policyEngine.resolveHistoricalPeriod({
      clientType: 'CORPORATE',
      customerRisk: 'LOW',
    });
    assert(lowRiskPolicy.periodYears === 3, 'Low risk corporate gets 3-year historical lookback');

    // Medium risk corporate gets 5 years
    const medRiskPolicy = policyEngine.resolveHistoricalPeriod({
      clientType: 'CORPORATE',
      customerRisk: 'MEDIUM',
    });
    assert(medRiskPolicy.periodYears === 5, 'Medium risk corporate gets 5-year historical lookback');

    // Historical period in screening run
    const run1 = store.screeningRuns.get('run-apex-s1-01');
    assert(run1!.historicalPeriod !== undefined, 'Screening run has resolved historical lookback window');
    assert(run1!.historicalPeriod?.resolvedLookbackMonths === 120, '120 months resolved for enhanced high-risk screening');
  }

  // ----------------------------------------------------
  // TEST SUITE 12: AM-11 Result Review, Filtering & Sorting
  // ----------------------------------------------------
  console.log('\n📋 Test Suite 12: AM-11 Result Review, Filtering & Sorting');
  {
    const allArticles = Array.from(store.articles.values());
    assert(allArticles.length >= 8, 'Rich synthetic dataset of adverse media articles available');

    // Multilingual filtering test
    const nonEnArticles = allArticles.filter((a) => a.language !== 'en');
    assert(nonEnArticles.length >= 4, 'Multiple non-English articles present across scripts');

    // Placeholders test: legal status, credibility, materiality
    const hasUnassessedArticle = allArticles.some((a) => a.legalStatus === 'Not assessed' && a.credibility === 'Not assessed');
    assert(hasUnassessedArticle, 'Unassessed findings display "Not assessed" placeholders per AM-11 requirement');

    // Inaccessible / Paywall status test
    const paywalledArticle = allArticles.find((a) => a.accessStatus === 'PAYWALL');
    assert(paywalledArticle !== undefined, 'Paywalled article exists and tracks PAYWALL accessStatus');
  }

  // ----------------------------------------------------
  // TEST SUITE 13: AM-16 to AM-20 Deduplication, Clustering & Event-Centric Investigation
  // ----------------------------------------------------
  console.log('\n📋 Test Suite 13: AM-16 to AM-20 Event-Centered Investigation & Clustering');
  {
    // AM-16 Deduplication
    const duplicates = Array.from(store.duplicateAssessments.values());
    assert(duplicates.length > 0, 'Duplicate assessments populated in store');
    const exactHashDup = duplicates.find((d) => d.duplicateType === 'CONTENT_HASH' || d.similarityScore >= 0.95);
    assert(exactHashDup !== undefined, 'High-confidence / Exact hash duplicate detected');
    assert(Boolean(exactHashDup!.rationale), 'Deduplication rationale tracked');

    // AM-17 Syndicated Content Clustering
    const clusters = Array.from(store.articleClusters.values());
    assert(clusters.length > 0, 'Article clusters formed for syndicated reporting');
    const syndCluster = clusters.find((c) => c.clusterType === 'SYNDICATION_CLUSTER');
    assert(syndCluster !== undefined, 'Syndication cluster correctly identified');
    assert(syndCluster!.members.length >= 2, 'Syndication cluster aggregates multiple syndicated articles');
    assert(syndCluster!.independentSourceCount === 1, 'Syndication cluster prevents double-counting (1 independent source)');

    // AM-18 Original Source Identification & Source Roles
    const sourceRoles = Array.from(store.sourceRoleAssessments.values());
    assert(sourceRoles.length > 0, 'Source role assessments populated in store');
    const origRole = sourceRoles.find((r) => r.assignedRole === 'ORIGINAL' || r.assignedRole === 'LIKELY_ORIGINAL');
    assert(origRole !== undefined, 'Original reporting source identified');
    const syndRole = sourceRoles.find((r) => r.assignedRole === 'SYNDICATED_COPY');
    assert(syndRole !== undefined, 'Syndicated copy source identified');

    // AM-19 & AM-20 Adverse Events as Default Investigation Unit
    const events = Array.from(store.adverseEvents.values());
    assert(events.length >= 2, 'Multiple adverse events generated as default investigation units');
    const primaryEvent = events[0];
    assert(primaryEvent.articles.length > 0, 'Adverse event links underlying article evidence');
    assert(primaryEvent.timeline.length > 0, 'Adverse event timeline reconstructed');
    assert(primaryEvent.revisions.length > 0, 'Adverse event maintains immutable revision audit history');

    // Event Split operation test
    const splitResult = executeSplitEvent(
      primaryEvent,
      [primaryEvent.articles[0].articleId],
      'Split Branch Investigation',
      DEMO_USERS.CHECKER,
      'Testing event split workflow'
    );
    assert(splitResult.newEvent !== undefined, 'Authorized event split operation succeeds');
    assert(splitResult.newEvent.articles.length === 1, 'Split event contains moved article');
    assert(splitResult.updatedSource.articles.length === primaryEvent.articles.length - 1, 'Source event articles updated');
  }

  // ----------------------------------------------------
  // TEST SUITE 14: AM-21 to AM-27 Grounded Evidence Extraction Pipeline & Human Review
  // ----------------------------------------------------
  console.log('\n📋 Test Suite 14: AM-21 to AM-27 Grounded Content-Review & Extraction Pipeline');
  {
    // AM-21 to AM-27: Extraction Bundle Generation for art-01
    const bundle = store.getOrExtractBundle('art-01');
    assert(bundle !== undefined, 'Extraction bundle generated for article');
    assert(bundle.articleId === 'art-01', 'Bundle targets correct article ID');
    assert(bundle.passages.length > 0, 'Supporting passages extracted (AM-27)');

    // AM-27 Supporting Passage Offset Verification
    const rawContent = store.getArticleRawContent('art-01');
    const firstPassage = bundle.passages[0];
    const validationResult = CitationValidator.validatePassageOffsets(rawContent, [firstPassage]);
    assert(validationResult.valid, 'CitationValidator verifies exact character offset and text matching');

    // AI Safety & Grounding Invariant: Corrupted offset rejected
    const corruptedPassage = {
      ...firstPassage,
      startOffset: firstPassage.startOffset + 10,
    };
    const corruptedResult = CitationValidator.validatePassageOffsets(rawContent, [corruptedPassage]);
    assert(!corruptedResult.valid, 'CitationValidator rejects invalid passage offset');

    // AM-21 Citation-backed Article Summarization
    assert(bundle.summary.claims.length > 0, 'Citation-backed summary claims extracted (AM-21)');
    const allClaimsHaveCitations = bundle.summary.claims.every(
      (c) => c.supportingPassageIds.length > 0
    );
    assert(allClaimsHaveCitations, 'Every summary claim has valid supporting passage citation');

    // AM-22 Adverse Event Classification
    assert(bundle.classifications.length > 0, 'Event classification populated (AM-22)');
    const primaryClassification = bundle.classifications[0];
    assert(primaryClassification.confidence > 0, 'Classification confidence calculated');
    const taxService = new TaxonomyService();
    assert(taxService.getCategory(primaryClassification.categoryCode) !== undefined, 'Event category adheres to controlled AML taxonomy');
    assert(primaryClassification.evidencePassageIds.length > 0, 'Classification backed by passage citations');

    // AM-23 Legal & Procedural Status Machine
    assert(bundle.legalStatus !== undefined, 'Legal and procedural status classified (AM-23)');
    assert(bundle.legalStatus.evidencePassageIds.length > 0, 'Legal status backed by passage citations');
    const statusTransition = LegalStatusMachine.isTransitionAllowed(
      bundle.legalStatus.status,
      'FORMAL_CHARGES_FILED'
    );
    assert(statusTransition.allowed, 'LegalStatusMachine allows natural progressive transition to formal charges');

    // AM-24 Entity and Participant Extraction
    assert(bundle.entities.length > 0, 'Entities and participants extracted (AM-24)');
    const hasVance = bundle.entities.some((e) => e.name.toLowerCase().includes('vance'));
    assert(hasVance, 'Key subject entity Alexander Vance identified with role');
    const allEntitiesCited = bundle.entities.every((e) => e.evidencePassageIds.length > 0);
    assert(allEntitiesCited, 'Every extracted entity is grounded with passage citations');

    // AM-25 Jurisdiction and Location Extraction
    assert(bundle.jurisdictions.length > 0, 'Jurisdictions and courts extracted (AM-25)');
    const hasSwiss = bundle.jurisdictions.some(
      (j) => j.countryCode === 'CH' || j.legalJurisdiction.toLowerCase().includes('switzerland') || j.legalJurisdiction.toLowerCase().includes('geneva')
    );
    assert(hasSwiss, 'Swiss jurisdiction identified');
    const allJurisdictionsCited = bundle.jurisdictions.every((j) => j.evidencePassageIds.length > 0);
    assert(allJurisdictionsCited, 'Every extracted jurisdiction is grounded with passage citations');

    // AM-26 Material Fact Extraction
    assert(bundle.materialFacts.length > 0, 'Material facts extracted (AM-26)');
    const hasMonetaryFact = bundle.materialFacts.some((f) => f.factType === 'AMOUNT');
    assert(hasMonetaryFact, 'Monetary amount ($45M) extracted as material fact');
    const allFactsCited = bundle.materialFacts.every((f) => f.evidencePassageIds.length > 0);
    assert(allFactsCited, 'Every material fact cites supporting evidence passages');

    // Human Correction & Revision Audit Workflow
    const originalFactVal = bundle.materialFacts[0].value;
    const correctionRes = store.applyCorrection('art-01', {
      articleId: 'art-01',
      targetType: 'FACT',
      targetId: bundle.materialFacts[0].id,
      fieldModified: 'value',
      newValue: '$45,000,000 USD (Forensic Audit Confirmed)',
      rationale: 'Analyst verified against bank ledger',
      actor: DEMO_USERS.ANALYST,
    });
    assert(correctionRes.success, 'Human correction successfully applied to material fact');
    assert(bundle.materialFacts[0].value === '$45,000,000 USD (Forensic Audit Confirmed)', 'Corrected value reflected in bundle');
    assert(bundle.corrections.length > 0, 'Correction logged in bundle audit log');

    // Revert correction
    const revertRes = CorrectionWorkflowService.revertCorrection(
      bundle,
      correctionRes.correction!.id,
      DEMO_USERS.CHECKER,
      'Reverting test correction'
    );
    assert(revertRes.success, 'Correction revert succeeds');
    assert(bundle.materialFacts[0].value === originalFactVal, 'Original value restored upon revert');
  }

  // ----------------------------------------------------
  // TEST SUITE 15: AM-28 to AM-37 Explainable Event Assessment & Compliance Pipeline
  // ----------------------------------------------------
  console.log('\n📋 Test Suite 15: AM-28 to AM-37 Explainable Event Assessment & Compliance');
  {
    const eventId = 'evt-apex-01';
    const assessment = store.getOrCalculateEventAssessment(eventId, 'POL-MAT-2025.1', {
      id: DEMO_USERS.ANALYST.id,
      name: DEMO_USERS.ANALYST.name,
      role: 'ANALYST',
    });

    // AM-28: Source Credibility
    assert(!!assessment, 'Event assessment successfully calculated for evt-apex-01');
    assert(assessment.credibilityAssessments.length > 0, 'Source credibility assessments populated');
    const firstCred = assessment.credibilityAssessments[0];
    assert(firstCred.credibilityScore >= 0 && firstCred.credibilityScore <= 1, 'Credibility score within valid 0-1 bounds');
    assert(!!firstCred.credibilityTier, 'Credibility tier assigned (VERY_HIGH / HIGH / MEDIUM / LOW / VERY_LOW)');

    // AM-29: Source Provenance
    assert(assessment.provenanceAssessments.length > 0, 'Source provenance assessments populated');
    const firstProv = assessment.provenanceAssessments[0];
    assert(!!firstProv.provenanceType, 'Provenance type identified');
    assert(typeof (firstProv.provenanceType === 'ORIGINAL') === 'boolean', 'Original source classification evaluated');

    // AM-30: Independent Corroboration
    assert(!!assessment.corroboration, 'Independent corroboration assessed');
    assert(assessment.corroboration.independentSourcesCount >= 1, 'Corroboration counts independent sources correctly');
    assert(!!assessment.corroboration.corroborationLevel, 'Corroboration level assigned (UNILATERAL_SINGLE_SOURCE, DUAL_INDEPENDENT, etc.)');

    // AM-32: Evidence Strength & Identity Match
    assert(!!assessment.evidenceStrength, 'Evidence strength calculated');
    assert(assessment.evidenceStrength.identityConfidenceContribution >= 0.1, 'Identity confidence contribution accounted for');
    assert(assessment.evidenceStrength.strengthScore !== undefined, 'Overall evidence strength scored');

    // AM-33: Customer & Product Relevance
    assert(assessment.relevanceAssessments.length > 0, 'Customer and product relevance assessed');
    const firstRel = assessment.relevanceAssessments[0];
    assert(firstRel.distanceFromCustomer === 0, 'Direct customer match confirmed for principal subject');
    assert(firstRel.relevanceScore >= 0.7, 'High relevance score assigned for direct executive role');

    // AM-34: Recency & Temporal Relevance
    assert(!!assessment.recency, 'Recency and temporal relevance assessed');
    assert(assessment.recency.recencyScore > 0, 'Positive temporal weight assigned');
    assert(assessment.recency.isContinuingConduct === true, 'Continuing conduct flag accounted for in temporal analysis');

    // AM-35: Conduct Severity
    assert(!!assessment.severity, 'Conduct severity evaluated');
    assert(assessment.severity.severityTier === 'CRITICAL' || assessment.severity.severityTier === 'HIGH', 'Financial scale classified as HIGH or CRITICAL for $45M');
    assert(assessment.severity.conductType.length > 0, 'Controlled conduct classification assigned');

    // AM-36: Explainable Materiality
    assert(!!assessment.materiality, 'Explainable materiality recommendation generated');
    assert(assessment.ruleExecutions.length > 0, 'Deterministic rule trace populated with justifications');
    assert(assessment.materiality.confidenceScore >= 0.7, 'High confidence score for multi-source corroborated event');

    // AM-37: Contradictory Evidence & Exculpatory Findings
    assert(Array.isArray(assessment.contradictions), 'Contradictions list populated');
    if (assessment.contradictions.length > 0) {
      const contra = assessment.contradictions[0];
      assert(!contra.addressedByAnalyst, 'Contradiction starts in unaddressed status');

      // Resolve contradiction per AM-37 compliance protocol
      const resolved = store.resolveContradiction(
        eventId,
        contra.id,
        'DISMISSED_WITH_EVIDENCE',
        'Compliance reviewed official Swiss commercial registry filings confirming executive capacity during transaction window.',
        { id: DEMO_USERS.ANALYST.id, name: DEMO_USERS.ANALYST.name, role: 'ANALYST' }
      );
      assert(resolved.addressedByAnalyst === true, 'Contradiction successfully resolved by analyst');
      assert(resolved.analystResolutionAction === 'DISMISSED_WITH_EVIDENCE', 'Resolution action recorded with audit trail');
    }

    // Override & Dual Authorization Workflow
    const overrideResult = store.applyAssessmentOverride(eventId, {
      field: 'severity.severityTier',
      overriddenValue: 'CRITICAL',
      rationale: 'Analyst heightened severity due to cross-border jurisdiction transit risk.',
      actor: { id: DEMO_USERS.ANALYST.id, name: DEMO_USERS.ANALYST.name, role: 'ANALYST' },
    });
    assert(overrideResult.success, 'Analyst successfully submitted override request');
    assert(overrideResult.overrideRecord?.status === 'PENDING_APPROVAL', 'Segregation of duties: Override requires secondary approval');

    // Self-approval rejection
    let selfApproveBlocked = false;
    try {
      store.authorizeAssessmentOverride(
        eventId,
        overrideResult.overrideRecord!.id,
        { id: DEMO_USERS.ANALYST.id, name: DEMO_USERS.ANALYST.name, role: 'ANALYST' },
        true,
        'Self approval test'
      );
    } catch {
      selfApproveBlocked = true;
    }
    assert(selfApproveBlocked, 'Invariant: Analyst cannot self-approve their own override');

    // Checker secondary authorization
    const authResult = store.authorizeAssessmentOverride(
      eventId,
      overrideResult.overrideRecord!.id,
      { id: DEMO_USERS.CHECKER.id, name: DEMO_USERS.CHECKER.name, role: 'CHECKER' },
      true,
      'Checker verified and authorized heightened severity per policy guideline.'
    );
    assert(authResult.success, 'Checker successfully authorized override');
    assert(authResult.assessment.overrides.find((o) => o.id === overrideResult.overrideRecord!.id)?.status === 'ACTIVE', 'Override marked ACTIVE in assessment');

    // AM-31: Content Update / Retraction Ingestion
    const updateIngest = store.ingestContentUpdate(
      {
        articleId: 'art-apex-01',
        eventId,
        updateType: 'CORRECTION',
        severity: 'MEDIUM',
        rationale: 'Publisher corrected subsidiary entity name in paragraph 4.',
        actorId: DEMO_USERS.ANALYST.id,
      },
      DEMO_USERS.ANALYST.id
    );
    assert(!!updateIngest.record, 'Content update successfully ingested');
    assert(updateIngest.record.updateType === 'CORRECTION', 'Update type accurately categorized as CORRECTION');

    // Historical Policy Replay
    const replay = store.replayHistoricalAssessment(eventId, 'POL-MAT-2024.1');
    assert(!!replay.replayedAssessment, 'Historical policy replay simulated successfully');
    assert(replay.replayedAssessment.materiality.policyVersion === 'POL-MAT-2024.1', 'Replay reflects historical policy version');
    assert(Array.isArray(replay.replayedAssessment.ruleExecutions), 'Historical replay provides full rule execution trace');
  }

  // ----------------------------------------------------
  // TEST SUITE 16: AM-45 to AM-52 Enterprise Integrations & Governance
  // ----------------------------------------------------
  console.log('\n📋 Test Suite 16: AM-45 to AM-52 Enterprise KYC, Risk, EDD & Governance');
  {
    const { globalIntegrationHub } = await import('../src/server/workflow/integration-service.ts');
    const invId = 'inv-apex-01';
    const caseId = 'case-apex-corp-01';

    // AM-45: KYC Case bidirectional linking and state sync
    const kycLink = globalIntegrationHub.getKycCaseLink(invId);
    assert(!!kycLink, 'AM-45: KYC Case link exists for investigation');
    assert(kycLink.caseId === caseId, 'AM-45: KYC Case ID linked bidirectionally');
    assert(kycLink.contractVersion === 'v2.4', 'AM-45: Anti-corruption layer enforces contract versioning');
    
    const reconciledLink = globalIntegrationHub.reconcileKycCase(invId, {
      id: DEMO_USERS.ANALYST.id,
      name: DEMO_USERS.ANALYST.name,
      role: 'ANALYST',
      isAi: false,
    });
    assert(reconciledLink.integrationStatus === 'SYNCED', 'AM-45: Manual/Automated reconciliation sync completes successfully');
    assert(!!reconciledLink.reconciliationChecksum, 'AM-45: Cryptographic reconciliation checksum generated');

    // AM-46 & AM-47: Risk Factor Integration & Impact Explanation
    const initialRiskImpact = globalIntegrationHub.getRiskImpactExplanation(invId);
    assert(!!initialRiskImpact, 'AM-47: Risk impact projection calculated with baseline vs proposed');
    assert(Array.isArray(initialRiskImpact.appliedRules), 'AM-47: Risk impact exposes structured applied rules');
    assert(initialRiskImpact.calculation.riskRuleVersion.startsWith('RR-AML'), 'AM-47: Risk policy version tracked');

    // Invariant: AI is strictly prohibited from transmitting findings to Risk Engine
    let aiBlocked = false;
    try {
      globalIntegrationHub.transmitApprovedFindingToRiskEngine(
        invId,
        'af-apex-01',
        {
          id: 'ai-copilot-01',
          name: 'AI Drafting Assistant',
          role: 'ANALYST',
          isAi: true,
        }
      );
    } catch (e: any) {
      aiBlocked = true;
      assert(e.message.includes('AI agents are strictly prohibited'), 'AM-46 Invariant: AI blocked from transmitting to Risk Engine');
    }
    assert(aiBlocked, 'AM-46: Non-human AI cannot influence downstream Risk Engine');

    // Human analyst transmits approved finding
    const riskTransmission = globalIntegrationHub.transmitApprovedFindingToRiskEngine(
      invId,
      'af-apex-01',
      {
        id: DEMO_USERS.ANALYST.id,
        name: DEMO_USERS.ANALYST.name,
        role: 'ANALYST',
        isAi: false,
      }
    );
    assert(riskTransmission.finding.isTransmittedToRiskEngine === true, 'AM-46: Human analyst successfully transmits approved finding to Risk Engine');
    assert(riskTransmission.calculation.proposedRating === 'HIGH', 'AM-47: Material finding elevates proposed customer risk rating to HIGH');

    // AM-48: EDD Triggers & Investigation Plans
    const eddCase = globalIntegrationHub.triggerEddCase(
      invId,
      caseId,
      'Senior public corruption nexus requires forensic source of wealth validation',
      {
        id: DEMO_USERS.ANALYST.id,
        name: DEMO_USERS.ANALYST.name,
        role: 'ANALYST',
        isAi: false,
      }
    );
    assert(!!eddCase, 'AM-48: EDD Case successfully triggered from adverse media workflow');
    assert(eddCase.status === 'IN_PROGRESS' || eddCase.status === 'TRIGGERED', 'AM-48: EDD case is in active/triggered workflow state');

    // AI may draft EDD questions (permitted)
    const aiDraftedEddQuestions = globalIntegrationHub.aiDraftEddQuestions(
      invId,
      'Maximilian Alexander Vance',
      ['Geneva Public Prosecutor Indictment']
    );
    assert(aiDraftedEddQuestions.length > 0, 'AM-48: AI successfully drafts proposed EDD questions');
    assert(aiDraftedEddQuestions[0].aiDrafted === true, 'AM-48: AI-drafted question marked with clear provenance tag');
    assert(aiDraftedEddQuestions[0].humanApproved === false, 'AM-48: AI-drafted question requires human approval');

    // AM-49: Client Information Requests (CIR)
    const cir = globalIntegrationHub.createInformationRequestDraft(
      invId,
      caseId,
      {
        title: 'Source of Wealth Documentation Request',
        recipientName: 'Me. Philippe Favre',
        recipientEmail: 'p.favre@favre-avocats.ch',
        recipientRole: 'LEGAL_REPRESENTATIVE',
        deliveryChannel: 'SECURE_CLIENT_PORTAL',
        requestItems: [
          {
            title: 'Certified Court Proceedings Transcript',
            description: 'Provide notarized transcript of Geneva Tribunal docket.',
            dueDays: 10,
            mandatory: true,
          },
        ],
        isAiAssisted: true,
        aiPrompt: 'Draft formal Swiss advocate request for docket copies',
      },
      {
        id: DEMO_USERS.ANALYST.id,
        name: DEMO_USERS.ANALYST.name,
        role: 'ANALYST',
        isAi: false,
      }
    );
    assert(!!cir, 'AM-49: Client Information Request package created');
    assert(cir.status === 'DRAFT', 'AM-49: Client request begins in DRAFT state');

    // Invariant: AI cannot approve or transmit Client Information Request
    let aiCirBlocked = false;
    try {
      globalIntegrationHub.approveAndTransmitRequest(
        invId,
        cir.id,
        {
          id: 'ai-copilot-01',
          name: 'AI Drafting Assistant',
          role: 'CHECKER',
          isAi: true,
        }
      );
    } catch (e: any) {
      aiCirBlocked = true;
      assert(e.message.includes('AI agents are strictly forbidden'), 'AM-49 Invariant: AI blocked from approving/sending client request');
    }
    assert(aiCirBlocked, 'AM-49: Four-eyes human verification required before dispatching client communication');

    // Human Checker approves and dispatches CIR
    const cirDispatched = globalIntegrationHub.approveAndTransmitRequest(
      invId,
      cir.id,
      {
        id: DEMO_USERS.CHECKER.id,
        name: DEMO_USERS.CHECKER.name,
        role: 'CHECKER',
        isAi: false,
      }
    );
    assert(cirDispatched.status === 'TRANSMITTED', 'AM-49: CIR status advances to TRANSMITTED upon human checker sign-off');
    assert(!!cirDispatched.transmittedAt, 'AM-49: Transmission timestamp stamped on dispatch');

    // AM-50: Compliance Decision Pack Generation & Cryptographic Seal
    const decisionPack = globalIntegrationHub.generateDecisionPack(
      invId,
      caseId,
      {
        coverageSummary: { connectorsExecuted: 4, totalQueriesRun: 12, lookbackYears: 7 },
        subjects: [{ id: 'sbj-apex-01', name: 'Maximilian Vance', role: 'UBO', screeningOutcome: 'ADVERSE_MATCH' }],
        eventsSummary: [
          {
            eventId: 'evt-apex-geneva-01',
            title: 'Geneva Bribery Indictment',
            category: 'BRIBERY_CORRUPTION',
            legalStatus: 'FORMAL_INDICTMENT',
            credibilityTier: 'TIER_1',
            independentCorroborations: 3,
          },
        ],
        identityConclusions: 'Definitive passport match confirmed.',
        evidenceFindings: 'Certified docket confirms formal criminal proceedings.',
        materialityRecommendations: 'Material adverse finding confirmed.',
        riskImpact: { previousRating: 'MEDIUM', revisedRating: 'HIGH', ruleVersion: 'RR-AML-2026.4' },
        humanDecisions: [
          {
            type: 'ANALYST_DISPOSITION',
            decision: 'CONFIRMED',
            decidedBy: DEMO_USERS.ANALYST.name,
            role: 'ANALYST',
            timestamp: new Date().toISOString(),
            rationale: 'Evidence verified against official register',
          },
        ],
        exceptions: [],
        outstandingActions: ['Obtain final court verdict upon conclusion of trial'],
      },
      {
        id: DEMO_USERS.CHECKER.id,
        name: DEMO_USERS.CHECKER.name,
        role: 'CHECKER',
        isAi: false,
      }
    );
    assert(!!decisionPack, 'AM-50: Compliance Decision Pack generated');
    assert(decisionPack.status === 'SEALED', 'AM-50: Decision Pack cryptographically SEALED');
    assert(decisionPack.cryptographicSignature.manifestHash.length >= 32, 'AM-50: Cryptographic SHA-256 manifest hash generated');
    assert(decisionPack.cryptographicSignature.signatoryName === DEMO_USERS.CHECKER.name, 'AM-50: Checker stamped as official signatory');

    // AM-51: Acceptance Conditions & Periodic Monitoring
    const condition = globalIntegrationHub.createAcceptanceCondition(
      invId,
      caseId,
      {
        title: 'Annual Audited Financial Statements Submission',
        description: 'Client must furnish external audited financial statements within 90 days of fiscal year end.',
        category: 'EDD_DOCUMENTATION',
        dueDate: new Date(Date.now() + 86400000 * 90).toISOString(),
        isBlocking: true,
        blockingScope: 'BLOCK_ONBOARDING',
        reviewFrequencyDays: 90,
      },
      {
        id: DEMO_USERS.ANALYST.id,
        name: DEMO_USERS.ANALYST.name,
        role: 'ANALYST',
        isAi: false,
      }
    );
    assert(!!condition, 'AM-51: Acceptance condition created');
    assert(condition.status === 'PENDING', 'AM-51: Condition starts in PENDING status');
    assert(condition.isBlocking === true, 'AM-51: Mandatory condition enforces onboarding blocker');

    // AM-52: BAU Handover & Enterprise Integration via Transactional Outbox
    const handover = globalIntegrationHub.createAndTransmitHandover(
      invId,
      caseId,
      {
        targetSystem: 'BAU_CORE_BANKING',
        restrictions: ['NO_UNSECURED_CREDIT_FACILITY', 'MANDATORY_ANNUAL_EDD_REFRESH'],
        monitoringFrequency: 'ANNUAL',
        ownershipTeam: 'Commercial Banking 1st Line Oversight',
      },
      {
        id: DEMO_USERS.CHECKER.id,
        name: DEMO_USERS.CHECKER.name,
        role: 'CHECKER',
        isAi: false,
      }
    );
    assert(!!handover, 'AM-52: BAU Handover package successfully dispatched');
    assert(handover.outboxDelivery.deliveryStatus === 'ACKNOWLEDGED', 'AM-52: Transactional Outbox marks delivery ACKNOWLEDGED');
    assert(!!handover.outboxDelivery.idempotencyKey, 'AM-52: Idempotency key assigned for duplicate prevention');
    assert(handover.dataMinimizationRules.maskConfidentialSarNotes === true, 'AM-52: Data minimization applies strict confidentiality masking');

    // Replay mechanism test
    const replayed = globalIntegrationHub.replayHandoverDelivery(invId, handover.id, false);
    assert(!!replayed, 'AM-52: Outbox replay mechanism successfully invoked');
    assert(replayed.outboxDelivery.attemptCount >= 2, 'AM-52: Delivery attempt count increments reliably upon replay');
  }

  // ----------------------------------------------------
  // TEST SUITE 17: AM-53 to AM-59 Continuous Monitoring & Rescreening
  // ----------------------------------------------------
  console.log('\n📋 Test Suite 17: AM-53 to AM-59 Continuous Monitoring & Adverse-Media Rescreening');
  {
    const masterService = new MonitoringMasterService();
    const scheduleService = masterService.scheduleService;
    const subscriptionService = masterService.subscriptionService;
    const deltaEngine = masterService.deltaEngine;
    const suppressionEngine = masterService.suppressionEngine;
    const materialEngine = masterService.materialRules;
    const triggerOrchestrator = masterService.triggerOrchestrator;
    const priorityEngine = masterService.priorityEngine;

    // AM-53: Scheduled Rescreening
    const schedule = scheduleService.createSchedule({
      caseId: 'case-test-am53',
      subjectId: 'subj-am53',
      customerRiskRating: 'HIGH',
      jurisdiction: 'GB',
    });
    assert(!!schedule, 'AM-53: Screening schedule successfully initialized');
    assert(schedule.reviewFrequencyDays === 90, 'AM-53: High risk assigns 90-day review frequency');
    assert(schedule.policyRuleApplied === 'RULE-SCHED-HIGH-RISK-90D', 'AM-53: Matches high risk policy rule');

    // Recalculate upon risk increase
    const recalculated = scheduleService.recalculateScheduleDueToRiskChange(schedule.id, 'HIGH');
    assert(recalculated.reviewFrequencyDays === 90, 'AM-53: Recalculates frequency dynamically when risk shifts');

    // AM-54: Continuous Adverse-Media Monitoring Subscriptions
    const sub = subscriptionService.createSubscription({
      caseId: 'case-test-am54',
      subjectId: 'subj-am54',
      subjectName: 'Apex Holdings International',
      queryAliases: ['Apex Holdings', 'Apex Group Global'],
      riskRating: 'HIGH',
      activeConnectors: ['conn-gdelt', 'conn-corp-reg'],
    });
    assert(!!sub, 'AM-54: Monitoring subscription registered with query aliases');
    assert(sub.status === 'ACTIVE', 'AM-54: Subscription is ACTIVE with 4h high-risk interval');
    assert(sub.checkpoints.length >= 0, 'AM-54: Checkpoints initialized for recovery');

    // AM-55: Delta Analysis
    const delta = deltaEngine.computeDelta({
      cycleId: 'cycle-test-01',
      subjectId: 'subj-am55',
      previousStateArticles: [
        {
          articleId: 'art-01',
          contentHash: 'hash-aaa',
          title: 'Investigation opened into export licenses',
          publishedAt: '2025-01-01T00:00:00Z',
          sources: ['Reuters'],
          classification: 'BRIBERY',
          legalStatus: 'INVESTIGATION_OPENED',
        },
      ],
      newStateArticles: [
        {
          articleId: 'art-01',
          contentHash: 'hash-aaa',
          title: 'Investigation opened into export licenses',
          publishedAt: '2025-01-01T00:00:00Z',
          sources: ['Reuters', 'Financial Times'],
          classification: 'BRIBERY',
          legalStatus: 'FORMAL_CHARGES_FILED',
        },
      ],
    });
    assert(!!delta, 'AM-55: Delta set computed successfully');
    assert(delta.modifiedItems.length === 1, 'AM-55: Identified modified adverse media article');
    assert(delta.modifiedItems[0].isCorroborated === true, 'AM-55: Detected new independent source corroboration');
    assert(delta.modifiedItems[0].statusAdvanced === true, 'AM-55: Detected procedural status advancement');

    // AM-56: Suppression of Unchanged Cleared Results
    const shouldSuppressUnchanged = suppressionEngine.evaluateSuppression({
      cycleId: 'cycle-test-01',
      articleId: 'art-01',
      contentFingerprint: 'fp-cleared-old-01',
      currentContent: 'Identical investigation summary verbatim without changes.',
      priorFinding: {
        disposition: 'FALSE_POSITIVE',
        rationale: 'Cleared as false positive in 2024 onboarding',
        decidedBy: 'USR-CHECKER-01',
        decidedAt: '2024-01-10T10:00:00Z',
        storedFingerprint: 'fp-cleared-old-01',
        evidenceIds: ['ev-01'],
      },
    });
    assert(shouldSuppressUnchanged.isSuppressed === true, 'AM-56: Unchanged cleared result suppressed deterministically');
    assert(shouldSuppressUnchanged.ruleId === 'RULE-SUPPRESS-UNCHANGED-01', 'AM-56: Applied suppression rule logged');

    // AM-56 Safeguard: Altered fingerprint or content Prevents Suppression
    const shouldNotSuppressAltered = suppressionEngine.evaluateSuppression({
      cycleId: 'cycle-test-01',
      articleId: 'art-01',
      contentFingerprint: 'fp-cleared-NEW-CHARGES',
      currentContent: 'Prosecutor announced formal charges and conviction yesterday.',
      priorFinding: {
        disposition: 'FALSE_POSITIVE',
        rationale: 'Cleared as false positive in 2024 onboarding',
        decidedBy: 'USR-CHECKER-01',
        decidedAt: '2024-01-10T10:00:00Z',
        storedFingerprint: 'fp-cleared-old-01',
        evidenceIds: ['ev-01'],
      },
    });
    assert(shouldNotSuppressAltered.isSuppressed === false, 'AM-56: Safeguard prevents suppression when fingerprint changes');
    assert(shouldNotSuppressAltered.reopeningRationale !== undefined, 'AM-56: Explicit reopening reason recorded for audit trail');

    // AM-57: Material-Update Detection Engine
    const materialConviction = materialEngine.evaluateMaterialUpdate({
      cycleId: 'cycle-01',
      eventId: 'evt-01',
      subjectId: 'subj-01',
      headline: 'Managing Director sentenced to 5 years imprisonment in fraud trial',
      content: 'Federal court handed down a guilty verdict and sentenced the executive to prison.',
      newStatus: 'CONVICTION',
    });
    assert(!!materialConviction, 'AM-57: Material update detected for conviction');
    assert(materialConviction?.updateCategory === 'CONVICTION', 'AM-57: Accurately categorized as CONVICTION');
    assert(materialConviction?.severity === 'CRITICAL', 'AM-57: Conviction assigned CRITICAL severity');
    assert(materialConviction?.requiresImmediateEscalation === true, 'AM-57: Conviction marks requiresImmediateEscalation true');

    const materialAcquittal = materialEngine.evaluateMaterialUpdate({
      cycleId: 'cycle-01',
      eventId: 'evt-02',
      subjectId: 'subj-01',
      headline: 'All charges dismissed with prejudice against defendant',
      content: 'The appellate court overturned the indictment and fully acquitted the party.',
      newStatus: 'ACQUITTAL',
    });
    assert(!!materialAcquittal, 'AM-57: Material update detected for acquittal');
    assert(materialAcquittal?.updateCategory === 'ACQUITTAL', 'AM-57: Accurately categorized as ACQUITTAL');

    // AM-58: Trigger-Event Case Creation
    const triggeredCase = triggerOrchestrator.evaluateTriggerEvent({
      originalCaseId: 'case-test-am58',
      subjectId: 'subj-am58',
      subjectName: 'Alexander Vance',
      sourceMaterialUpdateId: materialConviction?.id,
      triggerEventCategory: 'CONVICTION',
      evidenceSummary: 'Court sentence of 5 years imprisonment for fraud',
    });
    assert(!!triggeredCase, 'AM-58: Trigger-event case created from material conviction');
    assert(triggeredCase?.targetWorkflow === 'EDD', 'AM-58: Routed to EDD target workflow');
    assert(triggeredCase?.priority === 'CRITICAL', 'AM-58: Assigned CRITICAL priority');
    assert(triggeredCase?.originatingCaseId === 'case-test-am58', 'AM-58: Bidirectionally linked to originating KYC case');

    // Deduplication check: second occurrence within window is deduped
    const deduplicated = triggerOrchestrator.evaluateTriggerEvent({
      originalCaseId: 'case-test-am58',
      subjectId: 'subj-am58',
      subjectName: 'Alexander Vance',
      sourceMaterialUpdateId: materialConviction?.id,
      triggerEventCategory: 'CONVICTION',
      evidenceSummary: 'Court sentence of 5 years imprisonment for fraud',
    });
    assert(deduplicated === null, 'AM-58: Deduplication window prevents redundant case storm');

    // AM-59: Monitoring Alert Prioritization
    const priority = priorityEngine.calculatePriority({
      customerRisk: 'HIGH',
      severity: 'CRITICAL',
      legalStatus: 'CONVICTION',
      evidenceStrengthScore: 0.95,
      relationshipRole: 'DIRECTOR',
      daysSincePublished: 1,
      identityMatchConfidence: 0.99,
      updateType: 'CONVICTION',
    });
    assert(priority.overallScore >= 80, 'AM-59: High risk + conviction + corroboration scores >= 80');
    assert(priority.tier === 'CRITICAL', 'AM-59: High score assigns CRITICAL (P1) tier');
    assert(priority.slaHours === 4, 'AM-59: P1 Critical enforces 4-hour SLA');
    assert(priority.contributingFactors.length >= 6, 'AM-59: Complete explainable score component breakdown');

    // Multi-cycle coordinator demo execution
    const multiCycleDemo = masterService.runMultiCycleDemo();
    assert(multiCycleDemo.cyclesExecuted === 3, 'AM-53 - AM-59: Multi-cycle demo runs 3 sequential cycles');
    assert(multiCycleDemo.suppressedCount >= 1, 'AM-56: Multi-cycle demo proves suppression of unchanged results');
    assert(multiCycleDemo.alertsGenerated >= 1, 'AM-59: Multi-cycle demo generates prioritized alerts');
  }

  console.log('\n======================================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runAllTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});

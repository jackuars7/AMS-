/**
 * AM-08: Search Audit Records & Manifest Engine
 * Produces immutable search manifests for regulatory traceability.
 * Completed manifests are sealed; modifications must produce linked revisions.
 */
import { createHash } from 'node:crypto';
import {
  ConnectorAttempt,
  CoverageGap,
  CoverageOutcome,
  HistoricalPeriodResolution,
  QueryVariant,
  RoleId,
  SearchExecution,
  SearchManifest,
  SearchManifestRevision,
  SourceCategory,
  Subject,
} from '../types/index.ts';

export class SearchManifestEngine {
  /**
   * Build a new immutable Search Manifest for an executed screening run
   */
  public createManifest(params: {
    runId: string;
    caseId: string;
    subject: Subject;
    queryVariants: QueryVariant[];
    languages: string[];
    keywords: string[];
    eventCategories: any[];
    allowedDomains: string[];
    historicalPeriod: HistoricalPeriodResolution;
    policyVersion: string;
    searchConfigVersion: string;
    connectors: Array<{ id: string; name: string; category: SourceCategory; provider: string }>;
    attempts: ConnectorAttempt[];
    coverageOutcomes: CoverageOutcome[];
    coverageGaps: CoverageGap[];
    totalResultsCount: number;
    accessibleResultsCount: number;
    initiatingActor: { id: string; name: string; role: RoleId };
    initiatingSystem?: string;
    correlationId: string;
    startedAt: string;
    completedAt?: string;
  }): SearchManifest {
    const manifestId = `man-${params.runId}`;
    const approvedAliases = params.subject.aliases
      .filter((a) => a.state === 'APPROVED')
      .map((a) => a.aliasName);

    const execution: SearchExecution = {
      id: `exec-${params.runId}`,
      manifestId,
      startedAt: params.startedAt,
      completedAt: params.completedAt || new Date().toISOString(),
      status: params.coverageGaps.length === 0 ? 'COMPLETED' : 'PARTIAL_SUCCESS',
      attempts: params.attempts,
      queryVariants: params.queryVariants,
      coverageOutcomes: params.coverageOutcomes,
      coverageGaps: params.coverageGaps,
      totalResultsCount: params.totalResultsCount,
      accessibleResultsCount: params.accessibleResultsCount,
    };

    const manifestPayload = JSON.stringify({
      manifestId,
      runId: params.runId,
      subjectId: params.subject.id,
      connectors: params.connectors.map(c => c.id),
      queryVariants: params.queryVariants.map(q => q.id),
      startedAt: params.startedAt,
    });
    const manifestHash = createHash('sha256').update(manifestPayload).digest('hex');

    const manifest: SearchManifest = {
      id: manifestId,
      runId: params.runId,
      caseId: params.caseId,
      subjectId: params.subject.id,
      subjectName: params.subject.primaryName,
      manifestHash: `sha256-${manifestHash}`,
      approvedAliases,
      queryVariants: params.queryVariants,
      languages: params.languages,
      keywords: params.keywords,
      eventCategories: params.eventCategories,
      allowedDomains: params.allowedDomains,
      historicalPeriod: params.historicalPeriod,
      policyVersion: params.policyVersion,
      searchConfigVersion: params.searchConfigVersion,
      connectors: params.connectors,
      execution,
      initiatingActorId: params.initiatingActor.id,
      initiatingActorName: params.initiatingActor.name,
      initiatingActorRole: params.initiatingActor.role,
      initiatingSystem: params.initiatingSystem || 'KYC_ORCHESTRATOR_V1',
      correlationId: params.correlationId,
      createdAt: params.startedAt,
      completedAt: params.completedAt || new Date().toISOString(),
      isImmutable: true,
      activeRevisionNumber: 1,
      revisions: [
        {
          revisionNumber: 1,
          timestamp: params.startedAt,
          actorId: params.initiatingActor.id,
          actorName: params.initiatingActor.name,
          actorRole: params.initiatingActor.role,
          changeReason: 'INITIAL_EXECUTION_SEAL',
          deltaSummary: `Executed initial search across ${params.connectors.length} connectors and ${params.languages.length} languages.`,
          supersededManifestId: 'NONE_INITIAL',
        },
      ],
    };

    return manifest;
  }

  /**
   * Record a linked revision to an existing immutable manifest
   */
  public addRevision(params: {
    manifest: SearchManifest;
    actor: { id: string; name: string; role: RoleId };
    changeReason: string;
    deltaSummary: string;
  }): { manifest: SearchManifest; revision: SearchManifestRevision } {
    if (!params.manifest.isImmutable) {
      throw new Error('Manifest is not sealed as immutable');
    }

    const nextRevNumber = params.manifest.activeRevisionNumber + 1;
    const revision: SearchManifestRevision = {
      revisionNumber: nextRevNumber,
      timestamp: new Date().toISOString(),
      actorId: params.actor.id,
      actorName: params.actor.name,
      actorRole: params.actor.role,
      changeReason: params.changeReason,
      deltaSummary: params.deltaSummary,
      supersededManifestId: `${params.manifest.id}-rev-${params.manifest.activeRevisionNumber}`,
    };

    params.manifest.revisions.push(revision);
    params.manifest.activeRevisionNumber = nextRevNumber;

    return { manifest: params.manifest, revision };
  }
}

export const searchManifestEngine = new SearchManifestEngine();

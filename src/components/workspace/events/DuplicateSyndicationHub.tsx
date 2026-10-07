import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Layers,
  RefreshCw,
  Repeat,
  Scale,
  Search,
  Shield,
  Sparkles,
  Split,
} from 'lucide-react';
import {
  ArticleCluster,
  DuplicateAssessment,
  SourceRoleAssessment,
  UserRole,
} from '../../../types/index.ts';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';

interface DuplicateSyndicationHubProps {
  duplicates: DuplicateAssessment[];
  clusters: ArticleCluster[];
  sourceRoles: SourceRoleAssessment[];
  onAdjudicateDuplicate: (assessmentId: string, status: string, rationale: string) => void;
  onOverrideRole: (articleId: string, role: string, rationale: string) => void;
  onRecluster: () => void;
  onInspectArticle: (articleId: string) => void;
  activeRole?: UserRole;
  isReclustering?: boolean;
}

export const DuplicateSyndicationHub: React.FC<DuplicateSyndicationHubProps> = ({
  duplicates,
  clusters,
  sourceRoles,
  onAdjudicateDuplicate,
  onOverrideRole,
  onRecluster,
  onInspectArticle,
  activeRole = 'ANALYST',
  isReclustering = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'duplicates' | 'clusters' | 'sourcing'>('duplicates');
  const [selectedAssessment, setSelectedAssessment] = useState<DuplicateAssessment | null>(null);
  const [adjudicateRationale, setAdjudicateRationale] = useState('');
  const [adjudicateStatus, setAdjudicateStatus] = useState<'CONFIRMED_DUPLICATE' | 'HUMAN_SPLIT_DISTINCT'>('CONFIRMED_DUPLICATE');

  const canEdit = activeRole !== 'AUDITOR';

  const handleConfirmAdjudication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessment || !adjudicateRationale.trim()) return;
    onAdjudicateDuplicate(selectedAssessment.id, adjudicateStatus, adjudicateRationale);
    setSelectedAssessment(null);
    setAdjudicateRationale('');
  };

  return (
    <div id="duplicate-syndication-hub" className="space-y-6">
      {/* Overview Banner & Actions */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            Information Clustering Engine (AM-16 to AM-18)
          </div>
          <h3 className="text-xl font-extrabold tracking-tight">
            Deduplication, Syndication & Original-Source Intelligence
          </h3>
          <p className="text-xs text-indigo-200 leading-relaxed">
            Eliminates syndicated echo chambers where a single wire report reproduced across ten regional publications artificially inflates risk metrics. Distinguishes genuine independent corroboration from syndicated re-publications.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 shrink-0">
          <Button
            id="recluster-btn"
            variant="outline"
            size="sm"
            onClick={onRecluster}
            disabled={isReclustering}
            className="text-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isReclustering ? 'animate-spin' : ''}`} />
            {isReclustering ? 'Clustering...' : 'Trigger Re-Cluster'}
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
            <Copy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{duplicates.length}</div>
            <div className="text-xs font-medium text-slate-500">Duplicate Pairs Detected (AM-16)</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{clusters.length}</div>
            <div className="text-xs font-medium text-slate-500">Syndication Clusters (AM-17)</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {sourceRoles.filter((s) => s.assignedRole === 'ORIGINAL' || s.assignedRole === 'LIKELY_ORIGINAL').length}
            </div>
            <div className="text-xs font-medium text-slate-500">Original Breaking Sources (AM-18)</div>
          </div>
        </div>
      </div>

      {/* Sub-tabs switcher */}
      <div className="flex items-center gap-3 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveSubTab('duplicates')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'duplicates'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Copy className="w-4 h-4" />
          Duplicate Pairs ({duplicates.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('clusters')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'clusters'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Repeat className="w-4 h-4" />
          Syndication Clusters ({clusters.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('sourcing')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'sourcing'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Original Source Classifications ({sourceRoles.length})
        </button>
      </div>

      {/* Subtab 1: Duplicate Pairs (AM-16) */}
      {activeSubTab === 'duplicates' && (
        <div id="duplicate-pairs-list" className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <p>
              Exact matches and near-duplicates evaluated via SimHash 64-bit Hamming distance and Jaccard n-gram similarity.
            </p>
          </div>

          {duplicates.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
              No duplicate article pairs detected.
            </div>
          ) : (
            <div className="space-y-3">
              {duplicates.map((dup) => (
                <div
                  key={dup.id}
                  id={`dup-card-${dup.id}`}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-bold rounded bg-slate-100 text-slate-800">
                        {dup.matchType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        SimHash: {dup.contentSimilarity}%
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        Title Match: {dup.titleSimilarity}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {dup.status === 'CONFIRMED_DUPLICATE' ? (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmed Duplicate
                        </span>
                      ) : dup.status === 'HUMAN_SPLIT_DISTINCT' ? (
                        <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                          <Split className="w-3.5 h-3.5" />
                          Marked Distinct by Human
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Pending Review
                        </span>
                      )}

                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAssessment(dup);
                            setAdjudicateStatus('CONFIRMED_DUPLICATE');
                          }}
                          className="text-xs"
                        >
                          Adjudicate Pair
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Pair comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Primary Article</div>
                      <div className="font-bold text-slate-900 truncate">ID: {dup.canonicalArticleId}</div>
                      <button
                        type="button"
                        onClick={() => onInspectArticle(dup.canonicalArticleId)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                      >
                        Inspect Canonical Article <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-slate-400 uppercase">Duplicate / Reprint Article</div>
                      <div className="font-bold text-slate-900 truncate">ID: {dup.articleId}</div>
                      <button
                        type="button"
                        onClick={() => onInspectArticle(dup.articleId)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                      >
                        Inspect Duplicate Article <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {dup.rationale && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                      <span className="font-semibold text-slate-800">Rationales:</span> {dup.rationale}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subtab 2: Syndication Clusters (AM-17) */}
      {activeSubTab === 'clusters' && (
        <div id="syndication-clusters-list" className="space-y-4">
          <div className="text-xs text-slate-500">
            Algorithmic clusters grouping breaking news with their distributed syndication reprints.
          </div>

          {clusters.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
              No syndication clusters formed yet.
            </div>
          ) : (
            <div className="space-y-4">
              {clusters.map((cluster) => (
                <div
                  key={cluster.id}
                  id={`cluster-card-${cluster.id}`}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-xs font-bold rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {cluster.clusterType.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-slate-500">
                          Earliest Pub: {new Date(cluster.earliestPublishedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{cluster.clusterName}</h4>
                      <p className="text-xs text-slate-600 mt-1">{cluster.summary}</p>
                    </div>

                    <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 text-right shrink-0">
                      <div className="text-[11px] font-bold text-indigo-900 uppercase">Independent Ratio</div>
                      <div className="text-lg font-black text-indigo-950">
                        {cluster.independentSourceCount} / {cluster.totalArticleCount} Sources
                      </div>
                      <div className="text-[11px] text-indigo-700">
                        {cluster.totalArticleCount - cluster.independentSourceCount} Syndicated copies deduplicated
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
                    <span className="font-semibold text-slate-500">Domains Involved:</span>
                    {cluster.domains.map((dom) => (
                      <span key={dom} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[11px]">
                        {dom}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subtab 3: Source Role Classifications (AM-18) */}
      {activeSubTab === 'sourcing' && (
        <div id="source-roles-list" className="space-y-4">
          <div className="text-xs text-slate-500">
            Source role breakdown ranking breaking original reports, syndicated wire pickups, aggregators, and independent corroborations.
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden">
            {sourceRoles.map((sr) => (
              <div key={sr.articleId} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded">
                      {sr.assignedRole.replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 font-mono">Rank #{sr.publicationTimeRank} in release timeline</span>
                    {sr.humanReviewed && (
                      <span className="text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                        Human Reviewed by {sr.reviewedByName}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-700 font-medium">Article ID: {sr.articleId}</div>
                  <div className="text-slate-500">{sr.rationales.join(' • ')}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onInspectArticle(sr.articleId)}
                    className="text-xs"
                  >
                    Inspect Article
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adjudication Dialog */}
      {selectedAssessment && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmAdjudication}
            className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Adjudicate Duplicate Relationship</h4>
              <button type="button" onClick={() => setSelectedAssessment(null)} className="text-slate-400 hover:text-slate-600">
                ×
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Content Similarity: <span className="font-bold">{selectedAssessment.contentSimilarity}%</span>
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Investigator Decision</label>
              <select
                value={adjudicateStatus}
                onChange={(e) => setAdjudicateStatus(e.target.value as any)}
                className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="CONFIRMED_DUPLICATE">CONFIRMED DUPLICATE (Suppress duplicate severity)</option>
                <option value="HUMAN_SPLIT_DISTINCT">SPLIT / DISTINCT (Treat as independent reporting)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Audit Rationale *</label>
              <textarea
                required
                rows={2}
                placeholder="Reasoning for confirmation or separation..."
                value={adjudicateRationale}
                onChange={(e) => setAdjudicateRationale(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedAssessment(null)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="text-xs">
                Save Adjudication
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

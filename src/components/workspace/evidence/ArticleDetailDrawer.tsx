import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSearch,
  Globe2,
  Languages,
  Lock,
  MapPin,
  Quote,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Article, UserRole } from '../../../types/index.ts';
import { Drawer } from '../../common/Drawer.tsx';
import { Badge, BadgeVariant } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';
import { apiClient } from '../../../lib/api-client.ts';
import { RetrievalRecordModal } from './RetrievalRecordModal.tsx';

interface ArticleDetailDrawerProps {
  article: Article | null;
  isOpen: boolean;
  onClose: () => void;
  activeRole: UserRole;
  onArticleUpdated: (updated: Article) => void;
  onOpenEvidenceReview?: (articleId: string) => void;
}

export const ArticleDetailDrawer: React.FC<ArticleDetailDrawerProps> = ({
  article,
  isOpen,
  onClose,
  activeRole,
  onArticleUpdated,
  onOpenEvidenceReview,
}) => {
  const [isLevel3Open, setIsLevel3Open] = useState(false);
  const [identityAssessment, setIdentityAssessment] = useState<string>(
    article?.identityAssessment || 'NOT_ASSESSED'
  );
  const [legalStatus, setLegalStatus] = useState<string>(article?.legalStatus || '');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Sync state when article changes
  React.useEffect(() => {
    if (article) {
      setIdentityAssessment(article.identityAssessment || 'NOT_ASSESSED');
      setLegalStatus(article.legalStatus || '');
      setReviewNotes('');
      setSaveNotice(null);
    }
  }, [article]);

  if (!article) return null;

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveNotice(null);
    try {
      const updated = await apiClient.reviewArticle(article.id, {
        identityAssessment,
        legalStatus: legalStatus || 'Not assessed',
        notes: reviewNotes,
      });
      setSaveNotice('Adjudication decision recorded in immutable case audit trail.');
      onArticleUpdated(updated);
    } catch (err: any) {
      setSaveNotice(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const pubDate = article.metadata?.publicationDate;
  const langAssessment = article.metadata?.languageAssessment;

  const dateBadgeVariant: Record<string, BadgeVariant> = {
    VERIFIED: 'success',
    PROVIDER_REPORTED: 'info',
    APPROXIMATE: 'warning',
    CONFLICTING: 'danger',
    UNKNOWN: 'neutral',
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="Adverse Media Finding Forensic Inspection (Level 2)"
        subtitle={`Article ID: ${article.id} • Retained for Regulatory Audit`}
        width="2xl"
      >
        <div className="space-y-6 text-xs p-1">
          {saveNotice && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{saveNotice}</span>
            </div>
          )}

          {/* Article Header & Main Metadata */}
          <div className="space-y-2.5 pb-4 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={article.severity === 'HIGH' ? 'danger' : article.severity === 'MEDIUM' ? 'warning' : 'neutral'}>
                {article.severity} SEVERITY
              </Badge>

              <Badge variant={article.accessStatus === 'ACCESSIBLE' ? 'success' : 'warning'}>
                {article.accessStatus}
              </Badge>

              <Badge variant="primary">
                {article.language.toUpperCase()} • {langAssessment?.script || 'LATN'}
              </Badge>

              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Relevance: {Math.round(article.relevanceScore * 100)}%
              </span>
            </div>

            <h3
              className={`text-base font-bold text-slate-900 leading-snug ${
                article.isRTL ? 'text-right font-serif' : 'font-sans'
              }`}
              dir={article.isRTL ? 'rtl' : 'ltr'}
            >
              {article.title}
            </h3>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                <Building className="h-3.5 w-3.5 text-slate-400" />
                {article.publisher}
              </span>
              <span>•</span>
              <span className="font-mono text-slate-500">{article.domain}</span>
              <span>•</span>
              <a
                href={article.canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
              >
                <span>Original Link</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Date Assertion Forensic Breakdown */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                Date Assertion Forensic Confidence
              </span>
              <Badge variant={dateBadgeVariant[pubDate?.confidenceState || 'UNKNOWN'] || 'neutral'} size="sm">
                {pubDate?.confidenceState || 'UNKNOWN'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Reported Publication Date:</span>
                <span className="font-bold text-slate-800">
                  {pubDate?.date ? new Date(pubDate.date).toLocaleDateString() : 'Not published / Unknown'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Header / Source Field:</span>
                <span className="font-mono text-slate-700">{pubDate?.sourceField || 'Provider Feed Direct'}</span>
              </div>
            </div>

            {pubDate?.explanation && (
              <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
                {pubDate.explanation}
              </div>
            )}

            {/* Conflicting dates alert if any */}
            {pubDate?.confidenceState === 'CONFLICTING' && pubDate.conflictingDates && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-[11px] space-y-1.5 text-rose-900">
                <span className="font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                  Conflicting Publication Dates Detected Across Headers:
                </span>
                <ul className="list-disc pl-5 space-y-0.5 font-mono">
                  {pubDate.conflictingDates.map((cd, idx) => (
                    <li key={idx}>
                      {cd.source}: <strong>{cd.date}</strong> ({cd.note})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Author, Publisher & Location Integrity */}
          <div className="p-3.5 rounded-lg border border-slate-200 space-y-2.5">
            <h5 className="font-semibold text-slate-800">Publisher & Geographic Provenance</h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 block flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  Publisher Status
                </span>
                <span className="font-bold text-slate-800 block mt-0.5">
                  {article.metadata.publisherStatus}
                </span>
              </div>

              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 block flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Author Attribution
                </span>
                <span className="font-bold text-slate-800 block mt-0.5">
                  {article.author || 'Anonymous / Staff'} ({article.metadata.authorStatus})
                </span>
              </div>

              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 block flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Publication Location
                </span>
                <span className="font-bold text-slate-800 block mt-0.5">
                  {article.metadata.publicationLocation || 'Not Reported'}
                </span>
              </div>
            </div>
          </div>

          {/* Language & N-Gram Assessment */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <h5 className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Languages className="h-3.5 w-3.5 text-indigo-600" />
              Language & Script Assessment (N-Gram Statistical Engine)
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
              <div>
                <span className="text-slate-400 block">Detected Language:</span>
                <span className="font-bold text-slate-800">{article.language.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Script:</span>
                <span className="font-bold text-slate-800">{langAssessment?.script || 'LATN'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Statistical Confidence:</span>
                <span className="font-bold text-emerald-700">
                  {Math.round((langAssessment?.confidence || 0.95) * 100)}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Detection Method:</span>
                <span className="text-slate-700">{langAssessment?.method || 'STATISTICAL_N_GRAM'}</span>
              </div>
            </div>
          </div>

          {/* Sanitized Quote Snippet */}
          <div className="space-y-1.5">
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <Quote className="h-3.5 w-3.5 text-indigo-600" />
              Sanitized Text Snippet (Untrusted Scripts Isolated)
            </span>
            <div
              className={`p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed italic ${
                article.isRTL ? 'text-right font-serif' : 'font-sans'
              }`}
              dir={article.isRTL ? 'rtl' : 'ltr'}
            >
              {article.versions?.[0]?.sanitizedSnippet ||
                article.metadata.normalizedMetadata.cleanTitle ||
                'No snippet extracted.'}
            </div>
          </div>

          {/* Inline Adjudication Form (AM-11) */}
          <form onSubmit={handleSaveReview} className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Scale className="h-4 w-4 text-indigo-700" />
                Finding Adjudication & Identity Assessment (AM-11)
              </h5>
              <Badge variant={identityAssessment === 'CONFIRMED_MATCH' ? 'danger' : identityAssessment === 'POTENTIAL_MATCH' ? 'warning' : 'neutral'} size="sm">
                {identityAssessment.replace(/_/g, ' ')}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Identity Match Assessment
                </label>
                <select
                  value={identityAssessment}
                  onChange={(e) => setIdentityAssessment(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="NOT_ASSESSED">Not Assessed</option>
                  <option value="POTENTIAL_MATCH">Potential Match (Requires Inquiry)</option>
                  <option value="CONFIRMED_MATCH">Confirmed Match (Target Entity)</option>
                  <option value="FALSE_POSITIVE">False Positive (Disproven)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Legal / Procedural Status
                </label>
                <input
                  type="text"
                  value={legalStatus}
                  onChange={(e) => setLegalStatus(e.target.value)}
                  placeholder="e.g., Formal Inquest / Active Inquest"
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Adjudication Rationale & Notes
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Document rationale for matching or dismissing this adverse media finding..."
                rows={2}
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSaving}
                className="text-xs"
              >
                Record Adjudication
              </Button>
            </div>
          </form>

          {/* Actions Bar: Level 3 Audit & Evidence Review Mode */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2">
            <span className="text-[11px] text-slate-500">
              Content Hash: <span className="font-mono">{article.contentHash.slice(0, 16)}...</span>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLevel3Open(true)}
                leftIcon={<Shield className="h-3.5 w-3.5 text-indigo-600" />}
                className="text-xs"
              >
                View Retrieval Audit (Level 3)
              </Button>
              {onOpenEvidenceReview && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenEvidenceReview(article.id);
                  }}
                  leftIcon={<Quote className="h-3.5 w-3.5" />}
                  className="text-xs"
                >
                  Grounded Evidence Review (AM-21–27)
                </Button>
              )}
            </div>
          </div>
        </div>
      </Drawer>

      {/* Level 3 Retrieval Audit Modal */}
      <RetrievalRecordModal
        article={article}
        isOpen={isLevel3Open}
        onClose={() => setIsLevel3Open(false)}
      />
    </>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  DollarSign,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Globe2,
  History,
  Info,
  Languages,
  Layers,
  MapPin,
  Maximize2,
  Quote,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Tag,
  User,
  Users,
  X,
} from 'lucide-react';
import {
  Article,
  ArticleExtractionBundle,
  EvidencePassage,
  EventClassification,
  ExtractedEntity,
  JurisdictionAssertion,
  LegalStatusAssertion,
  MaterialFact,
  SummaryClaim,
  HumanCorrection,
  UserRole,
} from '../../../types/index.ts';
import { apiClient } from '../../../lib/api-client.ts';
import { Badge, BadgeVariant } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';
import { EmptyState } from '../../common/EmptyState.tsx';

interface EvidenceReviewWorkspaceProps {
  articles: Article[];
  selectedArticleId?: string | null;
  onSelectArticle?: (articleId: string) => void;
  activeRole: UserRole;
  onAuditRecorded?: () => void;
}

export const EvidenceReviewWorkspace: React.FC<EvidenceReviewWorkspaceProps> = ({
  articles,
  selectedArticleId,
  onSelectArticle,
  activeRole,
  onAuditRecorded,
}) => {
  // Active selected article
  const currentArticleId = selectedArticleId || (articles.length > 0 ? articles[0].id : null);
  const activeArticle = useMemo(() => {
    return articles.find((a) => a.id === currentArticleId) || (articles.length > 0 ? articles[0] : null);
  }, [articles, currentArticleId]);

  // Extraction bundle and content states
  const [bundle, setBundle] = useState<ArticleExtractionBundle | null>(null);
  const [rawContent, setRawContent] = useState<string>('');
  const [translation, setTranslation] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Synchronized interaction state
  const [highlightedPassageId, setHighlightedPassageId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<
    'all' | 'summary' | 'classifications' | 'legal' | 'entities' | 'jurisdictions' | 'facts' | 'passages' | 'corrections'
  >('all');

  // Display toggles for left pane
  const [viewMode, setViewMode] = useState<'source' | 'translated' | 'side-by-side'>('source');
  const [showHighlightsOnly, setShowHighlightsOnly] = useState<boolean>(false);

  // Correction Modal State
  const [correctionModalOpen, setCorrectionModalOpen] = useState<boolean>(false);
  const [correctionTarget, setCorrectionTarget] = useState<{
    type: 'SUMMARY_CLAIM' | 'EVENT_CLASSIFICATION' | 'LEGAL_STATUS' | 'ENTITY' | 'JURISDICTION' | 'MATERIAL_FACT' | 'PASSAGE';
    id: string;
    label: string;
    currentValue: any;
  } | null>(null);
  const [correctionNewValue, setCorrectionNewValue] = useState<string>('');
  const [correctionRationale, setCorrectionRationale] = useState<string>('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState<boolean>(false);

  // Re-Extraction Modal State
  const [reExtractModalOpen, setReExtractModalOpen] = useState<boolean>(false);
  const [promptVersion, setPromptVersion] = useState<string>('prompt-aml-extract-v3.2');
  const [modelVersion, setModelVersion] = useState<string>('gemini-2.5-pro-extract-hybrid');
  const [isReExtracting, setIsReExtracting] = useState<boolean>(false);

  // Legal Status Transition Modal State
  const [legalStatusModalOpen, setLegalStatusModalOpen] = useState<boolean>(false);
  const [newLegalStatus, setNewLegalStatus] = useState<string>('INVESTIGATION');
  const [legalRationale, setLegalRationale] = useState<string>('');
  const [legalAuthority, setLegalAuthority] = useState<string>('');
  const [legalJurisdiction, setLegalJurisdiction] = useState<string>('');

  // Passage refs for smooth scrolling
  const passageRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  // Fetch extraction bundle on article change
  useEffect(() => {
    if (!currentArticleId) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    setSaveNotice(null);
    setHighlightedPassageId(null);

    const loadData = async () => {
      try {
        const result = await apiClient.getArticleExtraction(currentArticleId);
        if (isMounted) {
          setBundle(result.bundle);
          setRawContent(result.rawContent);
          setTranslation(result.translation);
          if (result.article.language !== 'en' && result.translation) {
            setViewMode('side-by-side');
          } else {
            setViewMode('source');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.message || 'Failed to load extraction bundle.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentArticleId]);

  // Scroll to passage when highlighted
  const scrollToPassage = (passageId: string) => {
    setHighlightedPassageId(passageId);
    const element = passageRefs.current[passageId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Handle human correction submission
  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget || !currentArticleId || !correctionRationale.trim()) return;

    setIsSubmittingCorrection(true);
    setSaveNotice(null);

    try {
      const res = await apiClient.submitCorrection(currentArticleId, {
        targetType: correctionTarget.type,
        targetId: correctionTarget.id,
        operation: 'OVERRIDE',
        previousValue: correctionTarget.currentValue,
        correctedValue: correctionNewValue,
        rationale: correctionRationale,
      });

      setBundle(res.bundle);
      setSaveNotice(`Human correction recorded in audit trail for ${correctionTarget.label}.`);
      setCorrectionModalOpen(false);
      setCorrectionTarget(null);
      setCorrectionNewValue('');
      setCorrectionRationale('');
      if (onAuditRecorded) onAuditRecorded();
    } catch (err: any) {
      alert(`Error submitting correction: ${err.message}`);
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // Handle reverting a correction
  const handleRevertCorrection = async (correctionId: string) => {
    if (!currentArticleId) return;
    const rationale = prompt('Enter rationale for reverting this human correction:');
    if (!rationale) return;

    try {
      const res = await apiClient.revertCorrection(currentArticleId, correctionId, rationale);
      setBundle(res.bundle);
      setSaveNotice('Correction successfully reverted.');
      if (onAuditRecorded) onAuditRecorded();
    } catch (err: any) {
      alert(`Error reverting correction: ${err.message}`);
    }
  };

  // Handle re-extraction
  const handleTriggerReExtraction = async () => {
    if (!currentArticleId) return;
    setIsReExtracting(true);
    try {
      const result = await apiClient.reExtractArticle(currentArticleId, {
        promptVersion,
        modelVersion,
      });
      setBundle(result.bundle);
      setRawContent(result.rawContent);
      setTranslation(result.translation);
      setSaveNotice('Grounded evidence re-extracted and validated successfully.');
      setReExtractModalOpen(false);
      if (onAuditRecorded) onAuditRecorded();
    } catch (err: any) {
      alert(`Re-extraction failed: ${err.message}`);
    } finally {
      setIsReExtracting(false);
    }
  };

  // Handle legal status transition
  const handleTransitionLegalStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentArticleId || !legalRationale.trim()) return;

    try {
      await apiClient.updateLegalStatus(currentArticleId, {
        newStatus: newLegalStatus,
        rationale: legalRationale,
        authority: legalAuthority,
        jurisdiction: legalJurisdiction,
      });
      // Refresh bundle
      const refreshed = await apiClient.getArticleExtraction(currentArticleId);
      setBundle(refreshed.bundle);
      setSaveNotice(`Legal status transitioned to ${newLegalStatus}.`);
      setLegalStatusModalOpen(false);
      setLegalRationale('');
      if (onAuditRecorded) onAuditRecorded();
    } catch (err: any) {
      alert(`Status transition rejected: ${err.message}`);
    }
  };

  if (articles.length === 0) {
    return (
      <EmptyState
        title="No Articles Available for Review"
        description="Execute a screening run or import articles to initiate grounded NLP extraction and review."
        action={null}
      />
    );
  }

  return (
    <div id="evidence-review-workspace" className="space-y-4">
      {/* Top Header Bar: Article Selector & Model Metadata */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
            <Quote className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Grounded Evidence Review Mode</h2>
              <Badge variant="primary" size="sm">
                AM-21 – AM-27
              </Badge>
              {bundle?.lastExtractionRun.schemaCompliant && (
                <Badge variant="success" size="sm" icon={<ShieldCheck className="w-3 h-3" />}>
                  Validated
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              All statements, claims, and classifications are strictly grounded in verified source passages.
            </p>
          </div>
        </div>

        {/* Article Selector Dropdown & Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Select Evidence:</span>
            <select
              id="evidence-article-select"
              value={currentArticleId || ''}
              onChange={(e) => onSelectArticle && onSelectArticle(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 text-slate-800 max-w-[260px] truncate"
            >
              {articles.map((art) => (
                <option key={art.id} value={art.id}>
                  [{art.language.toUpperCase()}] {art.publisher} — {art.title.substring(0, 45)}...
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setReExtractModalOpen(true)}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Re-Extract
          </Button>
        </div>
      </div>

      {saveNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveNotice}</span>
          </div>
          <button onClick={() => setSaveNotice(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Split-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================================= */}
        {/* LEFT PANE: Full Article Text & Supporting Passages (6 of 12 cols on desktop) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[820px] overflow-hidden">
          {/* Left Pane Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Source Document & Passages
              </span>
              <Badge variant="outline" size="sm">
                v{bundle?.articleVersion || 1}
              </Badge>
              {activeArticle?.isRTL && (
                <Badge variant="info" size="sm">
                  RTL ({activeArticle.language.toUpperCase()})
                </Badge>
              )}
            </div>

            {/* Translation & Highlighting Controls */}
            <div className="flex items-center gap-1.5">
              {translation && (
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('source')}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                      viewMode === 'source' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Source
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('side-by-side')}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                      viewMode === 'side-by-side'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Side-by-Side
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('translated')}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                      viewMode === 'translated'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    English
                  </button>
                </div>
              )}

              {highlightedPassageId && (
                <button
                  type="button"
                  onClick={() => setHighlightedPassageId(null)}
                  className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg flex items-center gap-1"
                  title="Clear Passage Selection"
                >
                  <X className="w-3 h-3" /> Clear Active
                </button>
              )}
            </div>
          </div>

          {/* Article Header Metadata inside Reader */}
          <div className="px-5 py-3.5 bg-slate-50/60 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 leading-snug">{activeArticle?.title}</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1.5">
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {activeArticle?.publisher} ({activeArticle?.domain})
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {activeArticle?.metadata?.publicationDate?.date
                  ? new Date(activeArticle.metadata.publicationDate.date).toLocaleDateString()
                  : 'Date unknown'}
              </span>
              <span className="flex items-center gap-1">
                <Globe2 className="w-3.5 h-3.5 text-slate-400" />
                {activeArticle?.metadata?.publicationLocation || 'Location unspecified'}
              </span>
            </div>
          </div>

          {/* Document Content Scroll Area */}
          <div className="flex-1 overflow-y-auto p-5 font-sans leading-relaxed text-slate-800 text-sm">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span className="text-xs">Loading grounded document text and passages...</span>
              </div>
            ) : viewMode === 'side-by-side' && translation ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original Source Column */}
                <div className="border-r border-slate-100 pr-3" dir={activeArticle?.isRTL ? 'rtl' : 'ltr'}>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Original [{activeArticle?.language.toUpperCase()}]
                  </div>
                  {renderPassageAnnotatedText(
                    rawContent,
                    bundle?.passages || [],
                    highlightedPassageId,
                    scrollToPassage,
                    passageRefs,
                    false
                  )}
                </div>
                {/* English Translation Column */}
                <div className="pl-1">
                  <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-2">
                    English Translation
                  </div>
                  <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-sans">{translation}</div>
                </div>
              </div>
            ) : viewMode === 'translated' && translation ? (
              <div>
                <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-2">
                  Verified Translation
                </div>
                <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-sans">{translation}</div>
              </div>
            ) : (
              <div dir={activeArticle?.isRTL ? 'rtl' : 'ltr'}>
                {renderPassageAnnotatedText(
                  rawContent,
                  bundle?.passages || [],
                  highlightedPassageId,
                  scrollToPassage,
                  passageRefs,
                  false
                )}
              </div>
            )}
          </div>

          {/* Left Pane Footer: Passage Navigation Legend */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Grounded Passages:</span>
              <span className="font-bold text-indigo-600">{bundle?.passages.length || 0}</span>
              <span>extracted with exact character offsets</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
              <span>Selected Passage</span>
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-200 inline-block ml-2"></span>
              <span>Available Citation</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANE: Grounded Extractions (AM-21 through AM-27) (6 of 12 cols)     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[820px] overflow-hidden">
          {/* Section Navigation Tabs */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveSection('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeSection === 'all'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Unified Review
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('summary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeSection === 'summary'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Claims ({bundle?.summary.claims.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('classifications')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeSection === 'classifications'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Taxonomy ({bundle?.classifications.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('legal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeSection === 'legal'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Legal Status
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('entities')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeSection === 'entities'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Entities ({bundle?.entities.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('jurisdictions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeSection === 'jurisdictions'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Jurisdiction
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('facts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeSection === 'facts'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Facts ({bundle?.materialFacts.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('corrections')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeSection === 'corrections'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Audit ({bundle?.corrections.length || 0})
            </button>
          </div>

          {/* Model & Run Metadata Strip */}
          <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
            <div className="flex items-center gap-3">
              <span>
                Model: <strong className="text-slate-700">{bundle?.summary.modelId}</strong>
              </span>
              <span>
                Prompt: <strong className="text-slate-700">{bundle?.summary.promptVersion}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" /> Citation Integrity: 100%
              </span>
            </div>
          </div>

          {/* Right Pane Scroll Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* AM-21: Citation-backed Article Summary */}
            {(activeSection === 'all' || activeSection === 'summary') && (
              <div id="section-summary-claims" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Quote className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      AM-21 Citation-Backed Article Summary
                    </h4>
                  </div>
                  <Badge variant="primary" size="sm">
                    {bundle?.summary.claims.length || 0} Grounded Claims
                  </Badge>
                </div>

                {/* Executive Summary Card */}
                <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-slate-800 leading-relaxed font-sans">
                  <span className="font-bold text-indigo-950 block mb-1 text-[11px] uppercase tracking-wider">
                    Executive Briefing
                  </span>
                  {bundle?.summary.executiveSummary}
                </div>

                {/* Structured Claims Breakdown */}
                <div className="space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Categorized Claims & Evidence Links
                  </div>
                  {bundle?.summary.claims.map((claim) => {
                    const isLinkedToActive =
                      highlightedPassageId && claim.supportingPassageIds.includes(highlightedPassageId);

                    return (
                      <div
                        key={claim.id}
                        className={`p-3 rounded-xl border transition-all text-xs ${
                          isLinkedToActive
                            ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-200 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {renderClaimCategoryBadge(claim.category)}
                            {claim.isVerifiedFinding && (
                              <Badge variant="success" size="sm">
                                Verified
                              </Badge>
                            )}
                            {claim.isContradiction && (
                              <Badge variant="danger" size="sm" icon={<AlertTriangle className="w-3 h-3" />}>
                                Contradiction
                              </Badge>
                            )}
                          </div>

                          {/* Correct Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setCorrectionTarget({
                                type: 'SUMMARY_CLAIM',
                                id: claim.id,
                                label: `Claim (${claim.category})`,
                                currentValue: claim.claimText,
                              });
                              setCorrectionNewValue(claim.claimText);
                              setCorrectionModalOpen(true);
                            }}
                            className="text-slate-400 hover:text-indigo-600 p-1 rounded-md transition-all"
                            title="Propose Human Correction"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="mt-2 text-slate-800 font-sans leading-relaxed">{claim.claimText}</p>

                        {claim.contradictionDetails && (
                          <div className="mt-2 p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-[11px] flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{claim.contradictionDetails}</span>
                          </div>
                        )}

                        {/* Citation Footnotes */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-slate-500 font-medium">Cites:</span>
                            {claim.supportingPassageIds.map((psgId) => (
                              <button
                                key={psgId}
                                type="button"
                                onClick={() => scrollToPassage(psgId)}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                                  highlightedPassageId === psgId
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                                }`}
                              >
                                <Quote className="w-2.5 h-2.5" />
                                {formatPassageName(psgId)}
                              </button>
                            ))}
                          </div>
                          <span className="text-slate-400">Confidence: {(claim.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AM-22: Versioned Adverse-Event Classification */}
            {(activeSection === 'all' || activeSection === 'classifications') && (
              <div id="section-classifications" className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      AM-22 Multi-Label Taxonomy Classification
                    </h4>
                  </div>
                  <Badge variant="outline" size="sm">
                    {bundle?.classifications[0]?.taxonomyVersionId || 'AML-TAX-v2.1'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {bundle?.classifications.map((cls) => {
                    const isLinkedToActive =
                      highlightedPassageId && cls.evidencePassageIds.includes(highlightedPassageId);

                    return (
                      <div
                        key={cls.id}
                        className={`p-3 rounded-xl border transition-all text-xs ${
                          isLinkedToActive
                            ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-200 shadow-xs'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{cls.categoryName}</span>
                            <Badge variant={cls.status === 'CONFIRMED' ? 'success' : 'warning'} size="sm">
                              {cls.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 font-semibold">
                              {(cls.confidence * 100).toFixed(0)}%
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setCorrectionTarget({
                                  type: 'EVENT_CLASSIFICATION',
                                  id: cls.id,
                                  label: `Taxonomy Category [${cls.categoryCode}]`,
                                  currentValue: cls.status,
                                });
                                setCorrectionNewValue(cls.status === 'CONFIRMED' ? 'REJECTED' : 'CONFIRMED');
                                setCorrectionModalOpen(true);
                              }}
                              className="text-slate-400 hover:text-indigo-600 p-1 rounded-md"
                              title="Adjudicate / Override Category"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="mt-1.5 text-slate-600 text-xs">{cls.rationale}</p>

                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-slate-500 font-medium">Evidence:</span>
                            {cls.evidencePassageIds.map((psgId) => (
                              <button
                                key={psgId}
                                type="button"
                                onClick={() => scrollToPassage(psgId)}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                              >
                                {formatPassageName(psgId)}
                              </button>
                            ))}
                          </div>
                          <span className="text-slate-400">Assigned by: {cls.assignedBy}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AM-23: Legal and Procedural Status Machine */}
            {(activeSection === 'all' || activeSection === 'legal') && bundle?.legalStatus && (
              <div id="section-legal-status" className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-purple-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      AM-23 Legal & Procedural Status Machine
                    </h4>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNewLegalStatus(bundle.legalStatus?.status || 'INVESTIGATION');
                      setLegalAuthority(bundle.legalStatus?.authority || '');
                      setLegalJurisdiction(bundle.legalStatus?.jurisdiction || '');
                      setLegalStatusModalOpen(true);
                    }}
                    icon={<RotateCcw className="w-3 h-3" />}
                  >
                    Transition Status
                  </Button>
                </div>

                <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">Current Status:</span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-purple-600 text-white shadow-xs">
                        {bundle.legalStatus.status}
                      </span>
                      {bundle.legalStatus.previousStatus && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          (previously: <span className="line-through">{bundle.legalStatus.previousStatus}</span>)
                        </span>
                      )}
                    </div>
                    <Badge variant="success" size="sm">
                      {bundle.legalStatus.validationState}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600">
                    <div>
                      <span className="text-slate-400 block">Authority:</span>
                      <strong className="text-slate-800">{bundle.legalStatus.authority || 'Not Specified'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Jurisdiction:</span>
                      <strong className="text-slate-800">{bundle.legalStatus.jurisdiction || 'Not Specified'}</strong>
                    </div>
                  </div>

                  {bundle.legalStatus.transitionRationale && (
                    <div className="pt-2 border-t border-purple-100 text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-700">Evidentiary Rationale: </span>
                      {bundle.legalStatus.transitionRationale}
                    </div>
                  )}

                  <div className="pt-2 border-t border-purple-100 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-500 font-medium">Supporting Evidence:</span>
                      {bundle.legalStatus.evidencePassageIds.map((psgId) => (
                        <button
                          key={psgId}
                          type="button"
                          onClick={() => scrollToPassage(psgId)}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-300"
                        >
                          {formatPassageName(psgId)}
                        </button>
                      ))}
                    </div>
                    <span className="text-slate-400">Confidence: {(bundle.legalStatus.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* AM-24: Entity & Participant Extraction */}
            {(activeSection === 'all' || activeSection === 'entities') && (
              <div id="section-entities" className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      AM-24 Entities & Disambiguated Participants
                    </h4>
                  </div>
                  <Badge variant="primary" size="sm">
                    {bundle?.entities.length || 0} Entities
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {bundle?.entities.map((ent) => {
                    const isLinkedToActive =
                      highlightedPassageId && ent.evidencePassageIds.includes(highlightedPassageId);

                    return (
                      <div
                        key={ent.id}
                        className={`p-3 rounded-xl border transition-all text-xs ${
                          isLinkedToActive
                            ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-200 shadow-xs'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {ent.entityType === 'PERSON' ? (
                              <User className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <Building className="w-3.5 h-3.5 text-blue-600" />
                            )}
                            <span className="font-bold text-slate-900">{ent.name}</span>
                            {ent.isScreenedSubjectMatch && (
                              <Badge variant="success" size="sm">
                                Subject Match
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {ent.participantRole}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setCorrectionTarget({
                                  type: 'ENTITY',
                                  id: ent.id,
                                  label: `Participant Role [${ent.name}]`,
                                  currentValue: ent.participantRole,
                                });
                                setCorrectionNewValue(ent.participantRole);
                                setCorrectionModalOpen(true);
                              }}
                              className="text-slate-400 hover:text-indigo-600 p-1 rounded-md"
                              title="Correct Role / Entity Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {ent.relationships && ent.relationships.length > 0 && (
                          <div className="mt-1.5 text-[11px] text-slate-600">
                            <span className="text-slate-400">Relations: </span>
                            {ent.relationships.map((r, idx) => (
                              <span key={idx} className="font-medium text-slate-700">
                                {r.relationshipType} → {r.targetEntityName}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-slate-500 font-medium">Citations:</span>
                            {ent.evidencePassageIds.map((psgId) => (
                              <button
                                key={psgId}
                                type="button"
                                onClick={() => scrollToPassage(psgId)}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                              >
                                {formatPassageName(psgId)}
                              </button>
                            ))}
                          </div>
                          <span className="text-slate-400">Confidence: {(ent.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AM-25: Disentangled Jurisdictions & Locations */}
            {(activeSection === 'all' || activeSection === 'jurisdictions') && (
              <div id="section-jurisdictions" className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      AM-25 Disentangled Jurisdictions & Locations
                    </h4>
                  </div>
                  <Badge variant="primary" size="sm">
                    {bundle?.jurisdictions.length || 0} Assertions
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {bundle?.jurisdictions.map((jur) => {
                    const isLinkedToActive =
                      highlightedPassageId && jur.evidencePassageIds.includes(highlightedPassageId);

                    return (
                      <div
                        key={jur.id}
                        className={`p-3 rounded-xl border transition-all text-xs ${
                          isLinkedToActive
                            ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-200 shadow-xs'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                              {jur.countryCode}
                            </span>
                            <span className="font-bold text-slate-900">{jur.countryName}</span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-semibold">
                            {(jur.confidence * 100).toFixed(0)}% Conf
                          </span>
                        </div>

                        {/* Disentangled Matrix */}
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px]">
                          <div>
                            <span className="text-slate-400 block">Legal Jurisdiction:</span>
                            <strong className="text-slate-800">{jur.legalJurisdiction || 'N/A'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Event Location:</span>
                            <strong className="text-slate-800">{jur.eventLocation || 'N/A'}</strong>
                          </div>
                          {jur.courtLocation && (
                            <div>
                              <span className="text-slate-400 block">Court Location:</span>
                              <strong className="text-slate-800">{jur.courtLocation}</strong>
                            </div>
                          )}
                          {jur.crossBorderLinkage && (
                            <div className="col-span-2 p-1.5 bg-slate-50 border border-slate-200 rounded-md">
                              <span className="text-slate-500 font-semibold block">Cross-Border Linkage:</span>
                              <div className="text-slate-700 flex items-center gap-1.5 mt-0.5">
                                <span className="font-bold">{jur.crossBorderLinkage.originCountry}</span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span className="font-bold">{jur.crossBorderLinkage.destinationCountry}</span>
                                <span className="text-slate-500 text-[10px]">({jur.crossBorderLinkage.nexusReason})</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-slate-500 font-medium">Evidence:</span>
                            {jur.evidencePassageIds.map((psgId) => (
                              <button
                                key={psgId}
                                type="button"
                                onClick={() => scrollToPassage(psgId)}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                              >
                                {formatPassageName(psgId)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AM-26: Material Fact Extraction */}
            {(activeSection === 'all' || activeSection === 'facts') && (
              <div id="section-material-facts" className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      AM-26 Material Fact Extraction
                    </h4>
                  </div>
                  <Badge variant="primary" size="sm">
                    {bundle?.materialFacts.length || 0} Facts
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {bundle?.materialFacts.map((fact) => {
                    const isLinkedToActive =
                      highlightedPassageId && fact.evidencePassageIds.includes(highlightedPassageId);

                    return (
                      <div
                        key={fact.id}
                        className={`p-3 rounded-xl border transition-all text-xs ${
                          isLinkedToActive
                            ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-200 shadow-xs'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {fact.factType}
                            </span>
                            <span className="font-bold text-slate-800">{fact.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={fact.verificationState === 'VERIFIED' ? 'success' : 'neutral'} size="sm">
                              {fact.verificationState}
                            </Badge>
                            <button
                              type="button"
                              onClick={() => {
                                setCorrectionTarget({
                                  type: 'MATERIAL_FACT',
                                  id: fact.id,
                                  label: `Fact [${fact.label}]`,
                                  currentValue: fact.value,
                                });
                                setCorrectionNewValue(fact.value);
                                setCorrectionModalOpen(true);
                              }}
                              className="text-slate-400 hover:text-indigo-600 p-1 rounded-md"
                              title="Propose Fact Correction"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold text-xs">
                          {fact.value}
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-slate-500 font-medium">Evidence:</span>
                            {fact.evidencePassageIds.map((psgId) => (
                              <button
                                key={psgId}
                                type="button"
                                onClick={() => scrollToPassage(psgId)}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                              >
                                {formatPassageName(psgId)}
                              </button>
                            ))}
                          </div>
                          <span className="text-slate-400">Confidence: {(fact.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AM-27: Supporting-Passage Browser */}
            {(activeSection === 'all' || activeSection === 'passages') && (
              <div id="section-passages" className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      AM-27 Supporting-Passage Index
                    </h4>
                  </div>
                  <Badge variant="primary" size="sm">
                    {bundle?.passages.length || 0} Passages
                  </Badge>
                </div>

                <div className="space-y-2">
                  {bundle?.passages.map((psg) => {
                    const isSelected = highlightedPassageId === psg.id;

                    return (
                      <div
                        key={psg.id}
                        onClick={() => scrollToPassage(psg.id)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-indigo-700">{formatPassageName(psg.id)}</span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              [{psg.startOffset}..{psg.endOffset}]
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Confidence: {(psg.extractionConfidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-slate-800 font-sans italic">"{psg.text}"</p>
                        {psg.translation && (
                          <p className="text-slate-600 font-sans text-[11px] mt-1 pt-1 border-t border-slate-100">
                            <strong>Translation:</strong> {psg.translation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Human Corrections & Audit Trail */}
            {(activeSection === 'all' || activeSection === 'corrections') && (
              <div id="section-corrections" className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Human Review & Correction History
                    </h4>
                  </div>
                  <Badge variant="neutral" size="sm">
                    {bundle?.corrections.length || 0} Adjustments
                  </Badge>
                </div>

                {(!bundle?.corrections || bundle.corrections.length === 0) ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                    No human corrections have been applied to this article extraction yet. All values match model
                    grounding.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bundle.corrections.map((corr) => (
                      <div
                        key={corr.id}
                        className="p-3 rounded-xl border border-slate-200 bg-white text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{corr.targetType}</span>
                            <Badge variant="outline" size="sm">
                              {corr.operation}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400">
                              {new Date(corr.timestamp).toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRevertCorrection(corr.id)}
                              className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold"
                            >
                              Revert
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] p-2 bg-slate-50 rounded-lg">
                          <div>
                            <span className="text-slate-400 block">Original:</span>
                            <span className="text-slate-600 line-through">
                              {typeof corr.previousValue === 'object'
                                ? JSON.stringify(corr.previousValue)
                                : String(corr.previousValue || 'None')}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Corrected:</span>
                            <span className="font-bold text-slate-900">
                              {typeof corr.correctedValue === 'object'
                                ? JSON.stringify(corr.correctedValue)
                                : String(corr.correctedValue)}
                            </span>
                          </div>
                        </div>

                        <p className="text-slate-600 text-[11px]">
                          <strong>Rationale:</strong> {corr.rationale}
                        </p>
                        <div className="text-[10px] text-slate-400">
                          By: {corr.actor.name} ({corr.actor.role})
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Human Correction Modal */}
      {correctionModalOpen && correctionTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Propose Human Correction</h3>
              </div>
              <button
                type="button"
                onClick={() => setCorrectionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCorrection} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Element</label>
                <div className="p-2.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-800">
                  {correctionTarget.label}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Current Extracted Value</label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-mono">
                  {typeof correctionTarget.currentValue === 'object'
                    ? JSON.stringify(correctionTarget.currentValue)
                    : String(correctionTarget.currentValue)}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Corrected Value <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={correctionNewValue}
                  onChange={(e) => setCorrectionNewValue(e.target.value)}
                  className="w-full text-xs font-sans p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  placeholder="Enter corrected value or text..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Mandatory Adjudication Rationale <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={correctionRationale}
                  onChange={(e) => setCorrectionRationale(e.target.value)}
                  className="w-full text-xs font-sans p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  placeholder="Explain why this correction is necessary (recorded in audit trail)..."
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  All human overrides are recorded in the irreversible audit log with actor ID ({activeRole}) and
                  timestamp.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setCorrectionModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isSubmittingCorrection}>
                  {isSubmittingCorrection ? 'Recording...' : 'Record Correction'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Legal Status Transition Modal */}
      {legalStatusModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Legal & Procedural Status Transition</h3>
              </div>
              <button
                type="button"
                onClick={() => setLegalStatusModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTransitionLegalStatus} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">New Legal Status</label>
                <select
                  value={newLegalStatus}
                  onChange={(e) => setNewLegalStatus(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ALLEGATION">ALLEGATION (Initial media / whistleblower claim)</option>
                  <option value="INVESTIGATION">INVESTIGATION (Official inquest opened by authority)</option>
                  <option value="FORMAL_CHARGE">FORMAL_CHARGE (Indictment / criminal charges filed)</option>
                  <option value="TRIAL">TRIAL (Court proceedings actively scheduled / heard)</option>
                  <option value="CONVICTION">CONVICTION (Guilty verdict / civil liability ruling)</option>
                  <option value="ACQUITTAL">ACQUITTAL (Exonerated on merits by judicial ruling)</option>
                  <option value="DISMISSAL">DISMISSAL (Charges / freezing order dismissed)</option>
                  <option value="SETTLEMENT">SETTLEMENT (Regulatory consent decree / remediation)</option>
                  <option value="APPEAL">APPEAL (Post-verdict judicial appeal)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Authority Name</label>
                <input
                  type="text"
                  value={legalAuthority}
                  onChange={(e) => setLegalAuthority(e.target.value)}
                  placeholder="e.g. Geneva Cantonal Prosecutor / Swiss Federal Criminal Court"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Governing Jurisdiction</label>
                <input
                  type="text"
                  value={legalJurisdiction}
                  onChange={(e) => setLegalJurisdiction(e.target.value)}
                  placeholder="e.g. Switzerland (Canton of Geneva)"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Evidentiary Transition Rationale <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={legalRationale}
                  onChange={(e) => setLegalRationale(e.target.value)}
                  placeholder="Cite official docket, court order, or official press release..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setLegalStatusModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Execute Transition
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Re-Extract Parameters Modal */}
      {reExtractModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Re-Extract Grounded Evidence</h3>
              </div>
              <button
                type="button"
                onClick={() => setReExtractModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                Execute a fresh extraction job against source article text using validated AML prompt templates and
                taxonomies.
              </p>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Model Version</label>
                <select
                  value={modelVersion}
                  onChange={(e) => setModelVersion(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                >
                  <option value="gemini-2.5-pro-extract-hybrid">gemini-2.5-pro-extract-hybrid (Deterministic)</option>
                  <option value="gemini-2.5-flash-grounded-aml">gemini-2.5-flash-grounded-aml (High Speed)</option>
                  <option value="aml-classifier-v3-expert">aml-classifier-v3-expert (Legal & Regulatory)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Prompt Template Version</label>
                <select
                  value={promptVersion}
                  onChange={(e) => setPromptVersion(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                >
                  <option value="prompt-aml-extract-v3.2">prompt-aml-extract-v3.2 (Default Strict Offsets)</option>
                  <option value="prompt-aml-extract-v3.1">prompt-aml-extract-v3.1 (Legacy Standard)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setReExtractModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleTriggerReExtraction} disabled={isReExtracting}>
                  {isReExtracting ? 'Extracting...' : 'Run Extraction'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// Helper: Renders text with interactive highlighted passage spans
// =========================================================================
function renderPassageAnnotatedText(
  fullText: string,
  passages: EvidencePassage[],
  activePassageId: string | null,
  onPassageClick: (passageId: string) => void,
  passageRefs: React.MutableRefObject<Record<string, HTMLSpanElement | null>>,
  rtl = false
) {
  if (!fullText) {
    return <p className="text-slate-400 italic">No article content available.</p>;
  }

  if (!passages || passages.length === 0) {
    return <div className="whitespace-pre-wrap leading-relaxed">{fullText}</div>;
  }

  // Sort passages by startOffset
  const sorted = [...passages].sort((a, b) => a.startOffset - b.startOffset);

  const segments: React.ReactNode[] = [];
  let currentIndex = 0;

  sorted.forEach((psg, idx) => {
    // Check if passage start offset is valid
    if (psg.startOffset > currentIndex && psg.startOffset <= fullText.length) {
      segments.push(
        <span key={`text-before-${idx}`}>{fullText.substring(currentIndex, psg.startOffset)}</span>
      );
    }

    const isHighlighted = activePassageId === psg.id;
    const passageSlice = fullText.substring(psg.startOffset, Math.min(psg.endOffset, fullText.length));

    segments.push(
      <span
        key={psg.id}
        ref={(el) => (passageRefs.current[psg.id] = el)}
        onClick={() => onPassageClick(psg.id)}
        className={`inline rounded-sm px-1 py-0.5 cursor-pointer transition-all ${
          isHighlighted
            ? 'bg-amber-300/80 text-amber-950 font-medium ring-2 ring-amber-400 shadow-xs'
            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border-b-2 border-indigo-400'
        }`}
        title={`Passage #${psg.passageIndex} (Click to inspect backing claims)`}
      >
        <span
          className={`inline-block mr-1 text-[10px] font-black px-1 rounded-sm leading-none select-none ${
            isHighlighted ? 'bg-amber-600 text-white' : 'bg-indigo-600 text-white'
          }`}
        >
          P{psg.passageIndex}
        </span>
        {passageSlice}
      </span>
    );

    currentIndex = Math.max(currentIndex, psg.endOffset);
  });

  if (currentIndex < fullText.length) {
    segments.push(<span key="text-end">{fullText.substring(currentIndex)}</span>);
  }

  return <div className="whitespace-pre-wrap leading-relaxed">{segments}</div>;
}

function formatPassageName(psgId: string): string {
  const parts = psgId.split('-');
  const last = parts[parts.length - 1];
  return `Passage ${last}`;
}

function renderClaimCategoryBadge(category: string) {
  const badgeMap: Record<string, { label: string; variant: BadgeVariant }> = {
    REPORTED_ALLEGATIONS: { label: 'Reported Allegation', variant: 'warning' },
    REPORTED_FACTS: { label: 'Reported Fact', variant: 'info' },
    VERIFIED_FINDINGS: { label: 'Verified Finding', variant: 'success' },
    LEGAL_PROCEDURAL_OUTCOMES: { label: 'Procedural Outcome', variant: 'primary' },
    UNRESOLVED_POINTS: { label: 'Unresolved Point', variant: 'neutral' },
    CONTRADICTORY_INFORMATION: { label: 'Contradiction', variant: 'danger' },
  };

  const conf = badgeMap[category] || { label: category, variant: 'neutral' };
  return (
    <Badge variant={conf.variant} size="sm">
      {conf.label}
    </Badge>
  );
}

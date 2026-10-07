import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Building,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Columns,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  GitMerge,
  Globe2,
  Layers,
  LayoutGrid,
  Newspaper,
  Quote,
  Repeat,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Split,
  Table as TableIcon,
} from 'lucide-react';
import {
  Article,
  AdverseMediaArticle,
  EventCategory,
  SavedView,
  UserRole,
  AdverseEvent,
  TimelineEntry,
  DuplicateAssessment,
  ArticleCluster,
  SourceRoleAssessment,
  SourceRole,
} from '../../../types/index.ts';
import { apiClient } from '../../../lib/api-client.ts';
import { Badge, BadgeVariant } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';
import { EmptyState } from '../../common/EmptyState.tsx';
import { SavedViewsBar } from '../evidence/SavedViewsBar.tsx';
import { ArticleDetailDrawer } from '../evidence/ArticleDetailDrawer.tsx';
import { EvidenceReviewWorkspace } from '../evidence/EvidenceReviewWorkspace.tsx';
import { EventsList } from '../events/EventsList.tsx';
import { EventDetailModal } from '../events/EventDetailModal.tsx';
import { MergeEventsModal } from '../events/MergeEventsModal.tsx';
import { SplitEventModal } from '../events/SplitEventModal.tsx';
import { DuplicateSyndicationHub } from '../events/DuplicateSyndicationHub.tsx';

interface EventsEvidenceAreaProps {
  articles: (Article | AdverseMediaArticle)[];
  onExecuteScreening: () => void;
  activeRole?: UserRole;
  onArticlesChange?: () => void;
  caseId?: string;
  subjectName?: string;
}

interface ColumnConfig {
  pubDate: boolean;
  retrievalDate: boolean;
  language: boolean;
  publisher: boolean;
  subject: boolean;
  category: boolean;
  severity: boolean;
  identity: boolean;
  legalStatus: boolean;
  credibility: boolean;
  materiality: boolean;
  coverage: boolean;
}

const DEFAULT_COLUMNS: ColumnConfig = {
  pubDate: true,
  retrievalDate: true,
  language: true,
  publisher: true,
  subject: true,
  category: true,
  severity: true,
  identity: true,
  legalStatus: true,
  credibility: true,
  materiality: true,
  coverage: true,
};

// Convert any legacy AdverseMediaArticle to an Article shape if necessary
function normalizeToArticle(item: Article | AdverseMediaArticle): Article {
  if ('currentVersion' in item && 'metadata' in item) {
    return item as Article;
  }

  const legacy = item as AdverseMediaArticle;
  return {
    id: legacy.id,
    caseId: 'case-default',
    subjectId: 'subj-default',
    screeningRunId: 'run-default',
    connectorId: legacy.connectorId || 'conn-default',
    title: legacy.title,
    canonicalUrl: legacy.url,
    domain: legacy.domain,
    publisher: legacy.publisher,
    author: 'Reporter Staff',
    language: legacy.language || 'en',
    isRTL: legacy.language === 'ar',
    contentHash: 'sha256-hash-' + legacy.id,
    accessStatus: 'ACCESSIBLE',
    currentVersion: 1,
    versions: [],
    metadata: {
      id: 'meta-' + legacy.id,
      articleId: legacy.id,
      canonicalUrl: legacy.url,
      publisher: legacy.publisher,
      publisherStatus: 'VERIFIED',
      author: 'Reporter Staff',
      authorStatus: 'PROVIDER_REPORTED',
      publicationLocation: 'London, UK',
      publicationLocationStatus: 'PROVIDER_REPORTED',
      publicationDate: {
        date: legacy.publishedDate,
        confidenceState: 'VERIFIED',
        sourceField: 'HTTP_HEADER_LAST_MODIFIED',
      },
      languageAssessment: {
        detectedLanguage: legacy.language || 'en',
        confidence: 0.98,
        method: 'STATISTICAL_N_GRAM',
        isRTL: legacy.language === 'ar',
        script: legacy.language === 'ar' ? 'ARAB' : legacy.language === 'hi' ? 'DEVA' : legacy.language === 'ml' ? 'MLYM' : legacy.language === 'ru' ? 'CYRL' : 'LATN',
      },
      providerMetadata: {},
      normalizedMetadata: {
        cleanTitle: legacy.title,
        cleanPublisher: legacy.publisher,
        normalizedDomain: legacy.domain,
        normalizedKeywords: legacy.matchedAliases || [],
        sentimentScore: legacy.sentimentScore || -0.5,
        severity: legacy.severity,
        eventCategories: legacy.eventCategories || [],
      },
    },
    identityAssessment: 'NOT_ASSESSED',
    legalStatus: 'Not assessed',
    credibility: 'Not assessed',
    materiality: 'Not assessed',
    relevanceScore: legacy.relevanceScore || 0.85,
    severity: legacy.severity,
    matchedAliases: legacy.matchedAliases || [],
    matchedKeywords: [],
    retrievalRecordId: 'ret-' + legacy.id,
    createdAt: legacy.publishedDate || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const EventsEvidenceArea: React.FC<EventsEvidenceAreaProps> = ({
  articles,
  onExecuteScreening,
  activeRole = 'ANALYST',
  onArticlesChange,
  caseId,
  subjectName = 'Alexander Vance',
}) => {
  const [activeViewId, setActiveViewId] = useState<string>('view-system-all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedAccess, setSelectedAccess] = useState<string>('ALL');
  const [selectedDateConfidence, setSelectedDateConfidence] = useState<string>('ALL');
  const [selectedIdentityMatch, setSelectedIdentityMatch] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('relevance');

  // AM-11 View Mode: Dense Table vs Visual Cards
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // AM-11 Column Configuration
  const [columns, setColumns] = useState<ColumnConfig>(DEFAULT_COLUMNS);
  const [showColumnChooser, setShowColumnChooser] = useState(false);

  // AM-11 Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected article for Level 2 Side-Drawer inspection (never losing list context!)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Normalize all articles
  const normalizedArticles = useMemo(() => {
    return (articles || []).map(normalizeToArticle);
  }, [articles]);

  // Deep linking: Inspect URL parameters on initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const articleParam = params.get('articleId');
      if (articleParam && !selectedArticle) {
        const found = normalizedArticles.find((a) => a.id === articleParam);
        if (found) {
          setSelectedArticle(found);
        }
      }
    }
  }, [normalizedArticles]);

  // Sync URL query param when article selection changes
  const handleSelectArticle = (art: Article | null) => {
    setSelectedArticle(art);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (art) {
        url.searchParams.set('articleId', art.id);
      } else {
        url.searchParams.delete('articleId');
      }
      window.history.replaceState(null, '', url.toString());
    }
  };

  const handleCopyLink = (artId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('articleId', artId);
      navigator.clipboard.writeText(url.toString());
      setCopiedId(artId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // AM-16 to AM-27 Investigation Unit Mode: 'events' is the default unit of investigation!
  const [investigationMode, setInvestigationMode] = useState<'events' | 'evidence-review' | 'articles' | 'clustering'>('events');
  const [reviewArticleId, setReviewArticleId] = useState<string | null>(null);
  const [events, setEvents] = useState<AdverseEvent[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateAssessment[]>([]);
  const [clusters, setClusters] = useState<ArticleCluster[]>([]);
  const [sourceRoles, setSourceRoles] = useState<SourceRoleAssessment[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<AdverseEvent | null>(null);
  const [mergeModalEvent, setMergeModalEvent] = useState<AdverseEvent | null>(null);
  const [splitModalEvent, setSplitModalEvent] = useState<AdverseEvent | null>(null);
  const [isReclustering, setIsReclustering] = useState<boolean>(false);
  const [selectedLegalStatusFilter, setSelectedLegalStatusFilter] = useState<string>('ALL');

  const loadEventsData = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const [evts, dups, cls, sRoles] = await Promise.all([
        apiClient.getEvents({ caseId }),
        apiClient.getDuplicates(),
        apiClient.getClusters(),
        apiClient.getSourceRoles(),
      ]);
      setEvents(evts || []);
      setDuplicates(dups || []);
      setClusters(cls || []);
      setSourceRoles(sRoles || []);
    } catch (err) {
      console.error('Failed to load events data:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadEventsData();
  }, [loadEventsData]);

  // Keep selectedEventForDetail synchronized with fresh event data
  useEffect(() => {
    if (selectedEventForDetail) {
      const refreshed = events.find((e) => e.id === selectedEventForDetail.id);
      if (refreshed) {
        setSelectedEventForDetail(refreshed);
      }
    }
  }, [events]);

  const handleConfirmEvent = async (eventId: string) => {
    try {
      await apiClient.updateEvent(eventId, { reviewStatus: 'CONFIRMED' });
      await loadEventsData();
    } catch (err) {
      console.error('Failed to confirm event:', err);
    }
  };

  const handleDismissEvent = async (eventId: string) => {
    try {
      await apiClient.updateEvent(eventId, { reviewStatus: 'DISMISSED' });
      await loadEventsData();
    } catch (err) {
      console.error('Failed to dismiss event:', err);
    }
  };

  const handleUpdateEventMetadata = async (eventId: string, updates: Partial<AdverseEvent>) => {
    try {
      await apiClient.updateEvent(eventId, updates);
      await loadEventsData();
    } catch (err) {
      console.error('Failed to update event metadata:', err);
    }
  };

  const handleMergeEvents = async (primaryId: string, secondaryId: string, rationale: string) => {
    try {
      await apiClient.mergeEvents(primaryId, secondaryId, rationale);
      await loadEventsData();
      setMergeModalEvent(null);
    } catch (err) {
      console.error('Failed to merge events:', err);
    }
  };

  const handleSplitEvent = async (sourceId: string, splitArticles: string[], newTitle: string, rationale: string) => {
    try {
      await apiClient.splitEvent(sourceId, splitArticles, newTitle, rationale);
      await loadEventsData();
      setSplitModalEvent(null);
    } catch (err) {
      console.error('Failed to split event:', err);
    }
  };

  const handleReassignArticle = async (articleId: string, fromId: string, toId: string, rationale: string) => {
    try {
      await apiClient.reassignArticle(articleId, fromId, toId, rationale);
      await loadEventsData();
    } catch (err) {
      console.error('Failed to reassign article:', err);
    }
  };

  const handleOverrideSourceRole = async (articleId: string, role: SourceRole, rationale: string) => {
    try {
      await apiClient.overrideSourceRole(articleId, role, rationale);
      await loadEventsData();
    } catch (err) {
      console.error('Failed to override source role:', err);
    }
  };

  const handleAddTimelineEntry = async (eventId: string, entry: Partial<TimelineEntry>) => {
    try {
      await apiClient.addTimelineEntry(eventId, entry);
      await loadEventsData();
    } catch (err) {
      console.error('Failed to add timeline entry:', err);
    }
  };

  const handleDeleteTimelineEntry = async (eventId: string, entryId: string) => {
    try {
      await apiClient.deleteTimelineEntry(eventId, entryId);
      await loadEventsData();
    } catch (err) {
      console.error('Failed to delete timeline entry:', err);
    }
  };

  const handleAdjudicateDuplicate = async (assessmentId: string, status: string, rationale: string) => {
    try {
      await apiClient.overrideDuplicate(assessmentId, status, rationale);
      await loadEventsData();
    } catch (err) {
      console.error('Failed to adjudicate duplicate:', err);
    }
  };

  const handleRecluster = async () => {
    setIsReclustering(true);
    try {
      await apiClient.recluster(caseId);
      await loadEventsData();
    } catch (err) {
      console.error('Failed to re-cluster:', err);
    } finally {
      setIsReclustering(false);
    }
  };

  const handleInspectArticleById = (articleId: string) => {
    const art = normalizedArticles.find((a) => a.id === articleId || a.retrievalRecordId === articleId);
    if (art) {
      handleSelectArticle(art);
    } else {
      for (const e of events) {
        const item = e.articles.find((a) => a.articleId === articleId);
        if (item) {
          const syntheticArt: Article = {
            id: item.articleId,
            caseId: caseId,
            subjectId: 'subj-default',
            screeningRunId: 'run-default',
            connectorId: 'conn-gkg-global',
            title: item.title,
            canonicalUrl: item.url || 'https://' + item.domain,
            domain: item.domain,
            publisher: item.publisher || item.domain,
            author: 'Staff Correspondent',
            language: item.language || 'en',
            isRTL: item.language === 'ar',
            contentHash: item.articleId,
            accessStatus: 'ACCESSIBLE',
            currentVersion: 1,
            versions: [],
            metadata: {
              id: 'meta-' + item.articleId,
              articleId: item.articleId,
              canonicalUrl: item.url || 'https://' + item.domain,
              publisher: item.publisher,
              publisherStatus: 'VERIFIED',
              author: 'Staff Correspondent',
              authorStatus: 'PROVIDER_REPORTED',
              publicationLocation: 'Global',
              publicationLocationStatus: 'PROVIDER_REPORTED',
              publicationDate: {
                date: item.publishedAt || new Date().toISOString(),
                confidenceState: 'VERIFIED',
                sourceField: 'HTTP_HEADER_LAST_MODIFIED',
              },
              languageAssessment: {
                detectedLanguage: item.language || 'en',
                confidence: 0.98,
                method: 'STATISTICAL_N_GRAM',
                isRTL: item.language === 'ar',
                script: 'LATN',
              },
              providerMetadata: {},
              normalizedMetadata: {
                cleanTitle: item.title,
                cleanPublisher: item.publisher,
                normalizedDomain: item.domain,
                normalizedKeywords: [],
                sentimentScore: -0.7,
                severity: 'HIGH',
                eventCategories: [],
              },
            },
            identityAssessment: 'CONFIRMED_MATCH',
            legalStatus: 'Under investigation',
            credibility: 'High',
            materiality: 'Substantial',
            relevanceScore: 0.95,
            severity: 'HIGH',
            matchedAliases: [subjectName],
            matchedKeywords: [],
            retrievalRecordId: 'ret-' + item.articleId,
            createdAt: item.publishedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          handleSelectArticle(syntheticArt);
          break;
        }
      }
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (e.reviewStatus === 'ARCHIVED') return false;
      if (selectedCategory !== 'ALL' && e.primaryCategory !== selectedCategory) return false;
      if (selectedLegalStatusFilter !== 'ALL' && e.legalStatus !== selectedLegalStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = e.eventTitle.toLowerCase().includes(q);
        const matchesSummary = e.eventSummary.toLowerCase().includes(q);
        const matchesJurisdiction = e.jurisdiction.toLowerCase().includes(q);
        const matchesAuthorities = (e.investigatingAuthorities || []).some((a) => a.toLowerCase().includes(q));
        const matchesArticles = e.articles.some((a) => a.title.toLowerCase().includes(q) || a.domain.toLowerCase().includes(q));
        if (!matchesTitle && !matchesSummary && !matchesJurisdiction && !matchesAuthorities && !matchesArticles) {
          return false;
        }
      }
      return true;
    });
  }, [events, selectedCategory, selectedLegalStatusFilter, searchQuery]);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedLang,
    selectedSeverity,
    selectedAccess,
    selectedDateConfidence,
    selectedIdentityMatch,
    selectedCategory,
    sortBy,
  ]);

  // Handle Preset View Selection
  const handleSelectView = (view: SavedView) => {
    setActiveViewId(view.id);
    const f = view.filters || {};
    if (f.eventCategories && f.eventCategories.length > 0) setSelectedCategory(f.eventCategories[0]);
    else setSelectedCategory('ALL');

    if (f.severity && f.severity.length > 0) setSelectedSeverity(f.severity[0]);
    else setSelectedSeverity('ALL');

    if (f.languages && f.languages.length > 0) setSelectedLang(f.languages[0]);
    else setSelectedLang('ALL');

    if (f.accessStatus && f.accessStatus.length > 0) setSelectedAccess(f.accessStatus[0]);
    else setSelectedAccess('ALL');

    const anyFilters = f as Record<string, any>;
    if (anyFilters.dateConfidence) setSelectedDateConfidence(anyFilters.dateConfidence);
    else setSelectedDateConfidence('ALL');

    if (f.identityAssessment && f.identityAssessment.length > 0) setSelectedIdentityMatch(f.identityAssessment[0]);
    else setSelectedIdentityMatch('ALL');

    if (view.sortBy) {
      if (view.sortBy === 'publishedDate') setSortBy('dateDesc');
      else if (view.sortBy === 'relevanceScore') setSortBy('relevance');
      else if (view.sortBy === 'severity') setSortBy('severity');
    }
  };

  const handleResetFilters = () => {
    setActiveViewId('');
    setSelectedCategory('ALL');
    setSelectedSeverity('ALL');
    setSelectedLang('ALL');
    setSelectedAccess('ALL');
    setSelectedDateConfidence('ALL');
    setSelectedIdentityMatch('ALL');
    setSortBy('relevance');
    setSearchQuery('');
  };

  // Filter & Sort Logic
  const filteredAndSortedArticles = useMemo(() => {
    let result = normalizedArticles.filter((art) => {
      // Free text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = art.title.toLowerCase().includes(q);
        const matchesPub = art.publisher.toLowerCase().includes(q);
        const matchesDomain = art.domain.toLowerCase().includes(q);
        const matchesAuthor = art.author?.toLowerCase().includes(q);
        const matchesAliases = (art.matchedAliases || []).some((a) => a.toLowerCase().includes(q));
        if (!matchesTitle && !matchesPub && !matchesDomain && !matchesAuthor && !matchesAliases) {
          return false;
        }
      }

      // Language filter
      if (selectedLang !== 'ALL') {
        if (selectedLang === 'NON_EN') {
          if (art.language === 'en') return false;
        } else if (art.language !== selectedLang) {
          return false;
        }
      }

      // Severity filter
      if (selectedSeverity !== 'ALL' && art.severity !== selectedSeverity) {
        return false;
      }

      // Access filter
      if (selectedAccess !== 'ALL' && art.accessStatus !== selectedAccess) {
        return false;
      }

      // Date confidence filter
      if (selectedDateConfidence !== 'ALL') {
        const conf = art.metadata?.publicationDate?.confidenceState;
        if (conf !== selectedDateConfidence) return false;
      }

      // Identity assessment filter
      if (selectedIdentityMatch !== 'ALL' && art.identityAssessment !== selectedIdentityMatch) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL') {
        const cats = art.metadata?.normalizedMetadata?.eventCategories || [];
        if (!cats.includes(selectedCategory as EventCategory)) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'relevance') {
        return b.relevanceScore - a.relevanceScore;
      }
      if (sortBy === 'dateDesc') {
        const dateA = a.metadata?.publicationDate?.date ? new Date(a.metadata.publicationDate.date).getTime() : 0;
        const dateB = b.metadata?.publicationDate?.date ? new Date(b.metadata.publicationDate.date).getTime() : 0;
        return dateB - dateA;
      }
      if (sortBy === 'dateAsc') {
        const dateA = a.metadata?.publicationDate?.date ? new Date(a.metadata.publicationDate.date).getTime() : 0;
        const dateB = b.metadata?.publicationDate?.date ? new Date(b.metadata.publicationDate.date).getTime() : 0;
        return dateA - dateB;
      }
      if (sortBy === 'retrievalDesc') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      }
      if (sortBy === 'severity') {
        const weight: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (weight[b.severity] || 0) - (weight[a.severity] || 0);
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'publisher') {
        return a.publisher.localeCompare(b.publisher);
      }
      return 0;
    });

    return result;
  }, [
    normalizedArticles,
    searchQuery,
    selectedLang,
    selectedSeverity,
    selectedAccess,
    selectedDateConfidence,
    selectedIdentityMatch,
    selectedCategory,
    sortBy,
  ]);

  // Paginated articles slice
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedArticles.length / pageSize));
  const paginatedArticles = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedArticles.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedArticles, currentPage, pageSize]);

  const severityBadgeMap: Record<string, BadgeVariant> = {
    CRITICAL: 'critical',
    HIGH: 'danger',
    MEDIUM: 'warning',
    LOW: 'neutral',
  };

  const dateBadgeMap: Record<string, BadgeVariant> = {
    VERIFIED: 'success',
    PROVIDER_REPORTED: 'info',
    APPROXIMATE: 'warning',
    CONFLICTING: 'danger',
    UNKNOWN: 'neutral',
  };

  const handleArticleUpdated = (updated: Article) => {
    setSelectedArticle(updated);
    if (onArticlesChange) onArticlesChange();
  };

  const currentFilterPayload = {
    language: selectedLang,
    severity: selectedSeverity,
    accessStatus: selectedAccess,
    dateConfidence: selectedDateConfidence,
    identityAssessment: selectedIdentityMatch,
    eventCategory: selectedCategory,
    sortBy,
  };

  return (
    <div className="space-y-4">
      {/* Investigation Unit View Mode Selector (AM-16 to AM-20 Directive: Event is the default unit of investigation) */}
      <div id="investigation-mode-bar" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            id="tab-mode-events"
            type="button"
            onClick={() => setInvestigationMode('events')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              investigationMode === 'events'
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-600'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Adverse Events ({events.filter((e) => e.reviewStatus !== 'ARCHIVED').length})
          </button>

          <button
            id="tab-mode-evidence-review"
            type="button"
            onClick={() => {
              setInvestigationMode('evidence-review');
              if (!reviewArticleId && normalizedArticles.length > 0) {
                setReviewArticleId(normalizedArticles[0].id);
              }
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              investigationMode === 'evidence-review'
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-600'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Quote className="w-3.5 h-3.5" />
            Grounded Evidence Review (AM-21–27)
          </button>

          <button
            id="tab-mode-articles"
            type="button"
            onClick={() => setInvestigationMode('articles')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              investigationMode === 'articles'
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-600'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Article-Level Evidence ({normalizedArticles.length})
          </button>

          <button
            id="tab-mode-clustering"
            type="button"
            onClick={() => setInvestigationMode('clustering')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              investigationMode === 'clustering'
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-600'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            Deduplication & Syndication Hub ({duplicates.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {investigationMode === 'events' && (
            <Button
              id="header-recluster-btn"
              variant="outline"
              size="sm"
              onClick={handleRecluster}
              disabled={isReclustering}
              className="text-xs"
            >
              <Repeat className={`w-3.5 h-3.5 mr-1.5 ${isReclustering ? 'animate-spin' : ''}`} />
              {isReclustering ? 'Re-Clustering...' : 'Aggregate & Re-Cluster'}
            </Button>
          )}
        </div>
      </div>

      {/* 1. ADVERSE EVENTS VIEW (AM-16 to AM-20: Default Investigation Unit) */}
      {investigationMode === 'events' && (
        <div id="adverse-events-view-container" className="space-y-4">
          {/* Adverse Events Filter Bar */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search adverse events by headline, jurisdiction, authority, or allegations..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Event Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs"
                >
                  <option value="ALL">All Event Categories</option>
                  <option value="BRIBERY_CORRUPTION">Bribery & Corruption</option>
                  <option value="FINANCIAL_CRIME_FRAUD">Financial Crime & Fraud</option>
                  <option value="SANCTIONS_EVASION">Sanctions Evasion</option>
                  <option value="COURT_RECORDS">Court & Litigation Records</option>
                  <option value="TERRORIST_FINANCING">Terrorist Financing</option>
                  <option value="ORGANIZED_CRIME">Organized Crime</option>
                </select>

                {/* Legal Status Filter */}
                <select
                  value={selectedLegalStatusFilter}
                  onChange={(e) => setSelectedLegalStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs"
                >
                  <option value="ALL">All Legal Statuses</option>
                  <option value="UNDER_INVESTIGATION">Under Investigation</option>
                  <option value="FORMAL_CHARGES_FILED">Formal Charges Filed</option>
                  <option value="INDICTED">Indicted</option>
                  <option value="CONVICTED_GUILTY">Convicted / Guilty</option>
                  <option value="ACQUITTED_DISMISSED">Acquitted / Dismissed</option>
                  <option value="SETTLED_CIVIL">Settled Civil</option>
                </select>
              </div>
            </div>
          </div>

          {/* Events List */}
          <EventsList
            events={filteredEvents}
            selectedEventId={selectedEventForDetail?.id || null}
            onSelectEvent={(evt) => setSelectedEventForDetail(evt)}
            onOpenMergeModal={(evt) => setMergeModalEvent(evt)}
            onOpenSplitModal={(evt) => setSplitModalEvent(evt)}
            onConfirmEvent={handleConfirmEvent}
            onDismissEvent={handleDismissEvent}
            activeRole={activeRole}
          />
        </div>
      )}

      {/* 2. GROUNDED EVIDENCE REVIEW WORKSPACE (AM-21 through AM-27) */}
      {investigationMode === 'evidence-review' && (
        <EvidenceReviewWorkspace
          articles={normalizedArticles}
          selectedArticleId={reviewArticleId || selectedArticle?.id || normalizedArticles[0]?.id}
          onSelectArticle={(artId) => {
            setReviewArticleId(artId);
            const found = normalizedArticles.find((a) => a.id === artId);
            if (found) setSelectedArticle(found);
          }}
          activeRole={activeRole}
          onAuditRecorded={loadEventsData}
        />
      )}

      {/* 3. DEDUPLICATION & SYNDICATION HUB (AM-16 to AM-18) */}
      {investigationMode === 'clustering' && (
        <DuplicateSyndicationHub
          duplicates={duplicates}
          clusters={clusters}
          sourceRoles={sourceRoles}
          onAdjudicateDuplicate={handleAdjudicateDuplicate}
          onOverrideRole={handleOverrideSourceRole}
          onRecluster={handleRecluster}
          onInspectArticle={handleInspectArticleById}
          activeRole={activeRole}
          isReclustering={isReclustering}
        />
      )}

      {/* 3. ARTICLE-LEVEL EVIDENCE VIEW (Preserving Full Evidentiary Sources) */}
      {investigationMode === 'articles' && (
        <div id="article-level-evidence-container" className="space-y-4">
          {/* 1. AM-11 Saved Views Presets Bar */}
          <SavedViewsBar
            activeViewId={activeViewId}
            onSelectView={handleSelectView}
            currentFilters={currentFilterPayload}
          />

      {/* 2. AM-11 Faceted Filter & Search Header */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
        {/* Search Bar, View Mode Toggle, and Column Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search findings by headline, publisher, author, domain, or matched alias..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded text-xs flex items-center gap-1 transition-all ${
                  viewMode === 'table'
                    ? 'bg-white shadow-2xs text-indigo-600 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Information-Dense Table View"
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded text-xs flex items-center gap-1 transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white shadow-2xs text-indigo-600 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Expanded Evidence Cards"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
            </div>

            {/* Column Configuration Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowColumnChooser(!showColumnChooser)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs flex items-center gap-1.5 transition-colors"
                title="Configure Visible Columns"
              >
                <Columns className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden md:inline">Columns</span>
              </button>

              {/* Column Chooser Dropdown Popover */}
              {showColumnChooser && (
                <div className="absolute right-0 top-full mt-1.5 w-64 p-3 bg-white border border-slate-200 rounded-xl shadow-lg z-30 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 font-semibold text-slate-800">
                    <span>Configure Columns (AM-11)</span>
                    <button
                      onClick={() => setColumns(DEFAULT_COLUMNS)}
                      className="text-[10px] text-indigo-600 hover:underline font-normal"
                    >
                      Reset Default
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {[
                      { key: 'pubDate', label: 'Publication Date & Forensic State' },
                      { key: 'retrievalDate', label: 'Retrieval Date' },
                      { key: 'language', label: 'Language & Script' },
                      { key: 'publisher', label: 'Publisher / Source' },
                      { key: 'subject', label: 'Subject Attribution' },
                      { key: 'category', label: 'Event Typology' },
                      { key: 'severity', label: 'Severity' },
                      { key: 'identity', label: 'Identity Assessment' },
                      { key: 'legalStatus', label: 'Legal Status (Not assessed)' },
                      { key: 'credibility', label: 'Credibility (Not assessed)' },
                      { key: 'materiality', label: 'Materiality (Not assessed)' },
                      { key: 'coverage', label: 'Coverage Status' },
                    ].map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 hover:bg-slate-50 p-1 rounded cursor-pointer text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={columns[col.key as keyof ColumnConfig]}
                          onChange={(e) =>
                            setColumns((prev) => ({
                              ...prev,
                              [col.key]: e.target.checked,
                            }))
                          }
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                        />
                        <span className="text-[11px]">{col.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="pt-1 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => setShowColumnChooser(false)}
                      className="px-2.5 py-1 bg-indigo-600 text-white rounded text-[11px] font-medium"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            <span className="text-xs text-slate-500 font-medium pl-1">
              <strong>{filteredAndSortedArticles.length}</strong> findings
            </span>
          </div>
        </div>

        {/* Faceted Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          {/* Language / Script Filter */}
          <select
            value={selectedLang}
            onChange={(e) => {
              setSelectedLang(e.target.value);
              setActiveViewId('');
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs"
          >
            <option value="ALL">All Languages & Scripts</option>
            <option value="NON_EN">All Non-English (Multilingual)</option>
            <option value="en">English (LATN)</option>
            <option value="ar">Arabic (ARAB • RTL)</option>
            <option value="hi">Hindi (DEVA)</option>
            <option value="ml">Malayalam (MLYM)</option>
            <option value="es">Spanish (LATN)</option>
            <option value="ru">Russian (CYRL)</option>
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => {
              setSelectedSeverity(e.target.value);
              setActiveViewId('');
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Severity</option>
            <option value="HIGH">High Severity</option>
            <option value="MEDIUM">Medium Severity</option>
            <option value="LOW">Low Severity</option>
          </select>

          {/* Date Confidence Filter */}
          <select
            value={selectedDateConfidence}
            onChange={(e) => {
              setSelectedDateConfidence(e.target.value);
              setActiveViewId('');
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs"
          >
            <option value="ALL">All Date Confidence</option>
            <option value="VERIFIED">Verified Date</option>
            <option value="PROVIDER_REPORTED">Provider Reported</option>
            <option value="CONFLICTING">Conflicting Dates ⚠️</option>
            <option value="APPROXIMATE">Approximate Date</option>
            <option value="UNKNOWN">Unknown / Unavailable</option>
          </select>

          {/* Access Status Filter */}
          <select
            value={selectedAccess}
            onChange={(e) => {
              setSelectedAccess(e.target.value);
              setActiveViewId('');
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs"
          >
            <option value="ALL">All Access Types</option>
            <option value="ACCESSIBLE">Accessible Content</option>
            <option value="PAYWALL">Paywalled (Subscription)</option>
            <option value="RESTRICTED">Restricted Access</option>
          </select>

          {/* Identity Match Assessment Filter */}
          <select
            value={selectedIdentityMatch}
            onChange={(e) => {
              setSelectedIdentityMatch(e.target.value);
              setActiveViewId('');
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs"
          >
            <option value="ALL">All Identity Assessments</option>
            <option value="CONFIRMED_MATCH">Confirmed Match</option>
            <option value="POTENTIAL_MATCH">Potential Match</option>
            <option value="FALSE_POSITIVE">False Positive</option>
            <option value="NOT_ASSESSED">Not Assessed</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setActiveViewId('');
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs"
          >
            <option value="ALL">All Event Typologies</option>
            <option value="BRIBERY_CORRUPTION">Bribery & Corruption</option>
            <option value="FINANCIAL_CRIME_FRAUD">Financial Crime & Fraud</option>
            <option value="SANCTIONS_EVASION">Sanctions Evasion</option>
            <option value="COURT_RECORDS">Court & Litigation Records</option>
            <option value="TERRORIST_FINANCING">Terrorist Financing</option>
          </select>

          {/* Sort By */}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium"
            >
              <option value="relevance">Relevance Score (High to Low)</option>
              <option value="dateDesc">Publication Date (Newest to Oldest)</option>
              <option value="dateAsc">Publication Date (Oldest to Newest)</option>
              <option value="retrievalDesc">Retrieval Date (Newest first)</option>
              <option value="severity">Severity (Critical to Low)</option>
              <option value="title">Headline (A to Z)</option>
              <option value="publisher">Publisher (A to Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Empty State or Results Presentation (AM-11 Dense Table vs Cards) */}
      {filteredAndSortedArticles.length === 0 ? (
        <EmptyState
          title="No adverse media findings match the current filters"
          description={
            normalizedArticles.length === 0
              ? 'No findings were discovered in this screening run. You can re-run screening or adjust lookback period in the Investigation area.'
              : 'Try clearing some of your search filters or switching to the "All Findings" preset view.'
          }
          action={
            normalizedArticles.length === 0
              ? { label: 'Execute Screening Run', onClick: onExecuteScreening }
              : { label: 'Reset Filter Criteria', onClick: handleResetFilters }
          }
        />
      ) : viewMode === 'table' ? (
        /* ================= AM-11 INFORMATION-DENSE TABLE VIEW ================= */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200 border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3.5 min-w-[280px]">Finding & Canonical URL</th>
                  {columns.pubDate && <th className="py-3 px-3 min-w-[140px]">Publication Date</th>}
                  {columns.retrievalDate && <th className="py-3 px-3 min-w-[120px]">Retrieval Date</th>}
                  {columns.language && <th className="py-3 px-3 min-w-[110px]">Language / Script</th>}
                  {columns.publisher && <th className="py-3 px-3 min-w-[140px]">Source / Publisher</th>}
                  {columns.subject && <th className="py-3 px-3 min-w-[120px]">Subject</th>}
                  {columns.category && <th className="py-3 px-3 min-w-[130px]">Event Typology</th>}
                  {columns.severity && <th className="py-3 px-3 min-w-[90px]">Severity</th>}
                  {columns.identity && <th className="py-3 px-3 min-w-[130px]">Identity Status</th>}
                  {columns.legalStatus && <th className="py-3 px-3 min-w-[110px]">Legal Status</th>}
                  {columns.credibility && <th className="py-3 px-3 min-w-[110px]">Credibility</th>}
                  {columns.materiality && <th className="py-3 px-3 min-w-[110px]">Materiality</th>}
                  {columns.coverage && <th className="py-3 px-3 min-w-[90px]">Coverage</th>}
                  <th className="py-3 px-3 text-right min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedArticles.map((art) => {
                  const pubDate = art.metadata?.publicationDate;
                  const langAssessment = art.metadata?.languageAssessment;
                  const isSelected = selectedArticle?.id === art.id;

                  return (
                    <tr
                      key={art.id}
                      onClick={() => handleSelectArticle(art)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50/60 font-medium'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Title & Canonical URL */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-1 max-w-sm">
                          <div
                            className={`font-semibold text-slate-900 line-clamp-2 ${
                              art.isRTL ? 'text-right font-serif' : 'font-sans'
                            }`}
                            dir={art.isRTL ? 'rtl' : 'ltr'}
                          >
                            {art.title}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                            <span className="truncate max-w-[200px]">{art.canonicalUrl}</span>
                            <a
                              href={art.canonicalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-indigo-600 hover:text-indigo-800"
                              title="Open original canonical link"
                            >
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                            <button
                              onClick={(e) => handleCopyLink(art.id, e)}
                              className="text-slate-400 hover:text-slate-600"
                              title="Copy direct link to this finding"
                            >
                              {copiedId === art.id ? (
                                <Check className="h-2.5 w-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-2.5 w-2.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Publication Date & Forensic State */}
                      {columns.pubDate && (
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <div className="font-mono text-slate-800 font-medium">
                              {pubDate?.date ? new Date(pubDate.date).toLocaleDateString() : 'Unknown'}
                            </div>
                            <Badge
                              variant={dateBadgeMap[pubDate?.confidenceState || 'UNKNOWN'] || 'neutral'}
                              size="sm"
                            >
                              {pubDate?.confidenceState === 'CONFLICTING'
                                ? 'Conflicting ⚠️'
                                : pubDate?.confidenceState || 'UNKNOWN'}
                            </Badge>
                          </div>
                        </td>
                      )}

                      {/* Retrieval Date */}
                      {columns.retrievalDate && (
                        <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                          {new Date(art.createdAt).toLocaleDateString()}
                        </td>
                      )}

                      {/* Language & Script */}
                      {columns.language && (
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1">
                            <Badge variant="primary" size="sm">
                              {art.language.toUpperCase()} • {langAssessment?.script || 'LATN'}
                            </Badge>
                            {art.isRTL && (
                              <Badge variant="warning" size="sm">
                                RTL
                              </Badge>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Publisher / Source */}
                      {columns.publisher && (
                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800 truncate max-w-[150px]">
                              {art.publisher}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                              {art.domain}
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Subject */}
                      {columns.subject && (
                        <td className="py-3 px-3">
                          <span className="font-medium text-slate-700">{subjectName}</span>
                          {(art.matchedAliases || []).length > 0 && (
                            <div className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                              Alias: {art.matchedAliases[0]}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Event Typology */}
                      {columns.category && (
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {(art.metadata?.normalizedMetadata?.eventCategories || []).slice(0, 2).map((cat) => (
                              <span
                                key={cat}
                                className="text-[9px] font-mono uppercase bg-slate-100 text-slate-600 px-1 py-0.5 rounded"
                              >
                                {cat.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </td>
                      )}

                      {/* Severity */}
                      {columns.severity && (
                        <td className="py-3 px-3">
                          <Badge variant={severityBadgeMap[art.severity] || 'neutral'} size="sm">
                            {art.severity}
                          </Badge>
                        </td>
                      )}

                      {/* Identity Assessment */}
                      {columns.identity && (
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              art.identityAssessment === 'CONFIRMED_MATCH'
                                ? 'danger'
                                : art.identityAssessment === 'POTENTIAL_MATCH'
                                ? 'warning'
                                : art.identityAssessment === 'FALSE_POSITIVE'
                                ? 'neutral'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {art.identityAssessment.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                      )}

                      {/* Legal Status (Placeholder: "Not assessed") */}
                      {columns.legalStatus && (
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                          {art.legalStatus || 'Not assessed'}
                        </td>
                      )}

                      {/* Credibility (Placeholder: "Not assessed") */}
                      {columns.credibility && (
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                          {art.credibility || 'Not assessed'}
                        </td>
                      )}

                      {/* Materiality (Placeholder: "Not assessed") */}
                      {columns.materiality && (
                        <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                          {art.materiality || 'Not assessed'}
                        </td>
                      )}

                      {/* Coverage Status */}
                      {columns.coverage && (
                        <td className="py-3 px-3">
                          <Badge variant="success" size="sm">
                            Covered
                          </Badge>
                        </td>
                      )}

                      {/* Action */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReviewArticleId(art.id);
                              setInvestigationMode('evidence-review');
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                            title="Open Grounded Evidence Review Mode (AM-21–27)"
                          >
                            <Quote className="h-3 w-3" />
                            <span>Review</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectArticle(art);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Bar */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 text-xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-slate-400">|</span>
              <span>
                Showing {((currentPage - 1) * pageSize) + 1}–
                {Math.min(currentPage * pageSize, filteredAndSortedArticles.length)} of{' '}
                <strong>{filteredAndSortedArticles.length}</strong> findings
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="font-medium text-slate-700 text-[11px]">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ================= CARDS VIEW ================= */
        <div className="space-y-3">
          {paginatedArticles.map((article) => {
            const pubDate = article.metadata?.publicationDate;
            const langAssessment = article.metadata?.languageAssessment;
            const isSelected = selectedArticle?.id === article.id;

            return (
              <div
                key={article.id}
                onClick={() => handleSelectArticle(article)}
                className={`p-4.5 rounded-xl border transition-all cursor-pointer text-xs space-y-3 ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/20 shadow-md ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
                }`}
              >
                {/* Top Row: Badges, Language, Date Assertion, Severity */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={severityBadgeMap[article.severity] || 'neutral'} size="sm">
                      {article.severity}
                    </Badge>

                    <Badge variant="primary" size="sm">
                      {article.language.toUpperCase()} • {langAssessment?.script || 'LATN'}
                    </Badge>

                    {article.isRTL && (
                      <Badge variant="warning" size="sm">
                        RTL
                      </Badge>
                    )}

                    <Badge
                      variant={dateBadgeMap[pubDate?.confidenceState || 'UNKNOWN'] || 'neutral'}
                      size="sm"
                      icon={<Calendar className="h-3 w-3" />}
                    >
                      {pubDate?.confidenceState === 'CONFLICTING'
                        ? 'Conflicting Dates ⚠️'
                        : `${pubDate?.confidenceState}: ${
                            pubDate?.date ? new Date(pubDate.date).toLocaleDateString() : 'Unknown'
                          }`}
                    </Badge>

                    <Badge
                      variant={article.accessStatus === 'ACCESSIBLE' ? 'success' : 'warning'}
                      size="sm"
                    >
                      {article.accessStatus}
                    </Badge>

                    {article.identityAssessment !== 'NOT_ASSESSED' && (
                      <Badge
                        variant={
                          article.identityAssessment === 'CONFIRMED_MATCH'
                            ? 'danger'
                            : article.identityAssessment === 'POTENTIAL_MATCH'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {article.identityAssessment.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Match Relevance: {Math.round(article.relevanceScore * 100)}%
                    </span>
                    <button
                      onClick={(e) => handleCopyLink(article.id, e)}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      title="Copy direct link"
                    >
                      {copiedId === article.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Article Headline */}
                <h4
                  className={`text-sm font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors ${
                    article.isRTL ? 'text-right font-serif text-base' : 'font-sans'
                  }`}
                  dir={article.isRTL ? 'rtl' : 'ltr'}
                >
                  {article.title}
                </h4>

                {/* Publisher Provenance & Geolocation Meta */}
                <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <Building className="h-3 w-3 text-slate-400" />
                    {article.publisher}
                    <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-normal">
                      {article.metadata?.publisherStatus}
                    </span>
                  </span>

                  {article.metadata?.publicationLocation && (
                    <>
                      <span>•</span>
                      <span className="text-slate-600 font-medium">
                        📍 {article.metadata.publicationLocation}
                      </span>
                    </>
                  )}

                  <span>•</span>
                  <span className="font-mono text-slate-400">{article.domain}</span>

                  {article.author && (
                    <>
                      <span>•</span>
                      <span className="text-slate-600">By {article.author}</span>
                    </>
                  )}
                </div>

                {/* Sanitized Snippet Quote */}
                <div
                  className={`p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 italic leading-relaxed ${
                    article.isRTL ? 'text-right font-serif' : 'font-sans'
                  }`}
                  dir={article.isRTL ? 'rtl' : 'ltr'}
                >
                  <Quote className="h-3 w-3 text-indigo-500 inline mr-1" />
                  {article.versions?.[0]?.sanitizedSnippet ||
                    article.metadata?.normalizedMetadata?.cleanTitle ||
                    'Snippet sanitized for analysis.'}
                </div>

                {/* Placeholders Row */}
                <div className="grid grid-cols-3 gap-2 p-2 rounded bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Legal Status:</span>
                    <span>{article.legalStatus || 'Not assessed'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Credibility:</span>
                    <span>{article.credibility || 'Not assessed'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Materiality:</span>
                    <span>{article.materiality || 'Not assessed'}</span>
                  </div>
                </div>

                {/* Footer: Event Typologies & Context Inspection Action */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-1">
                    {(article.metadata?.normalizedMetadata?.eventCategories || []).map((cat) => (
                      <span
                        key={cat}
                        className="text-[10px] font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-600"
                      >
                        {cat.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReviewArticleId(article.id);
                        setInvestigationMode('evidence-review');
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      <Quote className="h-3.5 w-3.5" />
                      <span>Review Grounded Evidence</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectArticle(article);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800"
                    >
                      <span>Inspect Forensic (L2)</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Cards Pagination */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <span>
              Showing {((currentPage - 1) * pageSize) + 1}–
              {Math.min(currentPage * pageSize, filteredAndSortedArticles.length)} of{' '}
              <strong>{filteredAndSortedArticles.length}</strong> findings
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-medium text-slate-700 text-[11px]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      )}

      {/* Event Detail Modal (AM-16 to AM-20) */}
      {selectedEventForDetail && (
        <EventDetailModal
          event={selectedEventForDetail}
          onClose={() => setSelectedEventForDetail(null)}
          onUpdateMetadata={handleUpdateEventMetadata}
          onAddTimelineEntry={handleAddTimelineEntry}
          onDeleteTimelineEntry={handleDeleteTimelineEntry}
          onOverrideSourceRole={handleOverrideSourceRole}
          onReassignArticle={handleReassignArticle}
          onInspectArticle={handleInspectArticleById}
          onOpenEvidenceReview={(artId) => {
            setReviewArticleId(artId);
            setInvestigationMode('evidence-review');
          }}
          otherEvents={events.filter((e) => e.id !== selectedEventForDetail.id && e.reviewStatus !== 'ARCHIVED')}
          activeRole={activeRole}
        />
      )}

      {/* Merge Events Modal (AM-19) */}
      {mergeModalEvent && (
        <MergeEventsModal
          primaryEvent={mergeModalEvent}
          availableEvents={events}
          onClose={() => setMergeModalEvent(null)}
          onMerge={handleMergeEvents}
        />
      )}

      {/* Split Event Modal (AM-19) */}
      {splitModalEvent && (
        <SplitEventModal
          sourceEvent={splitModalEvent}
          onClose={() => setSplitModalEvent(null)}
          onSplit={handleSplitEvent}
        />
      )}

      {/* 4. Level 2 Persistent Context Inspection Drawer (AM-09 / AM-11) */}
      <ArticleDetailDrawer
        article={selectedArticle}
        isOpen={selectedArticle !== null}
        onClose={() => handleSelectArticle(null)}
        activeRole={activeRole}
        onArticleUpdated={handleArticleUpdated}
        onOpenEvidenceReview={(artId) => {
          setReviewArticleId(artId);
          setInvestigationMode('evidence-review');
        }}
      />
    </div>
  );
};


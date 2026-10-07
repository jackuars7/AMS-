import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  GitMerge,
  Globe,
  History,
  Layers,
  Quote,
  Repeat,
  Save,
  Scale,
  Shield,
  ShieldAlert,
  Sparkles,
  Split,
  Tag,
  User,
  X,
} from 'lucide-react';
import { AdverseEvent, EventArticle, SourceRole, TimelineEntry, UserRole } from '../../../types/index.ts';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';
import { EventTimelineView } from './EventTimelineView.tsx';

interface EventDetailModalProps {
  event: AdverseEvent;
  onClose: () => void;
  onUpdateMetadata: (eventId: string, updates: Partial<AdverseEvent>) => void;
  onAddTimelineEntry: (eventId: string, entry: Partial<TimelineEntry>) => void;
  onDeleteTimelineEntry: (eventId: string, entryId: string) => void;
  onOverrideSourceRole: (articleId: string, role: SourceRole, rationale: string) => void;
  onReassignArticle: (articleId: string, fromEventId: string, toEventId: string, rationale: string) => void;
  onInspectArticle: (articleId: string) => void;
  onOpenEvidenceReview?: (articleId: string) => void;
  otherEvents: AdverseEvent[];
  activeRole?: UserRole;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  onUpdateMetadata,
  onAddTimelineEntry,
  onDeleteTimelineEntry,
  onOverrideSourceRole,
  onReassignArticle,
  onInspectArticle,
  onOpenEvidenceReview,
  otherEvents,
  activeRole = 'ANALYST',
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'articles' | 'revisions'>('timeline');

  // Metadata Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(event.eventTitle);
  const [editSummary, setEditSummary] = useState(event.eventSummary);
  const [editLegalStatus, setEditLegalStatus] = useState(event.legalStatus);
  const [editJurisdiction, setEditJurisdiction] = useState(event.jurisdiction);
  const [editNextAction, setEditNextAction] = useState(event.primaryNextAction || 'CONTINUE_INVESTIGATION');

  // Override Source Role Modal State
  const [overrideArticle, setOverrideArticle] = useState<EventArticle | null>(null);
  const [selectedRole, setSelectedRole] = useState<SourceRole>('INDEPENDENT_CORROBORATION');
  const [overrideRationale, setOverrideRationale] = useState('');

  // Reassign Article Modal State
  const [reassignArticleItem, setReassignArticleItem] = useState<EventArticle | null>(null);
  const [targetEventId, setTargetEventId] = useState('');
  const [reassignRationale, setReassignRationale] = useState('');

  const canEdit = activeRole !== 'AUDITOR';

  const handleSaveMetadata = () => {
    onUpdateMetadata(event.id, {
      eventTitle: editTitle,
      eventSummary: editSummary,
      legalStatus: editLegalStatus,
      jurisdiction: editJurisdiction,
      primaryNextAction: editNextAction as any,
    });
    setIsEditing(false);
  };

  const handleConfirmOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideArticle || !overrideRationale.trim()) return;
    onOverrideSourceRole(overrideArticle.articleId, selectedRole, overrideRationale);
    setOverrideArticle(null);
    setOverrideRationale('');
  };

  const handleConfirmReassign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignArticleItem || !targetEventId || !reassignRationale.trim()) return;
    onReassignArticle(reassignArticleItem.articleId, event.id, targetEventId, reassignRationale);
    setReassignArticleItem(null);
    setTargetEventId('');
    setReassignRationale('');
  };

  const getSourceRoleBadge = (role: SourceRole) => {
    switch (role) {
      case 'ORIGINAL':
      case 'LIKELY_ORIGINAL':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            Original Source
          </span>
        );
      case 'INDEPENDENT_CORROBORATION':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-300">
            <Layers className="w-3 h-3 text-indigo-600" />
            Independent Corroboration
          </span>
        );
      case 'SYNDICATED_COPY':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
            <Repeat className="w-3 h-3 text-amber-600" />
            Syndicated Copy (Non-Independent)
          </span>
        );
      case 'AGGREGATOR':
      case 'REPUBLISHER':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
            Aggregator / Wire
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
            {role}
          </span>
        );
    }
  };

  return (
    <div
      id="event-detail-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="event-detail-modal-container"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50/80">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-slate-200 text-slate-800 uppercase tracking-wider">
                {event.primaryCategory.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-slate-500 font-medium">Event ID: {event.id}</span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                <Globe className="w-3 h-3 text-slate-400" />
                {event.jurisdiction}
              </span>
              {event.reviewStatus === 'CONFIRMED' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Confirmed Event
                </span>
              )}
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
              {event.eventTitle}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canEdit && !isEditing && (
              <Button
                id="edit-event-meta-btn"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-xs"
              >
                Edit Event
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Card (Editable or View) */}
          {isEditing ? (
            <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900 uppercase tracking-wider">
                <span>Edit Adverse Event Assessment</span>
                <span className="text-indigo-600 normal-case font-normal">All updates create immutable revisions</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Event Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Legal Status</label>
                  <select
                    value={editLegalStatus}
                    onChange={(e) => setEditLegalStatus(e.target.value as any)}
                    className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="UNDER_INVESTIGATION">Under Investigation</option>
                    <option value="FORMAL_CHARGES_FILED">Formal Charges Filed</option>
                    <option value="INDICTED">Indicted</option>
                    <option value="CONVICTED_GUILTY">Convicted / Guilty</option>
                    <option value="ACQUITTED_DISMISSED">Acquitted / Dismissed</option>
                    <option value="SETTLED_CIVIL">Settled Civil</option>
                    <option value="SANCTIONED">Sanctioned</option>
                    <option value="NOT_ASSESSED">Not Assessed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Event Narrative Summary</label>
                <textarea
                  rows={3}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="text-xs">
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleSaveMetadata} className="text-xs">
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Save Revision
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <p className="text-sm text-slate-700 leading-relaxed">{event.eventSummary}</p>

              <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-200 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 font-medium">Legal Status:</span>{' '}
                  <span className="font-bold text-slate-800">{event.legalStatus.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Jurisdiction:</span>{' '}
                  <span className="font-bold text-slate-800">{event.jurisdiction}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Date Interval:</span>{' '}
                  <span className="font-bold text-slate-800">
                    {event.dateRange.startDate || 'Unknown'} to{' '}
                    {event.dateRange.isOngoing ? 'Ongoing' : event.dateRange.endDate || 'Present'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-indigo-700 font-bold bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200">
                  <Layers className="w-4 h-4" />
                  <span>
                    {event.independentSourceCount} Independent {event.independentSourceCount === 1 ? 'Source' : 'Sources'} ({event.articles.length} total articles)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'timeline'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Procedural Timeline ({event.timeline?.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('articles')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'articles'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Evidentiary Sourcing & Syndication ({event.articles?.length || 0})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('revisions')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'revisions'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Audit Trail & Revisions ({event.revisions?.length || 0})
            </button>
          </div>

          {/* Tab 1: Procedural Timeline */}
          {activeTab === 'timeline' && (
            <EventTimelineView
              event={event}
              onAddEntry={(entry) => onAddTimelineEntry(event.id, entry)}
              onDeleteEntry={(entryId) => onDeleteTimelineEntry(event.id, entryId)}
              onInspectArticle={onInspectArticle}
              activeRole={activeRole}
            />
          )}

          {/* Tab 2: Evidentiary Articles & Sourcing */}
          {activeTab === 'articles' && (
            <div id="event-articles-view" className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <p>
                  Articles clustered into this event. Syndicated wires and near-duplicates are recognized to prevent artificial inflation of adverse severity.
                </p>
                <span className="font-semibold text-slate-700">
                  {event.articles.length} Evidentiary Sources
                </span>
              </div>

              <div className="space-y-3">
                {event.articles.map((art) => (
                  <div
                    key={art.articleId}
                    id={`event-article-row-${art.articleId}`}
                    className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {getSourceRoleBadge(art.sourceRole)}
                        <span className="text-xs font-bold text-slate-700">{art.publisher || art.domain}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">{art.publishedAt ? new Date(art.publishedAt).toLocaleDateString() : 'No Date'}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-mono text-slate-500 uppercase">{art.language}</span>
                      </div>

                      <h5 className="text-sm font-bold text-slate-900 leading-snug">
                        {art.title}
                      </h5>

                      {art.contentSnippet && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">
                          "{art.contentSnippet}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setOverrideArticle(art);
                            setSelectedRole(art.sourceRole);
                          }}
                          className="text-xs text-slate-600 hover:text-indigo-600"
                        >
                          Override Role
                        </Button>
                      )}

                      {canEdit && otherEvents.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReassignArticleItem(art);
                            setTargetEventId(otherEvents[0]?.id || '');
                          }}
                          className="text-xs text-slate-600 hover:text-indigo-600"
                        >
                          Reassign
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onInspectArticle(art.articleId)}
                        className="text-xs"
                      >
                        Inspect
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>

                      {onOpenEvidenceReview && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            onClose();
                            onOpenEvidenceReview(art.articleId);
                          }}
                          className="text-xs"
                        >
                          Review Evidence
                          <Quote className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Revisions & Audit */}
          {activeTab === 'revisions' && (
            <div id="event-revisions-view" className="space-y-3">
              <div className="text-xs text-slate-500">
                Complete tamper-evident change record for this adverse event record.
              </div>

              {event.revisions.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl text-xs text-slate-500">
                  Initial creation revision recorded.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden">
                  {event.revisions.map((rev) => (
                    <div key={rev.id} className="p-3.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded">
                          Revision #{rev.revisionNumber} ({rev.changeType.replace(/_/g, ' ')})
                        </span>
                        <span className="text-slate-400">
                          {new Date(rev.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium">{rev.changeSummary}</p>
                      <div className="text-slate-400 text-[11px]">
                        Actor: {rev.actorName} ({rev.actorRole})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Last modified: {new Date(event.updatedAt).toLocaleString()}
          </div>
          <Button variant="primary" size="sm" onClick={onClose} className="text-xs">
            Close Investigation View
          </Button>
        </div>
      </div>

      {/* Override Source Role Dialog */}
      {overrideArticle && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmOverride}
            className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Override Source Role (AM-18)</h4>
              <button type="button" onClick={() => setOverrideArticle(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Article: <span className="font-semibold text-slate-800">{overrideArticle.title}</span>
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">New Sourcing Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as SourceRole)}
                className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ORIGINAL">ORIGINAL (Primary breaking source)</option>
                <option value="LIKELY_ORIGINAL">LIKELY ORIGINAL</option>
                <option value="INDEPENDENT_CORROBORATION">INDEPENDENT CORROBORATION (Separate newsroom reporting)</option>
                <option value="SYNDICATED_COPY">SYNDICATED COPY (Exact or wire reprint)</option>
                <option value="AGGREGATOR">AGGREGATOR / WIRE (Secondary republisher)</option>
                <option value="REPUBLISHER">REPUBLISHER</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Investigator Rationale *</label>
              <textarea
                required
                rows={2}
                placeholder="Document editorial basis for modifying independent source classification..."
                value={overrideRationale}
                onChange={(e) => setOverrideRationale(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setOverrideArticle(null)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="text-xs">
                Confirm Role Override
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Reassign Article Dialog */}
      {reassignArticleItem && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmReassign}
            className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Reassign Article to Another Event</h4>
              <button type="button" onClick={() => setReassignArticleItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Moving: <span className="font-semibold text-slate-800">{reassignArticleItem.title}</span>
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Adverse Event</label>
              <select
                value={targetEventId}
                onChange={(e) => setTargetEventId(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
              >
                {otherEvents.map((oe) => (
                  <option key={oe.id} value={oe.id}>
                    {oe.eventTitle} ({oe.jurisdiction})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Reassignment Rationale *</label>
              <textarea
                required
                rows={2}
                placeholder="Explain why this evidence belongs in the target event..."
                value={reassignRationale}
                onChange={(e) => setReassignRationale(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setReassignArticleItem(null)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="text-xs">
                Execute Reassignment
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

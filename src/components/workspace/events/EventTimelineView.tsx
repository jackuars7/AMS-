import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  FileText,
  Plus,
  Scale,
  Trash2,
} from 'lucide-react';
import { AdverseEvent, TimelineEntry, UserRole } from '../../../types/index.ts';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';

interface EventTimelineViewProps {
  event: AdverseEvent;
  onAddEntry: (entry: Partial<TimelineEntry>) => void;
  onDeleteEntry: (entryId: string) => void;
  onInspectArticle: (articleId: string) => void;
  activeRole?: UserRole;
}

export const EventTimelineView: React.FC<EventTimelineViewProps> = ({
  event,
  onAddEntry,
  onDeleteEntry,
  onInspectArticle,
  activeRole = 'ANALYST',
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newType, setNewType] = useState<TimelineEntry['entryType']>('INVESTIGATION');
  const [newConfidence, setNewConfidence] = useState<'VERIFIED' | 'APPROXIMATE' | 'UNKNOWN'>('VERIFIED');
  const [newDescription, setNewDescription] = useState('');
  const [newAuthority, setNewAuthority] = useState('');
  const [newEvidenceArticleId, setNewEvidenceArticleId] = useState('');
  const [newUnverifiedReason, setNewUnverifiedReason] = useState('');

  const canEditTimeline = activeRole !== 'AUDITOR';

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const selectedArticle = event.articles.find((a) => a.articleId === newEvidenceArticleId);

    onAddEntry({
      title: newTitle,
      date: newDate || null,
      entryType: newType,
      dateConfidence: newConfidence,
      description: newDescription,
      authority: newAuthority || undefined,
      evidenceArticleId: newEvidenceArticleId || undefined,
      evidenceArticleTitle: selectedArticle?.title,
      evidenceSnippet: selectedArticle?.contentSnippet,
      unverified: newConfidence === 'UNKNOWN',
      unverifiedReason: newConfidence === 'UNKNOWN' ? newUnverifiedReason : undefined,
    });

    // Reset form
    setNewTitle('');
    setNewDate('');
    setNewDescription('');
    setNewAuthority('');
    setNewEvidenceArticleId('');
    setNewUnverifiedReason('');
    setShowAddForm(false);
  };

  const getEntryTypeColor = (type: TimelineEntry['entryType']) => {
    switch (type) {
      case 'INVESTIGATION':
      case 'CHARGE':
      case 'FILING':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'ARREST':
      case 'HEARING':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'CONVICTION':
      case 'JUDGMENT':
        return 'bg-red-100 text-red-900 border-red-300';
      case 'ACQUITTAL':
      case 'DISMISSAL':
      case 'SETTLEMENT':
      case 'REMEDIATION':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default:
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    }
  };

  const sortedTimeline = [...(event.timeline || [])].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return (
    <div id="event-timeline-view" className="space-y-6">
      {/* Header & Add Entry Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Adverse Event Timeline & Procedural Milestones (AM-20)
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Chronologically structured event progression backed by verified journalistic or regulatory citations.
          </p>
        </div>

        {canEditTimeline && (
          <Button
            id="add-timeline-milestone-btn"
            variant={showAddForm ? 'outline' : 'primary'}
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs"
          >
            {showAddForm ? 'Cancel' : <><Plus className="w-3.5 h-3.5 mr-1" /> Add Milestone</>}
          </Button>
        )}
      </div>

      {/* Add Milestone Inline Form */}
      {showAddForm && (
        <form
          id="add-timeline-entry-form"
          onSubmit={handleCreateEntry}
          className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
        >
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Record New Procedural Milestone
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Milestone Type *</label>
              <select
                id="timeline-new-type"
                value={newType}
                onChange={(e) => setNewType(e.target.value as TimelineEntry['entryType'])}
                className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="INVESTIGATION">Investigation</option>
                <option value="ALLEGED_CONDUCT">Alleged Conduct</option>
                <option value="ARREST">Arrest</option>
                <option value="CHARGE">Charge</option>
                <option value="FILING">Filing / Lawsuit</option>
                <option value="HEARING">Hearing</option>
                <option value="JUDGMENT">Judgment</option>
                <option value="CONVICTION">Conviction</option>
                <option value="ACQUITTAL">Acquittal</option>
                <option value="APPEAL">Appeal</option>
                <option value="SETTLEMENT">Settlement</option>
                <option value="DISMISSAL">Dismissal</option>
                <option value="REMEDIATION">Remediation</option>
                <option value="RETRACTION">Retraction</option>
                <option value="CORRECTION">Correction</option>
                <option value="OTHER">Other Milestone</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date (YYYY-MM-DD)</label>
              <input
                id="timeline-new-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date Confidence</label>
              <select
                id="timeline-new-confidence"
                value={newConfidence}
                onChange={(e) => setNewConfidence(e.target.value as 'VERIFIED' | 'APPROXIMATE' | 'UNKNOWN')}
                className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="VERIFIED">Verified (Direct Court/Official Date)</option>
                <option value="APPROXIMATE">Approximate (Reporting Window)</option>
                <option value="UNKNOWN">Unknown / Contested</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Milestone Title *</label>
              <input
                id="timeline-new-title"
                type="text"
                required
                placeholder="e.g. Federal Prosecutor Files Wire Fraud Indictment"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Investigating / Issuing Authority</label>
              <input
                id="timeline-new-authority"
                type="text"
                placeholder="e.g. US Department of Justice, SDNY"
                value={newAuthority}
                onChange={(e) => setNewAuthority(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Supporting Evidentiary Article</label>
            <select
              id="timeline-new-evidence-article"
              value={newEvidenceArticleId}
              onChange={(e) => setNewEvidenceArticleId(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">-- Select Article Reference --</option>
              {event.articles.map((art) => (
                <option key={art.articleId} value={art.articleId}>
                  [{art.sourceRole}] {art.title} ({art.domain})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Narrative Summary & Findings</label>
            <textarea
              id="timeline-new-description"
              rows={2}
              placeholder="Factual findings, court docket number, or summary of the action..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {newConfidence === 'UNVERIFIED' && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 space-y-1">
              <div className="font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Unverified Date Justification Required:
              </div>
              <input
                type="text"
                required
                placeholder="Explain why this date is uncertain or conflicting across reports..."
                value={newUnverifiedReason}
                onChange={(e) => setNewUnverifiedReason(e.target.value)}
                className="w-full text-xs bg-white border border-amber-300 rounded px-2 py-1"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="text-xs"
            >
              Record Milestone
            </Button>
          </div>
        </form>
      )}

      {/* Timeline Stream */}
      {sortedTimeline.length === 0 ? (
        <div id="timeline-empty" className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl">
          <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">No Timeline Milestones Extracted</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Add procedural events such as court dates, indictments, or penalties to establish a comprehensive legal timeline.
          </p>
        </div>
      ) : (
        <div id="timeline-items-flow" className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {sortedTimeline.map((item, index) => (
            <div id={`timeline-entry-${item.id}`} key={item.id} className="relative group">
              {/* Timeline Bullet */}
              <div
                className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                  item.unverified ? 'bg-amber-400 ring-2 ring-amber-200' : 'bg-indigo-600 ring-2 ring-indigo-200'
                }`}
              />

              {/* Milestone Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${getEntryTypeColor(item.entryType)}`}>
                      {item.entryType.replace(/_/g, ' ')}
                    </span>

                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {item.date ? item.date : 'Unknown Date'}
                    </span>

                    {item.dateConfidence === 'VERIFIED' ? (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Verified Date
                      </span>
                    ) : item.unverified ? (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Unverified Date
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        Estimated Interval
                      </span>
                    )}

                    {item.authority && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Scale className="w-3 h-3 text-slate-400" />
                        {item.authority}
                      </span>
                    )}
                  </div>

                  {canEditTimeline && (
                    <button
                      type="button"
                      onClick={() => onDeleteEntry(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 rounded transition-opacity"
                      title="Delete milestone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h5 className="text-sm font-bold text-slate-900">{item.title}</h5>
                {item.description && (
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.description}</p>
                )}

                {item.unverified && item.unverifiedReason && (
                  <div className="mt-2 p-2 bg-amber-50/70 border border-amber-200 rounded text-xs text-amber-800">
                    <span className="font-semibold">Unverified Rationale:</span> {item.unverifiedReason}
                  </div>
                )}

                {/* Evidentiary Link */}
                {item.evidenceArticleId && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 truncate max-w-lg">
                      <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-medium text-slate-700">Evidentiary Citation:</span>
                      <span className="truncate italic text-slate-600">
                        "{item.evidenceSnippet || item.evidenceArticleTitle}"
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onInspectArticle(item.evidenceArticleId!)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 shrink-0 ml-2"
                    >
                      View Source Article
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

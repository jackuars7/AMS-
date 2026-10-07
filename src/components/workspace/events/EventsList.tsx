import React, { useState } from 'react';
import {
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  GitMerge,
  Globe,
  Layers,
  Scale,
  Shield,
  ShieldAlert,
  Sparkles,
  Split,
  Tag,
} from 'lucide-react';
import { AdverseEvent, UserRole } from '../../../types/index.ts';
import { Badge, BadgeVariant } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';

interface EventsListProps {
  events: AdverseEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: AdverseEvent) => void;
  onOpenMergeModal: (event: AdverseEvent) => void;
  onOpenSplitModal: (event: AdverseEvent) => void;
  onConfirmEvent: (eventId: string) => void;
  onDismissEvent: (eventId: string) => void;
  activeRole?: UserRole;
}

export const EventsList: React.FC<EventsListProps> = ({
  events,
  selectedEventId,
  onSelectEvent,
  onOpenMergeModal,
  onOpenSplitModal,
  onConfirmEvent,
  onDismissEvent,
  activeRole = 'ANALYST',
}) => {
  const canMergeSplit = activeRole === 'CHECKER' || activeRole === 'COMPLIANCE_OFFICER' || activeRole === 'MLRO' || activeRole === 'ADMIN';
  const canEdit = activeRole !== 'AUDITOR';

  if (!events || events.length === 0) {
    return (
      <div id="events-list-empty" className="p-12 text-center bg-white rounded-xl border border-slate-200">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-500">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">No Adverse Events Detected</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
          Search results have not yet been clustered into adverse events, or matching filters returned zero results.
        </p>
      </div>
    );
  }

  const getLegalStatusBadge = (status: string) => {
    switch (status) {
      case 'FORMAL_CHARGES_FILED':
      case 'CONVICTED_GUILTY':
        return <Badge variant="danger" label={status.replace(/_/g, ' ')} />;
      case 'UNDER_INVESTIGATION':
      case 'INDICTED':
        return <Badge variant="warning" label={status.replace(/_/g, ' ')} />;
      case 'SETTLED_CIVIL':
      case 'ACQUITTED_DISMISSED':
        return <Badge variant="info" label={status.replace(/_/g, ' ')} />;
      default:
        return <Badge variant="neutral" label={status.replace(/_/g, ' ')} />;
    }
  };

  return (
    <div id="adverse-events-container" className="space-y-4">
      {events.map((event) => {
        const isSelected = selectedEventId === event.id;
        const totalArticles = event.articles?.length || 0;
        const independentSources = event.independentSourceCount || 1;
        const isSyndicatedInflated = totalArticles > independentSources;

        return (
          <div
            id={`event-card-${event.id}`}
            key={event.id}
            onClick={() => onSelectEvent(event)}
            className={`cursor-pointer rounded-xl border transition-all p-5 ${
              isSelected
                ? 'border-indigo-600 bg-indigo-50/20 shadow-md ring-1 ring-indigo-500'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            {/* Header: Title, Category, Status */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-700 uppercase tracking-wider">
                    {event.primaryCategory.replace(/_/g, ' ')}
                  </span>
                  {getLegalStatusBadge(event.legalStatus)}
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    <Globe className="w-3 h-3 text-slate-400" />
                    {event.jurisdiction}
                  </span>
                  {event.reviewStatus === 'CONFIRMED' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Confirmed by {event.confirmedByName || 'Compliance'}
                    </span>
                  ) : event.reviewStatus === 'DISMISSED' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 line-through">
                      Dismissed / False Positive
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Under Review
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 leading-snug hover:text-indigo-600 transition-colors">
                  {event.eventTitle}
                </h3>
                <p className="text-sm text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                  {event.eventSummary}
                </p>
              </div>

              {/* Independent Sources Counter Badge (Prevent syndicated echo chamber) */}
              <div className="flex flex-col items-end shrink-0">
                <div
                  id={`event-sources-counter-${event.id}`}
                  className={`px-3 py-2 rounded-lg border text-right ${
                    isSyndicatedInflated
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  }`}
                  title={
                    isSyndicatedInflated
                      ? `${totalArticles} total articles grouped, but only ${independentSources} independent newsroom sources. Syndicated duplicates deduplicated.`
                      : `${totalArticles} corroborating sources.`
                  }
                >
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Evidentiary Depth
                  </div>
                  <div className="text-base font-extrabold flex items-center justify-end gap-1.5 mt-0.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>{independentSources} Independent {independentSources === 1 ? 'Source' : 'Sources'}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 font-medium">
                    ({totalArticles} total articles)
                  </div>
                </div>
              </div>
            </div>

            {/* Event Details Ribbon: Authorities, Dates, Timeline preview */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-4">
                {event.investigatingAuthorities && event.investigatingAuthorities.length > 0 && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Scale className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-700">Authorities:</span>{' '}
                    {event.investigatingAuthorities.join(', ')}
                  </div>
                )}

                {event.dateRange && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {event.dateRange.startDate || 'Unknown'} —{' '}
                      {event.dateRange.isOngoing ? 'Ongoing' : event.dateRange.endDate || 'Present'}
                    </span>
                    <span className="text-slate-400">({event.dateRange.confidence.toLowerCase()} confidence)</span>
                  </div>
                )}

                {event.timeline && event.timeline.length > 0 && (
                  <div className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{event.timeline.length} Timeline Milestones</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {canMergeSplit && (
                  <>
                    <Button
                      id={`event-merge-btn-${event.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenMergeModal(event)}
                      className="text-xs text-slate-600 hover:text-indigo-600"
                    >
                      <GitMerge className="w-3.5 h-3.5 mr-1" />
                      Merge
                    </Button>
                    <Button
                      id={`event-split-btn-${event.id}`}
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenSplitModal(event)}
                      className="text-xs text-slate-600 hover:text-indigo-600"
                    >
                      <Split className="w-3.5 h-3.5 mr-1" />
                      Split
                    </Button>
                  </>
                )}

                {canEdit && event.reviewStatus !== 'CONFIRMED' && (
                  <Button
                    id={`event-confirm-btn-${event.id}`}
                    variant="outline"
                    size="sm"
                    onClick={() => onConfirmEvent(event.id)}
                    className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Confirm
                  </Button>
                )}

                <Button
                  id={`event-inspect-btn-${event.id}`}
                  variant="primary"
                  size="sm"
                  onClick={() => onSelectEvent(event)}
                  className="text-xs"
                >
                  Inspect Investigation
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

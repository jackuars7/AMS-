import React, { useState } from 'react';
import {
  AlertTriangle,
  GitMerge,
  Layers,
  ShieldAlert,
  X,
} from 'lucide-react';
import { AdverseEvent } from '../../../types/index.ts';
import { Button } from '../../common/Button.tsx';

interface MergeEventsModalProps {
  primaryEvent: AdverseEvent;
  availableEvents: AdverseEvent[];
  onClose: () => void;
  onMerge: (primaryEventId: string, secondaryEventId: string, rationale: string) => void;
}

export const MergeEventsModal: React.FC<MergeEventsModalProps> = ({
  primaryEvent,
  availableEvents,
  onClose,
  onMerge,
}) => {
  const otherEvents = availableEvents.filter((e) => e.id !== primaryEvent.id && e.reviewStatus !== 'ARCHIVED');
  const [selectedSecondaryId, setSelectedSecondaryId] = useState<string>(otherEvents[0]?.id || '');
  const [rationale, setRationale] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const secondaryEvent = otherEvents.find((e) => e.id === selectedSecondaryId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSecondaryId || !rationale.trim()) return;
    setIsSubmitting(true);
    onMerge(primaryEvent.id, selectedSecondaryId, rationale);
    onClose();
  };

  return (
    <div
      id="merge-events-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="merge-events-modal-container"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
              <GitMerge className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Merge Adverse Events (AM-19)</h3>
              <p className="text-xs text-slate-500">
                Consolidate two related event records while preserving all evidentiary articles and reversibility.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-1">
            <div className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">Primary Surviving Event</div>
            <div className="text-xs font-bold text-slate-900">{primaryEvent.eventTitle}</div>
            <div className="text-[11px] text-slate-600">
              {primaryEvent.jurisdiction} • {primaryEvent.articles.length} articles • {primaryEvent.independentSourceCount} independent sources
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Select Secondary Event to Merge Into Primary *
            </label>
            {otherEvents.length === 0 ? (
              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-500">
                No other active adverse events available in this case to merge.
              </div>
            ) : (
              <select
                id="merge-secondary-event-select"
                value={selectedSecondaryId}
                onChange={(e) => setSelectedSecondaryId(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500"
              >
                {otherEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.eventTitle} ({evt.articles.length} articles, {evt.jurisdiction})
                  </option>
                ))}
              </select>
            )}
          </div>

          {secondaryEvent && (
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-900">
              <div className="font-semibold">Merge Impact Preview:</div>
              <div>
                Secondary event will be marked as merged. Its {secondaryEvent.articles.length} evidentiary articles and {secondaryEvent.timeline.length} milestones will be transferred to the primary event.
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Investigator Merge Rationale *
            </label>
            <textarea
              id="merge-rationale-input"
              required
              rows={3}
              placeholder="State the investigative basis indicating these two records describe the same continuous legal matter or misconduct..."
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="text-[11px] text-slate-500 italic">
            * Note: Reversible operation. An immutable MergeOperation token will be created in the audit ledger allowing full reversal if new facts emerge.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              id="confirm-merge-btn"
              type="submit"
              variant="primary"
              size="sm"
              disabled={otherEvents.length === 0 || !rationale.trim() || isSubmitting}
              className="text-xs"
            >
              Confirm Reversible Merge
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

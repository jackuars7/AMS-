import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  FileText,
  Globe,
  Split,
  X,
} from 'lucide-react';
import { AdverseEvent, EventCategory } from '../../../types/index.ts';
import { Button } from '../../common/Button.tsx';

interface SplitEventModalProps {
  sourceEvent: AdverseEvent;
  onClose: () => void;
  onSplit: (sourceEventId: string, splitArticleIds: string[], newEventTitle: string, rationale: string) => void;
}

export const SplitEventModal: React.FC<SplitEventModalProps> = ({
  sourceEvent,
  onClose,
  onSplit,
}) => {
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleArticle = (artId: string) => {
    setSelectedArticleIds((prev) =>
      prev.includes(artId) ? prev.filter((id) => id !== artId) : [...prev, artId]
    );
  };

  const selectAll = () => {
    if (selectedArticleIds.length === sourceEvent.articles.length) {
      setSelectedArticleIds([]);
    } else {
      setSelectedArticleIds(sourceEvent.articles.map((a) => a.articleId));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedArticleIds.length === 0 || !newEventTitle.trim() || !rationale.trim()) return;
    if (selectedArticleIds.length === sourceEvent.articles.length) {
      alert('Cannot split all articles out of the source event; at least one article must remain in the source event.');
      return;
    }

    setIsSubmitting(true);
    onSplit(sourceEvent.id, selectedArticleIds, newEventTitle, rationale);
    onClose();
  };

  return (
    <div
      id="split-event-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="split-event-modal-container"
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Split className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Split Adverse Event (AM-19)</h3>
              <p className="text-xs text-slate-500">
                Disaggregate unrelated evidentiary articles into a separate adverse event with complete audit reversibility.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Source Event</div>
            <div className="text-xs font-bold text-slate-900">{sourceEvent.eventTitle}</div>
            <div className="text-[11px] text-slate-600">
              Total Articles: {sourceEvent.articles.length} • Jurisdiction: {sourceEvent.jurisdiction}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              New Event Title *
            </label>
            <input
              id="split-new-title-input"
              type="text"
              required
              placeholder="e.g. Unrelated 2019 Swiss Tax Evasion Investigation"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-slate-700">
                Select Articles to Move to New Event ({selectedArticleIds.length} of {sourceEvent.articles.length} selected) *
              </label>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                {selectedArticleIds.length === sourceEvent.articles.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
              {sourceEvent.articles.map((art) => {
                const isSelected = selectedArticleIds.includes(art.articleId);
                return (
                  <div
                    key={art.articleId}
                    onClick={() => toggleArticle(art.articleId)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 text-xs ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 text-indigo-950 font-medium'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border ${
                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">{art.publisher || art.domain}</span>
                        <span>•</span>
                        <span>{art.publishedAt ? new Date(art.publishedAt).toLocaleDateString() : 'No Date'}</span>
                        <span>•</span>
                        <span className="uppercase font-mono">{art.language}</span>
                      </div>
                      <div className="font-bold truncate mt-0.5">{art.title}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Investigator Split Rationale *
            </label>
            <textarea
              id="split-rationale-input"
              required
              rows={2}
              placeholder="State why these selected articles represent a distinct adverse matter rather than the continuous event..."
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              id="confirm-split-btn"
              type="submit"
              variant="primary"
              size="sm"
              disabled={selectedArticleIds.length === 0 || !newEventTitle.trim() || !rationale.trim() || isSubmitting}
              className="text-xs"
            >
              Confirm Reversible Split
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Bookmark, Filter, Plus, Star, Trash2 } from 'lucide-react';
import { SavedView } from '../../../types/index.ts';
import { apiClient } from '../../../lib/api-client.ts';
import { Modal } from '../../common/Modal.tsx';
import { Button } from '../../common/Button.tsx';

interface SavedViewsBarProps {
  activeViewId: string;
  onSelectView: (view: SavedView) => void;
  currentFilters: any;
  onViewCreated?: () => void;
}

export const SavedViewsBar: React.FC<SavedViewsBarProps> = ({
  activeViewId,
  onSelectView,
  currentFilters,
  onViewCreated,
}) => {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [newViewDescription, setNewViewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadViews = async () => {
    try {
      const res = await apiClient.getSavedViews();
      setSavedViews(res || []);
    } catch (err) {
      console.error('Error loading saved views:', err);
    }
  };

  useEffect(() => {
    loadViews();
  }, []);

  const handleCreateView = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newViewName.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await apiClient.createSavedView({
        name: newViewName.trim(),
        filters: currentFilters,
      });
      setSavedViews((prev) => [...prev, created]);
      onSelectView(created);
      setIsModalOpen(false);
      setNewViewName('');
      setNewViewDescription('');
      if (onViewCreated) onViewCreated();
    } catch (err) {
      console.error('Error creating saved view:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-0.5">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
          <Bookmark className="h-3 w-3 text-indigo-600" />
          Views:
        </span>

        {savedViews.map((view) => {
          const isActive = view.id === activeViewId;
          return (
            <button
              key={view.id}
              onClick={() => onSelectView(view)}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {view.isDefault && <Star className={`h-2.5 w-2.5 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />}
              <span>{view.name}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 transition-colors shrink-0"
      >
        <Plus className="h-3 w-3" />
        <span>Save Current View</span>
      </button>

      {/* Save View Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Save Current Search Filter View (AM-11)"
        description="Preserve current search filters, language selections, and sorting criteria for rapid retrieval during investigations."
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} size="sm">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateView}
              isLoading={isSubmitting}
              size="sm"
              disabled={!newViewName.trim()}
            >
              Save Preset
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateView} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Preset Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              placeholder="e.g., Unassessed Arabic Sanctions"
              required
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={newViewDescription}
              onChange={(e) => setNewViewDescription(e.target.value)}
              placeholder="Brief description of the workflow intent..."
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

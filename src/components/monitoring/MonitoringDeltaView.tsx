import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  HelpCircle,
  History,
  Sparkles,
  Tag,
  Users,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { DeltaItem, DeltaSet } from '../../types/index.ts';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { apiClient } from '../../lib/api-client.ts';

interface MonitoringDeltaViewProps {
  deltaSet?: DeltaSet;
  items?: DeltaItem[];
  compact?: boolean;
}

export const MonitoringDeltaView: React.FC<MonitoringDeltaViewProps> = ({
  deltaSet,
  items: directItems,
  compact = false,
}) => {
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(deltaSet?.aiSummary || null);
  const [selectedItem, setSelectedItem] = useState<DeltaItem | null>(null);

  const items = directItems || deltaSet?.items || [];

  const handleGenerateAiSummary = async () => {
    if (!deltaSet) return;
    setIsGeneratingAi(true);
    try {
      const res = await apiClient.generateAiDeltaSummary(deltaSet.id);
      setAiSummary(res.summary);
    } catch (err: any) {
      console.error('Failed to generate AI delta summary:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const getClassificationBadge = (classification?: string) => {
    switch (classification) {
      case 'NEW':
        return <Badge variant="primary">NEW</Badge>;
      case 'UPDATED':
        return <Badge variant="warning">UPDATED</Badge>;
      case 'UNCHANGED':
        return <Badge variant="neutral">UNCHANGED</Badge>;
      case 'RESOLVED':
        return <Badge variant="success">RESOLVED</Badge>;
      case 'REOPENED':
        return <Badge variant="critical">REOPENED</Badge>;
      case 'REMOVED_FROM_SOURCE':
        return <Badge variant="danger">REMOVED</Badge>;
      default:
        return <Badge variant="default">{classification || 'UNKNOWN'}</Badge>;
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-6 px-4 text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
        No delta items recorded for this monitoring cycle.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Advisory Summary Card */}
      {deltaSet && (
        <div className="rounded-lg bg-indigo-50/60 border border-indigo-200/80 p-3.5 text-xs">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-950">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Delta Interpretation</span>
              <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                Advisory Only • Non-Dispositive
              </span>
            </div>
            {!aiSummary && (
              <Button
                variant="secondary"
                size="sm"
                className="text-[11px] h-6 px-2 py-0"
                onClick={handleGenerateAiSummary}
                disabled={isGeneratingAi}
              >
                {isGeneratingAi ? 'Analyzing...' : 'Generate Summary'}
              </Button>
            )}
          </div>
          <p className="text-slate-700 leading-relaxed">
            {aiSummary || 'Click generate to obtain an AI advisory synthesis of deltas across subjects, legal statuses, and articles.'}
          </p>
        </div>
      )}

      {/* Delta Items List */}
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`border rounded-lg p-3 transition-colors ${
              item.isMaterial
                ? 'border-amber-300 bg-amber-50/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 capitalize">
                    {String(item.targetType || item.entityType || 'ITEM').replace('_', ' ')}
                  </span>
                  {getClassificationBadge(item.changeType || item.changeClassification)}
                  {item.isMaterial && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                      Material Change: {item.materialChangeType || item.diffDescription || 'Material Update'}
                    </span>
                  )}
                  {item.isSuppressed && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-slate-500" />
                      Suppressed by Policy
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-800 font-medium">
                  Field Changed: <span className="font-semibold text-slate-900">{item.fieldName || 'Attributes / Status'}</span>
                </div>
                {(item.diffDescription || item.explanation) && (
                  <p className="text-xs text-slate-600 italic">
                    "{item.diffDescription || item.explanation}"
                  </p>
                )}
              </div>

              {!compact && (item.previousValue || item.newValue) && (
                <button
                  type="button"
                  onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline shrink-0 mt-0.5"
                >
                  {selectedItem?.id === item.id ? 'Hide Diff' : 'Compare Diff'}
                </button>
              )}
            </div>

            {/* Side-by-Side Diff Section */}
            {(!compact || selectedItem?.id === item.id) && (item.previousValue || item.newValue) && (
              <div className="mt-3 pt-2.5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded bg-rose-50/50 border border-rose-200/80">
                  <div className="text-[11px] font-sans font-bold text-rose-800 mb-1 flex items-center gap-1">
                    <span>Before (Previous Version)</span>
                  </div>
                  <pre className="text-rose-950 whitespace-pre-wrap font-sans text-xs break-words">
                    {item.previousValue ? JSON.stringify(item.previousValue, null, 2) : '(None / New Record)'}
                  </pre>
                </div>
                <div className="p-2.5 rounded bg-emerald-50/50 border border-emerald-200/80">
                  <div className="text-[11px] font-sans font-bold text-emerald-800 mb-1 flex items-center gap-1">
                    <span>After (Current Ingestion)</span>
                  </div>
                  <pre className="text-emerald-950 whitespace-pre-wrap font-sans text-xs break-words">
                    {item.newValue ? JSON.stringify(item.newValue, null, 2) : '(Removed from Source)'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Globe,
  Languages,
  Search,
  Sparkles,
  Tag,
} from 'lucide-react';
import { QueryVariant, Subject } from '../../../types/index.ts';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';
import { apiClient } from '../../../lib/api-client.ts';

interface MultilingualQueriesSectionProps {
  queryVariants?: QueryVariant[];
  subjects?: Subject[];
}

const LANGUAGE_LABELS: Record<string, { name: string; script: string; isRTL?: boolean }> = {
  en: { name: 'English', script: 'Latin (LATN)' },
  ar: { name: 'Arabic', script: 'Arabic (ARAB)', isRTL: true },
  hi: { name: 'Hindi', script: 'Devanagari (DEVA)' },
  ml: { name: 'Malayalam', script: 'Malayalam (MLYM)' },
  es: { name: 'Spanish', script: 'Latin (LATN)' },
  ru: { name: 'Russian', script: 'Cyrillic (CYRL)' },
};

export const MultilingualQueriesSection: React.FC<MultilingualQueriesSectionProps> = ({
  queryVariants = [],
  subjects = [],
}) => {
  const [selectedLang, setSelectedLang] = useState<string>('ALL');
  const [expandedVariantId, setExpandedVariantId] = useState<string | null>(null);

  // Live preview testing tool state
  const [previewSubjectId, setPreviewSubjectId] = useState<string>(subjects[0]?.id || '');
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [previewResults, setPreviewResults] = useState<QueryVariant[] | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const activeVariants = previewResults || queryVariants;

  const filteredVariants = activeVariants.filter((v) => {
    if (selectedLang === 'ALL') return true;
    return v.language === selectedLang;
  });

  const languageCounts = activeVariants.reduce((acc, v) => {
    acc[v.language] = (acc[v.language] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleRunPreview = async () => {
    if (!previewSubjectId) return;
    setIsPreviewing(true);
    setPreviewError(null);
    try {
      const res = await apiClient.previewQueryExpansion(previewSubjectId, ['en', 'ar', 'hi', 'ml', 'es', 'ru']);
      setPreviewResults(res.variants);
    } catch (err: any) {
      setPreviewError(err.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Multilingual Query Expansion & Provenance (AM-07)
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Normalized lexical and semantic query sets across approved scripts with immutable translation provenance.
          </p>
        </div>

        {/* Live Preview Sub-tool for Subjects */}
        {subjects.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <select
              value={previewSubjectId}
              onChange={(e) => {
                setPreviewSubjectId(e.target.value);
                setPreviewResults(null);
              }}
              className="text-xs bg-white border border-slate-300 rounded px-2 py-1 text-slate-700"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  Subject: {s.primaryName}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunPreview}
              isLoading={isPreviewing}
              leftIcon={<Sparkles className="h-3 w-3 text-indigo-600" />}
              className="text-xs py-1 px-2.5"
            >
              Test Expansion
            </Button>
          </div>
        )}
      </div>

      {previewError && (
        <div className="text-xs p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
          {previewError}
        </div>
      )}

      {/* Language Filter Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setSelectedLang('ALL')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            selectedLang === 'ALL'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Scripts ({activeVariants.length})
        </button>

        {Object.entries(LANGUAGE_LABELS).map(([code, meta]) => {
          const count = languageCounts[code] || 0;
          const isSelected = selectedLang === code;
          return (
            <button
              key={code}
              onClick={() => setSelectedLang(code)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{meta.name}</span>
              <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Query Variants Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {filteredVariants.map((variant) => {
          const langMeta = LANGUAGE_LABELS[variant.language] || { name: variant.language, script: variant.script };
          const isExpanded = expandedVariantId === variant.id;

          return (
            <div
              key={variant.id}
              className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all text-xs space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="primary" size="sm">
                      {variant.language.toUpperCase()} • {variant.script}
                    </Badge>
                    {variant.isRTL && (
                      <Badge variant="warning" size="sm">
                        RTL (Right-to-Left)
                      </Badge>
                    )}
                    <span className="text-[10px] font-mono uppercase bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                      {variant.searchType}
                    </span>
                  </div>

                  <div
                    className={`text-sm font-bold text-slate-900 ${
                      variant.isRTL ? 'text-right font-serif' : 'font-sans'
                    }`}
                    dir={variant.isRTL ? 'rtl' : 'ltr'}
                  >
                    "{variant.originalQuery}"
                  </div>
                </div>

                <Badge variant={variant.approvalState === 'APPROVED' ? 'success' : 'neutral'} size="sm">
                  {variant.approvalState}
                </Badge>
              </div>

              {/* Normalized Query & Keywords */}
              <div className="bg-white p-2 rounded border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Normalized Lexical Token:</span>
                  <span className="font-mono text-slate-700">{variant.normalizedQuery}</span>
                </div>

                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <span className="text-[11px] text-slate-400">Typology Keywords:</span>
                  {variant.keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="bg-indigo-50 text-indigo-800 text-[10px] px-1.5 py-0.5 rounded border border-indigo-100 font-mono"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Translation Provenance Toggle */}
              {variant.translationRecord && (
                <div className="border-t border-slate-200 pt-1.5">
                  <button
                    onClick={() => setExpandedVariantId(isExpanded ? null : variant.id)}
                    className="flex items-center justify-between w-full text-[11px] text-indigo-700 hover:text-indigo-900 font-medium"
                  >
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      Translation Provenance Record (Rule: {variant.translationRecord.provenanceRule})
                    </span>
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 p-2 rounded bg-slate-100/70 border border-slate-200 space-y-1 text-[11px] font-mono text-slate-600">
                      <div className="flex justify-between">
                        <span>Rule Engine Version:</span>
                        <span className="font-bold text-slate-800">{variant.translationRecord.version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Confidence Score:</span>
                        <span className="font-bold text-emerald-700">
                          {Math.round(variant.translationRecord.confidenceScore * 100)}% (Certified)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Approved By:</span>
                        <span className="text-slate-700">
                          {variant.translationRecord.approvedBy} ({new Date(variant.translationRecord.approvedAt).toLocaleDateString()})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Deterministic Hash:</span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[200px]">
                          {variant.translationRecord.lexiconVersionHash}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

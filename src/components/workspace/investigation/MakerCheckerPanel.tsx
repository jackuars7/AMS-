import React, { useState } from 'react';
import {
  AlertCircle,
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck2,
  RotateCcw,
  Scale,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Users2,
  Zap,
} from 'lucide-react';
import {
  AnalystConclusion,
  Investigation,
  ReviewDecisionType,
  UserRole,
} from '../../../types/index.ts';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';

interface MakerCheckerPanelProps {
  investigation: Investigation;
  activeRole: UserRole;
  currentUserId: string;
  actionAvailability: {
    canPerformCheckerReview: boolean;
    checkerDisabledReason: string | null;
  };
  onSubmitReviewDecision: (payload: {
    decision: ReviewDecisionType;
    reviewNotes: string;
    deficienciesIdentified?: string[];
  }) => Promise<void>;
  isProcessing?: boolean;
}

export const MakerCheckerPanel: React.FC<MakerCheckerPanelProps> = ({
  investigation,
  activeRole,
  currentUserId,
  actionAvailability,
  onSubmitReviewDecision,
  isProcessing = false,
}) => {
  const [selectedDecision, setSelectedDecision] = useState<ReviewDecisionType>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [deficiencyInput, setDeficiencyInput] = useState('');
  const [deficiencies, setDeficiencies] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const analystConclusion = investigation.currentAnalystConclusion;

  const handleAddDeficiency = () => {
    if (deficiencyInput.trim()) {
      setDeficiencies([...deficiencies, deficiencyInput.trim()]);
      setDeficiencyInput('');
    }
  };

  const handleRemoveDeficiency = (idx: number) => {
    setDeficiencies(deficiencies.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (reviewNotes.trim().length < 15) {
      setFormError('Mandatory four-eyes review notes must contain at least 15 characters.');
      return;
    }

    if (selectedDecision === 'RETURN_FOR_REWORK' && deficiencies.length === 0) {
      setFormError('Returning for rework requires specifying at least one specific deficiency item.');
      return;
    }

    try {
      await onSubmitReviewDecision({
        decision: selectedDecision,
        reviewNotes: reviewNotes.trim(),
        deficienciesIdentified: deficiencies,
      });
      setReviewNotes('');
      setDeficiencies([]);
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit review decision.');
    }
  };

  const isReviewDisabled = !actionAvailability.canPerformCheckerReview;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Four-Eyes Maker-Checker Review (AM-41)</h3>
            <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono px-2 py-0.5 rounded-full">
              Segregation of Duties Enforced
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Independent verification of analyst factual findings, risk calibration, and evidence citations before risk acceptance.
          </p>
        </div>

        <Badge
          variant={
            investigation.status === 'AWAITING_CHECKER'
              ? 'primary'
              : investigation.status === 'COMPLETED'
              ? 'success'
              : 'neutral'
          }
        >
          {investigation.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Segregation of Duties / Action Availability Alert */}
      {isReviewDisabled && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <span>Four-Eyes Review Inactive</span>
          </div>
          <p>{actionAvailability.checkerDisabledReason}</p>
        </div>
      )}

      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Analyst Submission Summary Card */}
      {analystConclusion ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">
                Primary Analyst Submission
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-bold text-slate-900 text-sm">
                  {analystConclusion.submittedByName} ({analystConclusion.submittedByRole})
                </span>
                <span className="text-slate-400 text-xs">
                  &bull; {new Date(analystConclusion.submittedAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="primary">{analystConclusion.finding}</Badge>
              <Badge
                variant={
                  analystConclusion.riskRating === 'HIGH'
                    ? 'danger'
                    : analystConclusion.riskRating === 'MEDIUM'
                    ? 'warning'
                    : 'neutral'
                }
              >
                {analystConclusion.riskRating} RISK
              </Badge>
              <Badge variant="neutral">{analystConclusion.actionRecommendation}</Badge>
            </div>
          </div>

          {/* Factual Rationale */}
          <div className="text-xs space-y-1">
            <span className="font-bold text-slate-700">Analyst Factual Rationale:</span>
            <p className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 leading-relaxed font-sans">
              {analystConclusion.rationale}
            </p>
          </div>

          {/* Citations & Policy */}
          <div className="flex flex-wrap items-center justify-between text-xs gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Citations:</span>
              {analystConclusion.citations.map((c, idx) => (
                <span
                  key={idx}
                  className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200"
                >
                  {c}
                </span>
              ))}
            </div>

            <div className="font-mono text-[10px] text-slate-400">
              Policy Version: {analystConclusion.policyVersion}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-white rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs text-center">
          No analyst disposition has been submitted yet for four-eyes review.
        </div>
      )}

      {/* Review Adjudication Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Four-Eyes Review Adjudication
        </h4>

        {/* Decision Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label
            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              selectedDecision === 'APPROVE'
                ? 'border-emerald-600 bg-emerald-50/50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>APPROVE</span>
              </div>
              <input
                type="radio"
                name="decision"
                disabled={isReviewDisabled}
                checked={selectedDecision === 'APPROVE'}
                onChange={() => setSelectedDecision('APPROVE')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Accept findings, risk rating, and recommended action. Concludes investigation.
            </p>
          </label>

          <label
            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              selectedDecision === 'RETURN_FOR_REWORK'
                ? 'border-rose-600 bg-rose-50/50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                <RotateCcw className="h-4 w-4 text-rose-600" />
                <span>RETURN FOR REWORK</span>
              </div>
              <input
                type="radio"
                name="decision"
                disabled={isReviewDisabled}
                checked={selectedDecision === 'RETURN_FOR_REWORK'}
                onChange={() => setSelectedDecision('RETURN_FOR_REWORK')}
                className="text-rose-600 focus:ring-rose-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Reject with specific deficiencies. Returns case to Primary Analyst.
            </p>
          </label>

          <label
            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              selectedDecision === 'ESCALATE'
                ? 'border-amber-600 bg-amber-50/50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                <AlertOctagon className="h-4 w-4 text-amber-600" />
                <span>ESCALATE TO COMPLIANCE</span>
              </div>
              <input
                type="radio"
                name="decision"
                disabled={isReviewDisabled}
                checked={selectedDecision === 'ESCALATE'}
                onChange={() => setSelectedDecision('ESCALATE')}
                className="text-amber-600 focus:ring-amber-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Escalate complex legal questions, SAR proposals, or conflicting facts to Compliance.
            </p>
          </label>
        </div>

        {/* Return for Rework Specific Deficiencies */}
        {selectedDecision === 'RETURN_FOR_REWORK' && (
          <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2">
            <label className="block text-xs font-bold text-rose-900">
              Specific Deficiencies & Required Action Items
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                disabled={isReviewDisabled}
                placeholder="e.g. Missing corporate registry documentation for subsidiary"
                value={deficiencyInput}
                onChange={(e) => setDeficiencyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDeficiency();
                  }
                }}
                className="flex-1 text-xs p-2 rounded-lg border border-rose-300 bg-white"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isReviewDisabled}
                onClick={handleAddDeficiency}
              >
                Add Item
              </Button>
            </div>

            {deficiencies.length > 0 && (
              <ul className="space-y-1 pt-1">
                {deficiencies.map((def, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between text-xs bg-white p-2 rounded border border-rose-200 text-rose-950"
                  >
                    <span>&bull; {def}</span>
                    <button
                      type="button"
                      disabled={isReviewDisabled}
                      onClick={() => handleRemoveDeficiency(idx)}
                      className="text-rose-600 hover:text-rose-800 font-bold px-1"
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Review Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-900 mb-1">
            Reviewer Examination Notes & Findings (Mandatory)
          </label>
          <textarea
            rows={3}
            disabled={isReviewDisabled}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Record your independent evaluation of evidence credibility, corroboration checks, and policy alignment..."
            className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-slate-200">
          <Button
            type="submit"
            size="md"
            variant="primary"
            disabled={isReviewDisabled}
            isLoading={isProcessing}
            leftIcon={<ShieldCheck className="h-4 w-4" />}
          >
            Execute Four-Eyes Decision
          </Button>
        </div>
      </form>
    </div>
  );
};

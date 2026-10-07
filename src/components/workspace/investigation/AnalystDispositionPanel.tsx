import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  HelpCircle,
  Info,
  Link,
  Save,
  Send,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import {
  ActionRecommendation,
  AdverseEvent,
  AnalystConclusion,
  FindingClassification,
  Investigation,
  RiskRating,
  UserRole,
} from '../../../types/index.ts';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';

interface AnalystDispositionPanelProps {
  investigation: Investigation;
  events: AdverseEvent[];
  activeRole: UserRole;
  actionAvailability: {
    canSubmitDisposition: boolean;
    dispositionDisabledReason: string | null;
  };
  onSubmitDisposition: (payload: {
    finding: FindingClassification;
    riskRating: RiskRating;
    actionRecommendation: ActionRecommendation;
    rationale: string;
    citations: string[];
    policyVersion: string;
  }) => Promise<void>;
  onSaveDraft: (payload: any) => Promise<void>;
  initialDraftPayload?: any;
  isProcessing?: boolean;
}

export const AnalystDispositionPanel: React.FC<AnalystDispositionPanelProps> = ({
  investigation,
  events,
  activeRole,
  actionAvailability,
  onSubmitDisposition,
  onSaveDraft,
  initialDraftPayload,
  isProcessing = false,
}) => {
  const [finding, setFinding] = useState<FindingClassification>(
    initialDraftPayload?.finding ||
      investigation.currentAnalystConclusion?.finding ||
      'TRUE_POSITIVE'
  );
  const [riskRating, setRiskRating] = useState<RiskRating>(
    initialDraftPayload?.riskRating ||
      investigation.currentAnalystConclusion?.riskRating ||
      investigation.priority === 'URGENT' ? 'HIGH' : 'MEDIUM'
  );
  const [actionRecommendation, setActionRecommendation] = useState<ActionRecommendation>(
    initialDraftPayload?.actionRecommendation ||
      investigation.currentAnalystConclusion?.actionRecommendation ||
      'ESCALATE_SAR'
  );
  const [rationale, setRationale] = useState<string>(
    initialDraftPayload?.rationale ||
      investigation.currentAnalystConclusion?.rationale ||
      ''
  );
  const [citations, setCitations] = useState<string[]>(
    initialDraftPayload?.citations ||
      investigation.currentAnalystConclusion?.citations ||
      events.map((e) => e.id)
  );

  const [policyVersion] = useState('POL-MAT-2024.1');
  const [draftStatus, setDraftStatus] = useState<string>('Saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger autosave when form values change
  const triggerAutosave = (updatedPayload: any) => {
    setDraftStatus('Saving draft...');
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    autosaveTimeoutRef.current = setTimeout(async () => {
      try {
        await onSaveDraft(updatedPayload);
        setDraftStatus(`Draft saved at ${new Date().toLocaleTimeString()}`);
      } catch (err) {
        setDraftStatus('Autosave failed');
      }
    }, 1000);
  };

  const handleRationaleChange = (val: string) => {
    setRationale(val);
    triggerAutosave({
      finding,
      riskRating,
      actionRecommendation,
      rationale: val,
      citations,
      policyVersion,
    });
  };

  const handleCitationToggle = (citationId: string) => {
    const updated = citations.includes(citationId)
      ? citations.filter((c) => c !== citationId)
      : [...citations, citationId];
    setCitations(updated);
    triggerAutosave({
      finding,
      riskRating,
      actionRecommendation,
      rationale,
      citations: updated,
      policyVersion,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (rationale.trim().length < 25) {
      setErrorMessage(
        'Compliance Policy Requirement: Analyst factual rationale must be substantive (minimum 25 characters).'
      );
      return;
    }

    if (citations.length === 0) {
      setErrorMessage('Policy Requirement: At least one evidentiary citation must be linked to the disposition.');
      return;
    }

    try {
      await onSubmitDisposition({
        finding,
        riskRating,
        actionRecommendation,
        rationale: rationale.trim(),
        citations,
        policyVersion,
      });
      setDraftStatus('Disposition submitted');
    } catch (err: any) {
      setErrorMessage(err.message || 'Submission failed.');
    }
  };

  const isFormDisabled = !actionAvailability.canSubmitDisposition;

  return (
    <div className="space-y-6">
      {/* Policy and Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Structured Analyst Disposition Form (AM-39)</h3>
            <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
              {policyVersion}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Author mandatory factual findings, calibrated risk ratings, and recommended next actions. Enforces immutable human attribution.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Save className="h-3.5 w-3.5 text-slate-400" />
            {draftStatus}
          </span>
          <Badge
            variant={
              investigation.status === 'AWAITING_CHECKER'
                ? 'success'
                : investigation.status === 'REWORK_REQUESTED'
                ? 'danger'
                : 'neutral'
            }
          >
            {investigation.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Disabled Explanation Alert */}
      {isFormDisabled && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <Info className="h-4 w-4 text-amber-600" />
            <span>Disposition Form Read-Only</span>
          </div>
          <p>{actionAvailability.dispositionDisabledReason}</p>
        </div>
      )}

      {/* Rework Guidance Alert if returned */}
      {investigation.status === 'REWORK_REQUESTED' && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>Rework Requested by Checker</span>
          </div>
          <p>
            Please address the checker&apos;s review comments before resubmitting your structured disposition.
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Disposition Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Finding Classification */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">
              1. Finding Classification
            </label>
            <select
              disabled={isFormDisabled}
              value={finding}
              onChange={(e) => {
                const val = e.target.value as FindingClassification;
                setFinding(val);
                triggerAutosave({
                  finding: val,
                  riskRating,
                  actionRecommendation,
                  rationale,
                  citations,
                  policyVersion,
                });
              }}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold"
            >
              <option value="TRUE_POSITIVE">TRUE POSITIVE (Match Confirmed)</option>
              <option value="FALSE_POSITIVE">FALSE POSITIVE (Dissimilar Subject)</option>
              <option value="INCONCLUSIVE">INCONCLUSIVE (Pending Proof)</option>
              <option value="RETRACTED">RETRACTED (Publisher Retraction)</option>
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Formal determination of subject involvement in adverse media event.
            </span>
          </div>

          {/* Calibrated Risk Rating */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">
              2. Calibrated Risk Rating
            </label>
            <select
              disabled={isFormDisabled}
              value={riskRating}
              onChange={(e) => {
                const val = e.target.value as RiskRating;
                setRiskRating(val);
                triggerAutosave({
                  finding,
                  riskRating: val,
                  actionRecommendation,
                  rationale,
                  citations,
                  policyVersion,
                });
              }}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold"
            >
              <option value="HIGH">HIGH (Severe Financial Crime / Sanctions)</option>
              <option value="MEDIUM">MEDIUM (Allegations / Ongoing Inquiry)</option>
              <option value="LOW">LOW (Peripheral Role / Minor / Resolved)</option>
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Impact level according to institution AML Risk Appetite Matrix.
            </span>
          </div>

          {/* Action Recommendation */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">
              3. Recommended Action
            </label>
            <select
              disabled={isFormDisabled}
              value={actionRecommendation}
              onChange={(e) => {
                const val = e.target.value as ActionRecommendation;
                setActionRecommendation(val);
                triggerAutosave({
                  finding,
                  riskRating,
                  actionRecommendation: val,
                  rationale,
                  citations,
                  policyVersion,
                });
              }}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold"
            >
              <option value="ESCALATE_SAR">ESCALATE FOR SAR EVALUATION</option>
              <option value="DISMISS">DISMISS ALERT (No Risk Action)</option>
              <option value="ENHANCED_MONITORING">PLACE ON ENHANCED MONITORING</option>
              <option value="EXEMPTION_REQUEST">REQUEST POLICY EXEMPTION</option>
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Operational routing recommendation for the Four-Eyes reviewer.
            </span>
          </div>
        </div>

        {/* Factual Rationale & Analysis */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-900">
              4. Factual Rationale & Corroborated Evidence Analysis (Mandatory)
            </label>
            <span className="text-[11px] text-slate-400 font-mono">
              {rationale.length} characters (min 25)
            </span>
          </div>
          <textarea
            rows={5}
            disabled={isFormDisabled}
            value={rationale}
            onChange={(e) => handleRationaleChange(e.target.value)}
            placeholder="Document the exact corroborating facts, jurisdiction analysis, verified executive ties, and evidence strength supporting this conclusion..."
            className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed"
          />
        </div>

        {/* Evidentiary Citations Linking (AM-39) */}
        <div>
          <label className="block text-xs font-bold text-slate-900 mb-1.5">
            5. Evidentiary Citations (Link to Versioned Source Records)
          </label>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <p className="text-[11px] text-slate-500">
              Select adverse events and evidence articles that substantiate this disposition:
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {events.map((ev) => (
                <label
                  key={ev.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    disabled={isFormDisabled}
                    checked={citations.includes(ev.id)}
                    onChange={() => handleCitationToggle(ev.id)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-mono text-[11px] text-slate-500 font-semibold">{ev.id}</span>
                  <span className="text-slate-900 font-medium truncate flex-1">{ev.eventTitle}</span>
                  <Badge variant="neutral">{ev.legalStatus}</Badge>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Submission Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Shield className="h-4 w-4 text-indigo-600" />
            <span>Submitted conclusions require Maker-Checker four-eyes review before closure.</span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isFormDisabled}
            isLoading={isProcessing}
            leftIcon={<Send className="h-4 w-4" />}
          >
            Submit Disposition to Four-Eyes Review
          </Button>
        </div>
      </form>
    </div>
  );
};

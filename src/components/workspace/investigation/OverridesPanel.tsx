import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  FileCheck,
  Plus,
  RotateCcw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react';
import { AdverseEvent, InvestigationOverride, UserRole } from '../../../types/index.ts';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';

interface OverridesPanelProps {
  overrides: InvestigationOverride[];
  events: AdverseEvent[];
  activeRole: UserRole;
  currentUserId: string;
  onProposeOverride: (payload: {
    targetEntityId: string;
    targetField: string;
    originalValue: any;
    overriddenValue: any;
    justification: string;
    citations: string[];
    recalculationImpact: string;
  }) => Promise<void>;
  onApproveOverride: (overrideId: string, notes?: string) => Promise<void>;
  isProcessing?: boolean;
}

export const OverridesPanel: React.FC<OverridesPanelProps> = ({
  overrides,
  events,
  activeRole,
  currentUserId,
  onProposeOverride,
  onApproveOverride,
  isProcessing = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetEntityId, setTargetEntityId] = useState(events[0]?.id || 'GLOBAL');
  const [targetField, setTargetField] = useState('LEGAL_STATUS');
  const [originalValue, setOriginalValue] = useState('UNVERIFIED_ACCUSATION');
  const [overriddenValue, setOverriddenValue] = useState('FORMAL_INDICTMENT');
  const [justification, setJustification] = useState('');
  const [recalculationImpact, setRecalculationImpact] = useState('Upgrades event severity from LOW to HIGH; triggers mandatory SAR triage.');
  const [selectedCitations, setSelectedCitations] = useState<string[]>([]);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleProposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (justification.trim().length < 20) {
      setFormError('Mandatory human justification must contain at least 20 characters.');
      return;
    }

    try {
      await onProposeOverride({
        targetEntityId,
        targetField,
        originalValue,
        overriddenValue,
        justification: justification.trim(),
        citations: selectedCitations.length > 0 ? selectedCitations : [targetEntityId],
        recalculationImpact: recalculationImpact.trim(),
      });
      setIsModalOpen(false);
      setJustification('');
      setFormError(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to propose override.');
    }
  };

  const handleApprove = async (overrideId: string) => {
    try {
      await onApproveOverride(overrideId, approvalNotes || 'Approved by four-eyes reviewer.');
      setApprovingId(null);
      setApprovalNotes('');
    } catch (err: any) {
      setFormError(err.message || 'Approval failed.');
    }
  };

  const canApprove = activeRole === 'CHECKER' || activeRole === 'COMPLIANCE_OFFICER' || activeRole === 'MLRO';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Human Corrections & Overrides Ledger (AM-40)</h3>
            <span className="text-xs bg-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded-full">
              {overrides.length} Logged
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Permit authorized AML practitioners to correct automated classifications or legal status while enforcing four-eyes segregation.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            setIsModalOpen(true);
            setFormError(null);
          }}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          Propose Override
        </Button>
      </div>

      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Overrides List */}
      <div className="space-y-3">
        {overrides.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
            No active human overrides recorded for this case. System running on baseline assessments.
          </div>
        ) : (
          overrides.map((ov) => {
            const isSelfAuthor = ov.actor.id === currentUserId;
            const isPending = ov.status === 'PENDING_APPROVAL';

            return (
              <div
                key={ov.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={ov.status === 'ACTIVE' ? 'success' : ov.status === 'PENDING_APPROVAL' ? 'warning' : 'danger'}>
                      {ov.status}
                    </Badge>
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      Field: {ov.targetField}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Target: {ov.targetEntityId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <User className="h-3.5 w-3.5" />
                    <span>
                      Proposed by {ov.actor.name} ({ov.actor.role})
                    </span>
                  </div>
                </div>

                {/* Diff Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-rose-600 font-bold block mb-1">
                      Original Value
                    </span>
                    <span className="font-mono text-slate-700 bg-white p-2 rounded border border-slate-200 block">
                      {String(ov.originalValue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold block mb-1">
                      Overridden Value
                    </span>
                    <span className="font-mono text-emerald-800 font-semibold bg-emerald-50/50 p-2 rounded border border-emerald-200 block">
                      {String(ov.overriddenValue)}
                    </span>
                  </div>
                </div>

                {/* Justification & Impact */}
                <div className="text-xs space-y-1">
                  <div className="text-slate-700">
                    <span className="font-bold text-slate-900">Justification: </span>
                    {ov.justification}
                  </div>
                  {ov.recalculationImpact && (
                    <div className="text-indigo-900 bg-indigo-50/70 p-2 rounded border border-indigo-100 font-mono text-[11px]">
                      <span className="font-bold">Recalculation Impact: </span>
                      {ov.recalculationImpact}
                    </div>
                  )}
                </div>

                {/* Citations */}
                {ov.citations && ov.citations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-500 font-semibold">Citations:</span>
                    {ov.citations.map((c, cIdx) => (
                      <span key={cIdx} className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {/* Four-Eyes Approval Action */}
                {isPending && (
                  <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {isSelfAuthor ? (
                      <span className="text-[11px] text-amber-700 italic flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                        Segregation of Duties: You authored this override and cannot self-approve.
                      </span>
                    ) : canApprove ? (
                      <div className="flex items-center gap-2 w-full justify-end">
                        <input
                          type="text"
                          placeholder="Optional checker notes..."
                          value={approvingId === ov.id ? approvalNotes : ''}
                          onChange={(e) => {
                            setApprovingId(ov.id);
                            setApprovalNotes(e.target.value);
                          }}
                          className="text-xs p-1.5 rounded border border-slate-300 w-64"
                        />
                        <Button
                          size="xs"
                          variant="primary"
                          onClick={() => handleApprove(ov.id)}
                          isLoading={isProcessing}
                          leftIcon={<ShieldCheck className="h-3 w-3" />}
                        >
                          Approve Override (4-Eyes)
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500">
                        Requires Checker or Compliance role to approve.
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Propose Override Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleProposeSubmit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-2 text-slate-900">
              <Edit3 className="h-5 w-5 text-indigo-600" />
              <h3 className="text-base font-bold">Propose Human Correction / Override (AM-40)</h3>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Entity</label>
                <select
                  value={targetEntityId}
                  onChange={(e) => setTargetEntityId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.id}: {ev.eventTitle}
                    </option>
                  ))}
                  <option value="GLOBAL">Case Overall Assessment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Field to Override</label>
                <select
                  value={targetField}
                  onChange={(e) => setTargetField(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="LEGAL_STATUS">Legal Status</option>
                  <option value="IDENTITY_MATCH_SCORE">Identity Match Score</option>
                  <option value="MATERIALITY_SCORE">Materiality Score</option>
                  <option value="SEVERITY_LEVEL">Severity Level</option>
                  <option value="SOURCE_ROLE">Source Credibility / Role</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Original Value</label>
                  <input
                    type="text"
                    required
                    value={originalValue}
                    onChange={(e) => setOriginalValue(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Overridden Value</label>
                  <input
                    type="text"
                    required
                    value={overriddenValue}
                    onChange={(e) => setOverriddenValue(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono text-emerald-800 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Justification Rationale (Min 20 chars)
                </label>
                <textarea
                  rows={3}
                  required
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Detail the verified court record, legal clarification, or certified proof justifying this override..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recalculation Impact Analysis
                </label>
                <input
                  type="text"
                  value={recalculationImpact}
                  onChange={(e) => setRecalculationImpact(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                variant="primary"
                isLoading={isProcessing}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Submit for 4-Eyes Approval
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

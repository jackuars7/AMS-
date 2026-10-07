import React, { useState } from 'react';
import {
  AlertCircle,
  AlertOctagon,
  Award,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileText,
  Lock,
  RotateCcw,
  Scale,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react';
import {
  ComplianceDecisionType,
  EscalationRecord,
  Investigation,
  MlroStatutoryDecision,
  UserRole,
} from '../../../types/index.ts';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';

interface ComplianceMlroPanelProps {
  investigation: Investigation;
  activeEscalation?: EscalationRecord;
  activeRole: UserRole;
  actionAvailability: {
    canAdjudicateCompliance: boolean;
    complianceDisabledReason: string | null;
    canDetermineMlro: boolean;
    mlroDisabledReason: string | null;
  };
  onSubmitComplianceDecision: (payload: {
    decision: ComplianceDecisionType;
    guidanceNotes: string;
    conditions?: string[];
  }) => Promise<void>;
  onSubmitMlroDecision: (payload: {
    statutoryDecision: MlroStatutoryDecision;
    regulatoryDisclosureNotes: string;
    sarReference?: string;
  }) => Promise<void>;
  isProcessing?: boolean;
}

export const ComplianceMlroPanel: React.FC<ComplianceMlroPanelProps> = ({
  investigation,
  activeEscalation,
  activeRole,
  actionAvailability,
  onSubmitComplianceDecision,
  onSubmitMlroDecision,
  isProcessing = false,
}) => {
  // Compliance state
  const [complianceDecision, setComplianceDecision] = useState<ComplianceDecisionType>('APPROVE_WITH_CONDITIONS');
  const [guidanceNotes, setGuidanceNotes] = useState('');
  const [conditionInput, setConditionInput] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [complianceError, setComplianceError] = useState<string | null>(null);

  // MLRO state
  const [mlroDecision, setMlroDecision] = useState<MlroStatutoryDecision>('FILE_SAR');
  const [disclosureNotes, setDisclosureNotes] = useState('');
  const [sarRef, setSarRef] = useState(`SAR-CH-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`);
  const [mlroError, setMlroError] = useState<string | null>(null);

  const handleAddCondition = () => {
    if (conditionInput.trim()) {
      setConditions([...conditions, conditionInput.trim()]);
      setConditionInput('');
    }
  };

  const handleRemoveCondition = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const handleComplianceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setComplianceError(null);

    if (guidanceNotes.trim().length < 15) {
      setComplianceError('Compliance guidance notes must contain at least 15 characters.');
      return;
    }

    try {
      await onSubmitComplianceDecision({
        decision: complianceDecision,
        guidanceNotes: guidanceNotes.trim(),
        conditions: conditions.length > 0 ? conditions : undefined,
      });
      setGuidanceNotes('');
      setConditions([]);
    } catch (err: any) {
      setComplianceError(err.message || 'Compliance decision failed.');
    }
  };

  const handleMlroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMlroError(null);

    if (disclosureNotes.trim().length < 20) {
      setMlroError('Regulatory disclosure notes must contain at least 20 characters.');
      return;
    }

    try {
      await onSubmitMlroDecision({
        statutoryDecision: mlroDecision,
        regulatoryDisclosureNotes: disclosureNotes.trim(),
        sarReference: mlroDecision === 'FILE_SAR' ? sarRef.trim() : undefined,
      });
      setDisclosureNotes('');
    } catch (err: any) {
      setMlroError(err.message || 'MLRO decision failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Compliance & MLRO Escalation Adjudication (AM-42)</h3>
            <span className="text-xs bg-rose-50 text-rose-700 border border-rose-200 font-mono px-2 py-0.5 rounded-full">
              Statutory Reporting Gate
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Senior legal and statutory authority determination for Suspicious Activity Reports (SARs) and high-risk AML matters.
          </p>
        </div>

        <Badge
          variant={
            investigation.status === 'ESCALATED_MLRO'
              ? 'critical'
              : investigation.status === 'ESCALATED_COMPLIANCE'
              ? 'warning'
              : 'neutral'
          }
        >
          {investigation.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Active Escalation Details */}
      {activeEscalation ? (
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-amber-600" />
              <span className="font-bold text-amber-950 text-xs">Active Escalation Request</span>
              <Badge variant="warning">{activeEscalation.escalationReason}</Badge>
            </div>
            <span className="text-[11px] text-amber-800 font-mono">
              Triggered: {new Date(activeEscalation.triggeredAt).toLocaleString()}
            </span>
          </div>

          <p className="text-xs text-amber-900 font-medium">{activeEscalation.notes}</p>
          <div className="text-[11px] text-amber-700">
            Escalated by: <span className="font-semibold">{activeEscalation.triggeredByName}</span> ({activeEscalation.triggeredByRole})
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
          No active escalation pending. Cases can be escalated from Four-Eyes review or direct high-risk policy rules.
        </div>
      )}

      {/* Compliance Officer Adjudication Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Compliance Officer Adjudication
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Role: COMPLIANCE_OFFICER or MLRO
          </span>
        </div>

        {!actionAvailability.canAdjudicateCompliance && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
            <Lock className="h-4 w-4 text-slate-400 shrink-0" />
            <span>{actionAvailability.complianceDisabledReason}</span>
          </div>
        )}

        {complianceError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{complianceError}</span>
          </div>
        )}

        <form onSubmit={handleComplianceSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label
              className={`p-3 rounded-lg border-2 cursor-pointer ${
                complianceDecision === 'APPROVE_WITH_CONDITIONS'
                  ? 'border-indigo-600 bg-indigo-50/40'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">APPROVE WITH CONDITIONS</span>
                <input
                  type="radio"
                  disabled={!actionAvailability.canAdjudicateCompliance}
                  checked={complianceDecision === 'APPROVE_WITH_CONDITIONS'}
                  onChange={() => setComplianceDecision('APPROVE_WITH_CONDITIONS')}
                  className="text-indigo-600"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Risk acceptable subject to enhanced monitoring or EDD.
              </p>
            </label>

            <label
              className={`p-3 rounded-lg border-2 cursor-pointer ${
                complianceDecision === 'RETURN_WITH_GUIDANCE'
                  ? 'border-amber-600 bg-amber-50/40'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">RETURN WITH GUIDANCE</span>
                <input
                  type="radio"
                  disabled={!actionAvailability.canAdjudicateCompliance}
                  checked={complianceDecision === 'RETURN_WITH_GUIDANCE'}
                  onChange={() => setComplianceDecision('RETURN_WITH_GUIDANCE')}
                  className="text-amber-600"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Provide legal directions and return to Maker-Checker.
              </p>
            </label>

            <label
              className={`p-3 rounded-lg border-2 cursor-pointer ${
                complianceDecision === 'REFER_TO_MLRO'
                  ? 'border-rose-600 bg-rose-50/40'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900">REFER TO MLRO</span>
                <input
                  type="radio"
                  disabled={!actionAvailability.canAdjudicateCompliance}
                  checked={complianceDecision === 'REFER_TO_MLRO'}
                  onChange={() => setComplianceDecision('REFER_TO_MLRO')}
                  className="text-rose-600"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Escalate directly for statutory SAR determination.
              </p>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Compliance Directions & Guidance Notes (Mandatory)
            </label>
            <textarea
              rows={3}
              disabled={!actionAvailability.canAdjudicateCompliance}
              value={guidanceNotes}
              onChange={(e) => setGuidanceNotes(e.target.value)}
              placeholder="Detail regulatory risk analysis, legal policy justifications, or required follow-ups..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {complianceDecision === 'APPROVE_WITH_CONDITIONS' && (
            <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-xs font-bold text-slate-900">
                Mandatory Operational Conditions
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled={!actionAvailability.canAdjudicateCompliance}
                  placeholder="e.g. Semi-annual transaction review required"
                  value={conditionInput}
                  onChange={(e) => setConditionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCondition();
                    }
                  }}
                  className="flex-1 text-xs p-1.5 rounded border border-slate-300 bg-white"
                />
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  disabled={!actionAvailability.canAdjudicateCompliance}
                  onClick={handleAddCondition}
                >
                  Add Condition
                </Button>
              </div>

              {conditions.length > 0 && (
                <ul className="space-y-1 pt-1">
                  {conditions.map((cond, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between text-xs bg-white p-1.5 rounded border border-slate-200"
                    >
                      <span>&bull; {cond}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(idx)}
                        className="text-rose-500 hover:text-rose-700 font-bold px-1"
                      >
                        &times;
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={!actionAvailability.canAdjudicateCompliance}
              isLoading={isProcessing}
              leftIcon={<FileCheck2 className="h-3.5 w-3.5" />}
            >
              Submit Compliance Determination
            </Button>
          </div>
        </form>
      </div>

      {/* MLRO Statutory Determination Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-rose-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. MLRO Statutory Determination (SAR Authority Gate)
            </h4>
          </div>
          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            Exclusive to MLRO Role
          </span>
        </div>

        {/* Mandatory Policy Invariant Notice */}
        <div className="p-3 bg-slate-900 text-white rounded-lg text-xs flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold text-amber-300">Regulatory Governance Invariant: </span>
            <span>
              AI models and non-MLRO actors are strictly barred from executing or simulating statutory SAR determinations. Every determination is immutably signed.
            </span>
          </div>
        </div>

        {!actionAvailability.canDetermineMlro && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
            <Lock className="h-4 w-4 text-slate-400 shrink-0" />
            <span>{actionAvailability.mlroDisabledReason}</span>
          </div>
        )}

        {mlroError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{mlroError}</span>
          </div>
        )}

        <form onSubmit={handleMlroSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label
              className={`p-3 rounded-lg border-2 cursor-pointer ${
                mlroDecision === 'FILE_SAR'
                  ? 'border-rose-600 bg-rose-50/40'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900">FILE SAR (STR)</span>
                <input
                  type="radio"
                  disabled={!actionAvailability.canDetermineMlro}
                  checked={mlroDecision === 'FILE_SAR'}
                  onChange={() => setMlroDecision('FILE_SAR')}
                  className="text-rose-600"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                File formal report with national Financial Intelligence Unit (FIU/MROS).
              </p>
            </label>

            <label
              className={`p-3 rounded-lg border-2 cursor-pointer ${
                mlroDecision === 'DISMISS_NO_SAR'
                  ? 'border-emerald-600 bg-emerald-50/40'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">DISMISS NO SAR</span>
                <input
                  type="radio"
                  disabled={!actionAvailability.canDetermineMlro}
                  checked={mlroDecision === 'DISMISS_NO_SAR'}
                  onChange={() => setMlroDecision('DISMISS_NO_SAR')}
                  className="text-emerald-600"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Document regulatory defense file with no statutory disclosure required.
              </p>
            </label>

            <label
              className={`p-3 rounded-lg border-2 cursor-pointer ${
                mlroDecision === 'REFER_LAW_ENFORCEMENT'
                  ? 'border-amber-600 bg-amber-50/40'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">REFER LAW ENFORCEMENT</span>
                <input
                  type="radio"
                  disabled={!actionAvailability.canDetermineMlro}
                  checked={mlroDecision === 'REFER_LAW_ENFORCEMENT'}
                  onChange={() => setMlroDecision('REFER_LAW_ENFORCEMENT')}
                  className="text-amber-600"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Direct statutory referral under urgent criminal inquiry.
              </p>
            </label>
          </div>

          {mlroDecision === 'FILE_SAR' && (
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                SAR Reference Number (Statutory FIU Registry)
              </label>
              <input
                type="text"
                disabled={!actionAvailability.canDetermineMlro}
                value={sarRef}
                onChange={(e) => setSarRef(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono text-rose-800 font-bold bg-white"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Regulatory Disclosure & Statutory Grounds (Mandatory)
            </label>
            <textarea
              rows={4}
              disabled={!actionAvailability.canDetermineMlro}
              value={disclosureNotes}
              onChange={(e) => setDisclosureNotes(e.target.value)}
              placeholder="State the statutory threshold grounds under Anti-Money Laundering Act, predicate offences analyzed, and transmission instructions..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="md"
              variant="critical"
              disabled={!actionAvailability.canDetermineMlro}
              isLoading={isProcessing}
              leftIcon={<Award className="h-4 w-4" />}
            >
              Execute MLRO Statutory Determination
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

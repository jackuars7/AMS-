import React, { useState } from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { ScreeningObligation } from '../../../types/index.ts';
import { Button } from '../../common/Button.tsx';
import { Modal } from '../../common/Modal.tsx';

interface ExemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  obligation: ScreeningObligation | null;
  onSubmitExemption: (data: { reasonCode: string; justification: string; evidenceReference: string }) => Promise<void>;
}

export const ExemptionModal: React.FC<ExemptionModalProps> = ({
  isOpen,
  onClose,
  obligation,
  onSubmitExemption,
}) => {
  const [reasonCode, setReasonCode] = useState<'LEGACY_CLEARED' | 'REGULATORY_CARVE_OUT' | 'DUPLICATE_ENTITY' | 'LOW_RISK_SUBSIDIARY' | 'OTHER'>('DUPLICATE_ENTITY');
  const [justification, setJustification] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!obligation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim()) {
      setError('A comprehensive regulatory justification is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmitExemption({
        reasonCode,
        justification: justification.trim(),
        evidenceReference: evidenceReference.trim() || 'REF-EVID-DEFAULT',
      });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Screening Exemption (AM-01)"
      description={`Formal policy carve-out request for connected party: ${obligation.partyName}`}
      maxWidth="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white border-none shadow-xs"
          >
            Submit for 4-Eyes Review
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
            {error}
          </div>
        )}

        {/* Segregation of Duties Notice */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-600 leading-relaxed">
            <strong className="text-slate-800 block">Segregation of Duties Enforced:</strong>
            Submitting this exemption places the obligation in a <strong>PENDING_APPROVAL</strong> state.
            Policy strictly prohibits self-approval: a designated Level 2 Reviewer or Compliance Officer
            must review and adjudicate this request before the case can be completed.
          </div>
        </div>

        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Standard Regulatory Exemption Reason Code
          </label>
          <select
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value as any)}
            className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-indigo-600"
          >
            <option value="DUPLICATE_ENTITY">Duplicate Entity (Already Cleared in Core Banking Master)</option>
            <option value="LEGACY_CLEARED">Legacy Profile Cleared in Last 30 Days (Zero New Delta)</option>
            <option value="REGULATORY_CARVE_OUT">Statutory / Regulatory Carve-Out (Sovereign / Public Body)</option>
            <option value="LOW_RISK_SUBSIDIARY">Wholly-Owned Low-Risk Subsidiary of Cleared Parent</option>
            <option value="OTHER">Other Documented Exception (Requires MLRO Escalation)</option>
          </select>
        </div>

        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Detailed Rationale & Compliance Justification
          </label>
          <textarea
            required
            rows={4}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Document the exact factual basis, prior screening reference, and regulatory rule citation justifying this carve-out..."
            className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-indigo-600 leading-relaxed"
          />
        </div>

        <div>
          <label className="block font-medium text-slate-700 mb-1">
            Evidence Reference or Document Archive Key
          </label>
          <input
            type="text"
            value={evidenceReference}
            onChange={(e) => setEvidenceReference(e.target.value)}
            placeholder="e.g. DOC-CLEARANCE-2026-9912 or DMS://audit/pack/04"
            className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-indigo-600 font-mono"
          />
        </div>
      </form>
    </Modal>
  );
};

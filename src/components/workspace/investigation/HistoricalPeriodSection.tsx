import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  History,
  Info,
  Lock,
  PlusCircle,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { HistoricalPeriodResolution, UserRole } from '../../../types/index.ts';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';
import { Modal } from '../../common/Modal.tsx';
import { apiClient } from '../../../lib/api-client.ts';

interface HistoricalPeriodSectionProps {
  historicalPeriod?: HistoricalPeriodResolution;
  activeRole: UserRole;
  subjectId?: string;
  onRefreshRun?: () => void;
}

export const HistoricalPeriodSection: React.FC<HistoricalPeriodSectionProps> = ({
  historicalPeriod,
  activeRole,
  subjectId,
  onRefreshRun,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [overrideMonths, setOverrideMonths] = useState(180);
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  const isCheckerOrHigher = ['CHECKER', 'COMPLIANCE_OFFICER', 'MLRO', 'ADMIN'].includes(activeRole);

  const handleRequestException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) return;
    setIsSubmitting(true);
    setActionErrorMsg(null);
    try {
      await apiClient.requestHistoricalException({
        subjectId,
        originalMonths: historicalPeriod?.effectiveLookbackMonths || 120,
        overrideMonths,
        justification,
      });
      setActionSuccessMsg('Historical lookback exception requested. Awaiting 4-eyes Checker approval.');
      setIsModalOpen(false);
      if (onRefreshRun) onRefreshRun();
    } catch (err: any) {
      setActionErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveException = async () => {
    if (!subjectId) return;
    setIsSubmitting(true);
    setActionErrorMsg(null);
    try {
      await apiClient.approveHistoricalException(subjectId);
      setActionSuccessMsg('Historical period exception approved under 4-eyes segregation of duties.');
      if (onRefreshRun) onRefreshRun();
    } catch (err: any) {
      setActionErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const effectiveMonths = historicalPeriod?.effectiveLookbackMonths || 120;
  const years = (effectiveMonths / 12).toFixed(1);

  return (
    <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Deterministic Historical Lookback Policy (AM-10)
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Algorithmic lookback period derived from subject role, jurisdiction risk tier, and regulatory policy rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {historicalPeriod?.exceptionApplied ? (
            <Badge variant="warning" size="sm">
              Authorized Override Applied
            </Badge>
          ) : (
            <Badge variant="success" size="sm">
              Standard Policy Active
            </Badge>
          )}

          {activeRole === 'ANALYST' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<PlusCircle className="h-3.5 w-3.5" />}
              className="text-xs py-1 px-2.5"
            >
              Request Lookback Override
            </Button>
          )}
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {actionErrorMsg && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      {/* Grid of Lookback Parameters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">
            Lookback Duration
          </span>
          <span className="text-sm font-extrabold text-indigo-700">
            {effectiveMonths} Months ({years} Yrs)
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">
            Earliest Search Date
          </span>
          <span className="text-xs font-bold text-slate-800">
            {historicalPeriod?.effectiveStartDate
              ? new Date(historicalPeriod.effectiveStartDate).toLocaleDateString()
              : '10 Years Ago'}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">
            Latest Search Date
          </span>
          <span className="text-xs font-bold text-slate-800">
            {historicalPeriod?.effectiveEndDate
              ? new Date(historicalPeriod.effectiveEndDate).toLocaleDateString()
              : 'Current Date'}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-slate-400 block text-[10px] uppercase font-mono">
            Applied Rule ID
          </span>
          <span className="text-xs font-mono font-bold text-slate-700 truncate block">
            {historicalPeriod?.appliedRuleId || 'HIST-RULE-CORP-PEP-120M'}
          </span>
        </div>
      </div>

      {/* Regulatory Justification & Segregation of Duties Proof */}
      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5 leading-relaxed">
        <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-xs">
          <Info className="h-3.5 w-3.5 text-indigo-600" />
          <span>Regulatory Policy Justification:</span>
        </div>
        <p className="text-[11px] text-slate-600 pl-5">
          {historicalPeriod?.justification ||
            'FATF Recommendation 12 & EU 6AMLD mandate a 120-month forensic adverse media search lookback for senior executives and beneficial owners of high-risk corporate entities.'}
        </p>

        {historicalPeriod?.exceptionApplied && (
          <div className="mt-2 pt-2 border-t border-slate-200 pl-5 flex items-center justify-between text-[11px]">
            <span className="text-amber-800 font-medium">
              Exception Approved: {historicalPeriod.exceptionApprovedBy} ({historicalPeriod.exceptionApprovedAt ? new Date(historicalPeriod.exceptionApprovedAt).toLocaleDateString() : 'N/A'})
            </span>
            <span className="font-mono text-slate-500">Dual-Control Compliant</span>
          </div>
        )}
      </div>

      {/* 4-Eyes Segregation of Duties Checker Callout */}
      {isCheckerOrHigher && (
        <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-indigo-700 shrink-0" />
            <div>
              <span className="font-semibold text-indigo-950">4-Eyes Reviewer Oversight (Checker / Compliance)</span>
              <p className="text-[11px] text-indigo-700">
                You hold authorized delegation to approve historical policy exceptions or enforce audit re-runs.
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleApproveException}
            isLoading={isSubmitting}
            className="text-xs shrink-0"
          >
            Authorize Extension
          </Button>
        </div>
      )}

      {/* Lookback Override Request Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Request Historical Lookback Exception (AM-10)"
        description="Submit an authorized exception request to extend or truncate the adverse media search lookback period. Requires 4-eyes Checker authorization."
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} size="sm">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleRequestException}
              isLoading={isSubmitting}
              size="sm"
              disabled={!justification.trim()}
            >
              Submit for 4-Eyes Review
            </Button>
          </div>
        }
      >
        <form onSubmit={handleRequestException} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Override Lookback Period (Months)
            </label>
            <select
              value={overrideMonths}
              onChange={(e) => setOverrideMonths(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value={60}>60 Months (5 Years) — Standard Corporate</option>
              <option value={84}>84 Months (7 Years) — Extended AML</option>
              <option value={120}>120 Months (10 Years) — High-Risk Baseline</option>
              <option value={180}>180 Months (15 Years) — Enhanced Forensic Scope</option>
              <option value={240}>240 Months (20 Years) — Lifetime Historical</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Regulatory Justification & Evidence Reference <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="State why the standard policy is insufficient or excessive (e.g., 'Court proceedings commenced in 2011 requiring 15-year lookback scope')."
              rows={3}
              required
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

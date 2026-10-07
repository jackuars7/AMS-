import React, { useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  FileCheck2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { KycCase, ScreeningObligation, UserRole } from '../../../types/index.ts';
import { Alert } from '../../common/Alert.tsx';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';

interface DecisionsAreaProps {
  kycCase: KycCase;
  obligations: ScreeningObligation[];
  activeRole: UserRole;
  onCompleteCase: () => Promise<void>;
  isCompleting?: boolean;
}

export const DecisionsArea: React.FC<DecisionsAreaProps> = ({
  kycCase,
  obligations,
  activeRole,
  onCompleteCase,
  isCompleting = false,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasBlockers = kycCase.blockingConditions && kycCase.blockingConditions.length > 0;
  const isCompleted = kycCase.status === 'COMPLETED';

  const handleSignOff = async () => {
    setErrorMsg(null);
    try {
      await onCompleteCase();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Final Risk Adjudication & Case Sign-Off Gate
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically sealed immutable audit log produced upon formal case closure.
          </p>
        </div>
        <Badge variant={isCompleted ? 'success' : hasBlockers ? 'danger' : 'primary'}>
          {isCompleted ? 'Case Closed & Signed Off' : hasBlockers ? 'Completion Blocked' : 'Ready for Sign-Off'}
        </Badge>
      </div>

      {errorMsg && (
        <Alert type="error" title="Case Completion Denied">
          {errorMsg}
        </Alert>
      )}

      {/* Blocker Inspection Callout */}
      {hasBlockers ? (
        <div className="p-5 rounded-xl border border-rose-200 bg-rose-50/50 space-y-3">
          <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
            <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0" />
            <span>Case Completion Invariant: Active Screening Blockers Detected (AM-01)</span>
          </div>

          <p className="text-xs text-rose-800 leading-relaxed">
            Policy strictly prohibits closing a KYC onboarding or periodic review case while any
            mandatory screening obligations remain unfulfilled. Resolve these items before final sign-off:
          </p>

          <ul className="list-disc list-inside space-y-1 text-xs text-rose-950 font-mono pl-2">
            {kycCase.blockingConditions.map((blocker, idx) => (
              <li key={idx}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
          <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>Prerequisites Met: All Screening Obligations Successfully Satisfied</span>
          </div>
          <p className="text-xs text-emerald-900 leading-relaxed">
            Every connected party has either completed clean or mitigated adverse media screening,
            or has a four-eyes approved regulatory exemption documented on the ledger.
          </p>
        </div>
      )}

      {/* Decisions Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
          <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 block">
            Adjudication Authority
          </span>
          <div className="text-slate-800 font-medium leading-relaxed">
            Case sign-off requires role authority: <strong>Reviewer / Checker</strong>,{' '}
            <strong>Compliance Officer</strong>, or <strong>MLRO</strong>. Level 1 analysts may
            recommend closure but cannot perform final sign-off.
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
          <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 block">
            Audit Package Sealed
          </span>
          <div className="text-slate-800 font-medium leading-relaxed">
            Closing this case generates an immutable compliance package referencing active policy version{' '}
            <strong>v2.4.0</strong>, connector outcomes, and analyst rationales.
          </div>
        </div>
      </div>

      {/* Final Sign-Off CTA Box */}
      <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            {isCompleted ? 'Case Lifecycle Complete' : 'Execute Final Four-Eyes Sign-Off'}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {isCompleted
              ? 'This case has been permanently sealed and archived. No further edits permitted.'
              : 'Approve adverse media findings, confirm mitigation, and close KYC investigation.'}
          </p>
        </div>

        {!isCompleted && (
          <Button
            variant="primary"
            size="md"
            onClick={handleSignOff}
            isLoading={isCompleting}
            disabled={hasBlockers}
            leftIcon={hasBlockers ? <Lock className="h-4 w-4" /> : <FileCheck2 className="h-4 w-4" />}
            className={
              hasBlockers
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-xs'
            }
          >
            {hasBlockers ? 'Sign-Off Blocked' : 'Sign Off & Close Case'}
          </Button>
        )}
      </div>
    </div>
  );
};

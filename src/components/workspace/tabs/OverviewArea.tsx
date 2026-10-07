import React from 'react';
import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileBadge2,
  FileCheck,
  Lock,
  Play,
  ShieldAlert,
  ShieldCheck,
  Users2,
} from 'lucide-react';
import { KycCase, ScreeningObligation, Subject, UserRole } from '../../../types/index.ts';
import { Alert } from '../../common/Alert.tsx';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';

interface OverviewAreaProps {
  kycCase: KycCase;
  obligations: ScreeningObligation[];
  subjects: Subject[];
  activeRole: UserRole;
  onNavigateToTab: (tabId: any) => void;
  onRunScreening: () => void;
  onAttemptComplete: () => void;
}

export const OverviewArea: React.FC<OverviewAreaProps> = ({
  kycCase,
  obligations,
  subjects,
  activeRole,
  onNavigateToTab,
  onRunScreening,
  onAttemptComplete,
}) => {
  const mandatoryObligations = obligations.filter((o) => o.mandatory);
  const completedObligations = mandatoryObligations.filter(
    (o) => o.status === 'COMPLETED' || o.status === 'EXEMPTED'
  );
  const isAllMandatorySatisfied =
    mandatoryObligations.length > 0 &&
    completedObligations.length === mandatoryObligations.length;

  const hasConflicts = subjects.some((s) => s.hasConflicts);

  return (
    <div className="space-y-6">
      {/* Top Banner: Invariant Blocker Warning or Clearance */}
      {kycCase.blockingConditions && kycCase.blockingConditions.length > 0 ? (
        <Alert
          type="warning"
          title="Case Completion Gated by Mandatory Screening Obligations (AM-01)"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToTab('subjects')}
              rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              className="text-xs"
            >
              Resolve in Subjects Area
            </Button>
          }
        >
          <p className="text-xs text-amber-900 leading-relaxed">
            There are {kycCase.blockingConditions.length} unresolved screening obligations required by
            screening policy <strong>v2.4.0</strong> before this KYC case can be completed.
          </p>
        </Alert>
      ) : (
        <Alert
          type="success"
          title="All Mandatory Screening Obligations Satisfied"
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={onAttemptComplete}
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-xs text-xs"
            >
              Sign Off & Complete Case
            </Button>
          }
        >
          <p className="text-xs text-emerald-900 leading-relaxed">
            All connected parties have either successfully cleared adverse media screening or have
            formally approved exemptions on file with full four-eyes audit evidence.
          </p>
        </Alert>
      )}

      {/* Main Grid: Case Overview & Screening Population */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Screening Population & Case Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connected Parties & Obligations Card (AM-01) */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users2 className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Screening Population Status (AM-01)
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {completedObligations.length} of {mandatoryObligations.length} Mandatory Cleared
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isAllMandatorySatisfied ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{
                    width: `${
                      mandatoryObligations.length > 0
                        ? (completedObligations.length / mandatoryObligations.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Party Mini-Table */}
            <div className="mt-4 divide-y divide-slate-100">
              {obligations?.filter(Boolean).map((ob) => (
                <div
                  key={ob.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{ob.partyName}</span>
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {ob.partyRole ? ob.partyRole.replace(/_/g, ' ') : 'PARTY'}
                      </span>
                      {ob.mandatory && (
                        <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                          Mandatory
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Matched Rule: {ob.ruleId} • Policy {ob.policyVersion}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      size="sm"
                      variant={
                        ob.status === 'COMPLETED'
                          ? 'success'
                          : ob.status === 'EXEMPTED'
                          ? 'info'
                          : ob.status === 'PENDING'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {ob.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => onNavigateToTab('subjects')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Subject Profiles & Conflicts</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Policy Invariants & Rule Resolutions Card (AM-05) */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileBadge2 className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Deterministic Policy Resolution Engine (AM-05)
                </h3>
              </div>
              <Badge variant="primary" size="sm">
                Policy Version 2.4.0
              </Badge>
            </div>

            <div className="mt-3.5 space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Obligations were resolved deterministically outside the AI boundary according to the
                bank's board-approved screening rules library. Every rule output is immutable, testable,
                and verifiable.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-800 block mb-1">
                    RULE-UBO-THRESHOLD-25
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Mandatory forensic adverse media screening triggered for all natural persons holding
                    ≥25% equity ownership or ultimate effective control.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-semibold text-slate-800 block mb-1">
                    RULE-DIRECTOR-MANDATORY
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Mandatory screening required for executive board directors, authorized signatories,
                    and key operational controllers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Status, Next Actions, and Integrity Checks */}
        <div className="space-y-6">
          {/* Action Recommendations Box */}
          <div className="p-5 rounded-xl bg-slate-900 text-white shadow-md">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Recommended Next Action
            </h4>
            <div className="mt-2 font-bold text-sm leading-snug">
              {kycCase.primaryNextAction}
            </div>

            <div className="mt-4 space-y-2">
              <Button
                variant="primary"
                size="sm"
                onClick={onRunScreening}
                leftIcon={<Play className="h-3.5 w-3.5 fill-current" />}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-none shadow-xs text-xs"
              >
                Execute Screening Run
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigateToTab('tasks-requests')}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs"
              >
                Review Four-Eyes Tasks
              </Button>
            </div>
          </div>

          {/* Invariant Health Checklist */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Stage 1 Quality & Security Invariants
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">Deterministic Policy Core</span>
                  <p className="text-[11px] text-slate-500">
                    Screening obligations generated by pure code, not prompt inference.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">Segregation of Duties</span>
                  <p className="text-[11px] text-slate-500">
                    No self-approval on exemptions or alias promotions enforced by server.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">AI Safety Boundaries</span>
                  <p className="text-[11px] text-slate-500">
                    AI suggestions gated in PENDING_APPROVAL; cannot approve exemptions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">Approved Source Allowlist</span>
                  <p className="text-[11px] text-slate-500">
                    Search queries orchestrate strictly across vetted connectors (AM-06).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

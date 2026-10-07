import React from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  Play,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { KycCase, UserRole } from '../../types/index.ts';
import { Alert } from '../common/Alert.tsx';
import { Badge, BadgeVariant } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';

interface CaseHeaderProps {
  kycCase: KycCase;
  activeRole: UserRole;
  onExecuteScreening: () => void;
  onAttemptCompletion: () => void;
  isExecutingScreening?: boolean;
}

export const CaseHeader: React.FC<CaseHeaderProps> = ({
  kycCase,
  activeRole,
  onExecuteScreening,
  onAttemptCompletion,
  isExecutingScreening = false,
}) => {
  const riskBadgeMap: Record<string, BadgeVariant> = {
    HIGH: 'critical',
    VERY_HIGH: 'critical',
    MEDIUM: 'warning',
    LOW: 'success',
  };

  const statusBadgeMap: Record<string, BadgeVariant> = {
    SCREENING_PENDING: 'warning',
    INVESTIGATION_ACTIVE: 'primary',
    AWAITING_FOUR_EYES: 'warning',
    COMPLETED: 'success',
    BLOCKED: 'danger',
  };

  const hasBlockers = kycCase.blockingConditions && kycCase.blockingConditions.length > 0;
  const isCompleted = kycCase.status === 'COMPLETED';

  return (
    <div className="bg-white border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Top line: Hierarchy & Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mb-1">
              <span>CASES</span>
              <span>/</span>
              <span className="font-semibold text-slate-700">{kycCase.reference}</span>
              <span>/</span>
              <span className="uppercase text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                {kycCase.customerType}
              </span>
              <span className="text-slate-400">Jurisdiction: {kycCase.jurisdiction}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                {kycCase.customerName}
              </h1>
              <Badge variant={riskBadgeMap[kycCase.riskLevel] || 'neutral'}>
                {kycCase.riskLevel} Risk
              </Badge>
              <Badge variant={statusBadgeMap[kycCase.status] || 'neutral'}>
                {kycCase.status.replace(/_/g, ' ')}
              </Badge>
              {isCompleted && (
                <Badge variant="success" icon={<CheckCircle2 className="h-3 w-3" />}>
                  Closed & Audited
                </Badge>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            {!isCompleted && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onExecuteScreening}
                isLoading={isExecutingScreening}
                leftIcon={<Play className="h-3.5 w-3.5 text-indigo-600 fill-indigo-600" />}
              >
                Run Screening
              </Button>
            )}

            {!isCompleted && (
              <Button
                variant={hasBlockers ? 'outline' : 'primary'}
                size="sm"
                onClick={onAttemptCompletion}
                leftIcon={hasBlockers ? <Lock className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                title={
                  hasBlockers
                    ? `Cannot complete: ${kycCase.blockingConditions.length} unresolved mandatory conditions`
                    : 'Sign off and close case with immutable audit package'
                }
              >
                {hasBlockers ? 'Case Blocked' : 'Complete & Sign Off'}
              </Button>
            )}
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Screening Status</span>
            <span className="font-semibold text-slate-800">
              {kycCase.screeningStatus.replace(/_/g, ' ')}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Investigation</span>
            <span className="font-semibold text-slate-800">
              {kycCase.investigationStatus.replace(/_/g, ' ')}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Assigned Owner</span>
            <span className="font-medium text-slate-800 flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5 text-slate-400" />
              <span>{kycCase.assignedToName}</span>
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">SLA Target</span>
            <span className="font-medium text-slate-800 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>{new Date(kycCase.slaDueDate).toLocaleDateString()}</span>
            </span>
          </div>

          <div className="col-span-2">
            <span className="text-slate-400 block text-[11px]">Primary Next Action</span>
            <span className="font-medium text-indigo-900 bg-indigo-50/70 border border-indigo-100 px-2 py-0.5 rounded text-[11px] inline-block truncate max-w-full">
              {kycCase.primaryNextAction}
            </span>
          </div>
        </div>

        {/* Prominent Blocking Conditions Banner (AM-01 Invariant) */}
        {hasBlockers && (
          <div className="mt-3">
            <Alert
              type="warning"
              title={`${kycCase.blockingConditions.length} Mandatory Screening Blocker(s) Active`}
            >
              <div className="space-y-1">
                <p className="font-medium text-amber-950">
                  Case completion and final sign-off are blocked until all mandatory obligations are
                  satisfied or formally exempted:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-900 pl-1 font-mono text-[11px]">
                  {kycCase.blockingConditions.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              </div>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
};

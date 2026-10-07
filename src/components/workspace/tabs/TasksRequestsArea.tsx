import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Lock,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { Alias, ScreeningObligation, UserRole, WorkItem } from '../../../types/index.ts';
import { Alert } from '../../common/Alert.tsx';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';
import { EmptyState } from '../../common/EmptyState.tsx';

interface TasksRequestsAreaProps {
  obligations: ScreeningObligation[];
  pendingAliases: Array<{ alias: Alias; subjectName: string }>;
  activeRole: UserRole;
  currentUserId: string;
  onAdjudicateExemption: (obligationId: string, approved: boolean, notes: string) => Promise<void>;
  onApproveAlias: (aliasId: string) => Promise<void>;
  onRejectAlias: (aliasId: string) => Promise<void>;
}

export const TasksRequestsArea: React.FC<TasksRequestsAreaProps> = ({
  obligations,
  pendingAliases,
  activeRole,
  currentUserId,
  onAdjudicateExemption,
  onApproveAlias,
  onRejectAlias,
}) => {
  const [adjudicatingId, setAdjudicatingId] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Find obligations with pending exemptions
  const pendingExemptions = obligations.filter(
    (o) => o.exemption && o.exemption.status === 'PENDING_APPROVAL'
  );

  const totalPending = pendingExemptions.length + pendingAliases.length;

  const handleAdjudicate = async (obligationId: string, approved: boolean) => {
    setErrorMsg(null);
    setAdjudicatingId(obligationId);
    try {
      await onAdjudicateExemption(obligationId, approved, actionNotes || (approved ? 'Approved by reviewer' : 'Rejected'));
      setActionNotes('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setAdjudicatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Four-Eyes Review & Governance Queue (Tasks & Requests)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict segregation of duties enforced. Secondary approvals required for exemptions and AI names.
          </p>
        </div>
        <Badge variant={totalPending > 0 ? 'warning' : 'success'}>
          {totalPending} Awaiting Adjudication
        </Badge>
      </div>

      {errorMsg && (
        <Alert type="error" title="Adjudication Blocked by Policy / SoD Rule">
          {errorMsg}
        </Alert>
      )}

      {totalPending === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />}
          title="All Requests & Four-Eyes Tasks Resolved"
          description="There are no pending exemption reviews or unapproved AI name suggestions awaiting adjudication for this case."
        />
      ) : (
        <div className="space-y-6">
          {/* Pending Exemptions (AM-01) */}
          {pendingExemptions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <span>Screening Exemption Requests ({pendingExemptions.length})</span>
              </h4>

              <div className="space-y-3">
                {pendingExemptions.map((ob) => {
                  const ex = ob.exemption!;
                  const isRequester = currentUserId === ex.requestedBy;

                  return (
                    <div
                      key={ob.id}
                      className="p-5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3 text-xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{ob.partyName}</span>
                            <Badge variant="warning" size="sm">
                              {ex.reasonCode.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-[11px] font-mono text-slate-500">
                              Ref: {ex.evidenceReference}
                            </span>
                          </div>
                          <div className="mt-1 text-slate-600">
                            Requested by: <strong>{ex.requestedByName}</strong> on{' '}
                            {new Date(ex.requestedAt).toLocaleDateString()}
                          </div>
                        </div>

                        <Badge variant="warning">Pending Four-Eyes Approval</Badge>
                      </div>

                      {/* Justification Box */}
                      <div className="p-3 rounded-lg bg-white border border-amber-200/80 text-slate-800 leading-relaxed font-sans">
                        <span className="font-semibold text-[11px] text-slate-500 block mb-0.5">
                          Analyst Regulatory Justification:
                        </span>
                        {ex.justification}
                      </div>

                      {/* Segregation of Duties Check Notice */}
                      {isRequester ? (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-[11px] flex items-center gap-2">
                          <Lock className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                          <span>
                            <strong>Self-Approval Prohibited:</strong> You submitted this exemption.
                            Switch to a Checker or Compliance Officer role to simulate four-eyes review.
                          </span>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-amber-200/80 space-y-2">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-700 mb-1">
                              Reviewer Notes / Rationale (Recorded in immutable audit trail)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Verified against Core Banking clearance certificate dated 2026-08-15."
                              value={actionNotes}
                              onChange={(e) => setActionNotes(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 text-xs focus:outline-indigo-600"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAdjudicate(ob.id, false)}
                              isLoading={adjudicatingId === ob.id}
                              leftIcon={<X className="h-3 w-3 text-rose-600" />}
                              className="text-xs text-rose-700 hover:bg-rose-50"
                            >
                              Reject Exemption
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleAdjudicate(ob.id, true)}
                              isLoading={adjudicatingId === ob.id}
                              leftIcon={<Check className="h-3 w-3" />}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            >
                              Approve Exemption (Four-Eyes Sign-Off)
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending AI-Suggested Aliases (AM-03) */}
          {pendingAliases.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-2">
                <Bot className="h-4 w-4 text-indigo-600" />
                <span>AI Name Transliterations Awaiting Authorization ({pendingAliases.length})</span>
              </h4>

              <div className="space-y-2.5">
                {pendingAliases.map(({ alias, subjectName }) => (
                  <div
                    key={alias.id}
                    className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono text-sm">
                          {alias.aliasName}
                        </span>
                        <Badge variant="primary" size="sm">
                          {alias.aliasType.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-slate-600">
                          {alias.script}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Subject: <strong>{subjectName}</strong> • Source: {alias.source} • Confidence:{' '}
                        {Math.round(alias.confidence * 100)}%
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onApproveAlias(alias.id)}
                        leftIcon={<Check className="h-3 w-3" />}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRejectAlias(alias.id)}
                        leftIcon={<X className="h-3 w-3 text-rose-600" />}
                        className="text-xs text-rose-700 hover:bg-rose-50"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

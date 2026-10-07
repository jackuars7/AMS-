import React from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  FileKey2,
  Languages,
  Play,
  ShieldAlert,
  User,
  UserX,
} from 'lucide-react';
import { ScreeningObligation, Subject, UserRole } from '../../../types/index.ts';
import { Badge, BadgeVariant } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';

interface SubjectsAreaProps {
  subjects: Subject[];
  obligations: ScreeningObligation[];
  activeRole: UserRole;
  onInspectSubject: (subject: Subject) => void;
  onManageAliases: (subject: Subject) => void;
  onRequestExemption: (obligation: ScreeningObligation) => void;
  onScreenSubject: (subject: Subject) => void;
}

export const SubjectsArea: React.FC<SubjectsAreaProps> = ({
  subjects,
  obligations,
  activeRole,
  onInspectSubject,
  onManageAliases,
  onRequestExemption,
  onScreenSubject,
}) => {
  const getObligationForSubject = (subject: Subject) => {
    return obligations.find(
      (o) => o.subjectId === subject.id || o.partyId === subject.partyId
    );
  };

  const statusVariantMap: Record<string, BadgeVariant> = {
    COMPLETED: 'success',
    PENDING: 'warning',
    EXEMPTED: 'info',
    BLOCKED: 'danger',
    FAILED: 'critical',
    RUNNING: 'primary',
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Connected Parties & Screening Obligations (AM-01, AM-02, AM-03)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic obligations resolved from ownership structure, party role, and customer risk.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="neutral">
            {subjects.length} Connected {subjects.length === 1 ? 'Party' : 'Parties'}
          </Badge>
          <Badge variant="primary">
            {obligations.filter((o) => o.mandatory).length} Mandatory Obligations
          </Badge>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-4">
        {subjects.map((subject) => {
          const obligation = getObligationForSubject(subject);
          const approvedAliasesCount = subject.aliases.filter((a) => a.state === 'APPROVED').length;
          const pendingAliasesCount = subject.aliases.filter(
            (a) => a.state === 'PENDING_APPROVAL'
          ).length;

          return (
            <div
              key={subject.id}
              className={`p-5 rounded-xl border bg-white shadow-2xs transition-all ${
                obligation?.status === 'BLOCKED' || obligation?.status === 'FAILED'
                  ? 'border-rose-200'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Identity & Core Attributes */}
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                    {subject.subjectType === 'NATURAL_PERSON' ? (
                      <User className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <Building2 className="h-5 w-5 text-indigo-600" />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900">
                        {subject.primaryName}
                      </h4>
                      <Badge variant="neutral" size="sm">
                        {subject.role.replace(/_/g, ' ')}
                      </Badge>
                      {obligation?.mandatory && (
                        <span className="text-[10px] font-semibold uppercase bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded">
                          Mandatory
                        </span>
                      )}
                      {subject.hasConflicts && (
                        <Badge
                          variant="warning"
                          size="sm"
                          icon={<AlertTriangle className="h-3 w-3" />}
                        >
                          Conflicts Flagged
                        </Badge>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Jurisdiction: {subject.jurisdiction}</span>
                      {subject.ownershipPercentage !== undefined && (
                        <span>Ownership: <strong>{subject.ownershipPercentage}%</strong></span>
                      )}
                      <span>Profile Completeness: <strong>{subject.completenessScore}%</strong></span>
                      <span>Attributes: {subject.attributes.length}</span>
                    </div>

                    {/* Exemption state callout if present */}
                    {obligation?.exemption && (
                      <div className="mt-2.5 p-2 rounded-md bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 inline-block">
                        <strong>Exemption ({obligation.exemption.status}):</strong>{' '}
                        {obligation.exemption.reasonCode.replace(/_/g, ' ')} —{' '}
                        {obligation.exemption.justification}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Obligation Status Badge & Screening Actions */}
                <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Screening Status:</span>
                    <Badge variant={statusVariantMap[obligation?.status || 'PENDING'] || 'neutral'}>
                      {obligation?.status || 'PENDING'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onInspectSubject(subject)}
                      leftIcon={<Eye className="h-3.5 w-3.5 text-slate-500" />}
                      className="text-xs"
                    >
                      Inspect Profile
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onManageAliases(subject)}
                      leftIcon={<Languages className="h-3.5 w-3.5 text-indigo-600" />}
                      className="text-xs"
                    >
                      Aliases ({approvedAliasesCount}
                      {pendingAliasesCount > 0 && ` + ${pendingAliasesCount} pending`})
                    </Button>

                    {obligation && obligation.status !== 'COMPLETED' && obligation.status !== 'EXEMPTED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRequestExemption(obligation)}
                        className="text-xs text-amber-800 hover:bg-amber-50"
                      >
                        Exempt...
                      </Button>
                    )}

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onScreenSubject(subject)}
                      leftIcon={<Play className="h-3 w-3 fill-current" />}
                      className="bg-slate-900 text-white text-xs"
                    >
                      Screen
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

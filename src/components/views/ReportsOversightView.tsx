import React from 'react';
import {
  BarChart3,
  Calendar,
  CheckCircle,
  Download,
  FileCheck2,
  FileSpreadsheet,
  PieChart,
  ShieldCheck,
} from 'lucide-react';
import { KycCase, ScreeningObligation, UserRole } from '../../types/index.ts';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';

interface ReportsOversightViewProps {
  cases: KycCase[];
  obligations: ScreeningObligation[];
  activeRole: UserRole;
}

export const ReportsOversightView: React.FC<ReportsOversightViewProps> = ({
  cases,
  obligations,
  activeRole,
}) => {
  const mandatoryObligations = obligations.filter((o) => o.mandatory);
  const clearedObligations = mandatoryObligations.filter(
    (o) => o.status === 'COMPLETED' || o.status === 'EXEMPTED'
  );
  const complianceRate =
    mandatoryObligations.length > 0
      ? Math.round((clearedObligations.length / mandatoryObligations.length) * 100)
      : 100;

  const exemptedCount = obligations.filter((o) => o.status === 'EXEMPTED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Compliance Governance & Audit Oversight
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Board-level compliance metrics, regulatory examination packages, and policy version adherence.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ cases, obligations }, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute('href', dataStr);
            downloadAnchor.setAttribute('download', `aml_kyc_audit_pack_${Date.now()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
          }}
          leftIcon={<Download className="h-3.5 w-3.5" />}
          className="text-xs"
        >
          Export Regulator Audit Pack (JSON)
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-semibold">
            Mandatory Obligation Compliance
          </span>
          <div className="text-2xl font-extrabold text-emerald-600">{complianceRate}%</div>
          <p className="text-[11px] text-slate-400">
            {clearedObligations.length} of {mandatoryObligations.length} obligations cleared or exempted
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-semibold">Formally Approved Exemptions</span>
          <div className="text-2xl font-extrabold text-indigo-600">{exemptedCount}</div>
          <p className="text-[11px] text-slate-400">Four-eyes signed off on immutable ledger</p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-semibold">Active Screening Policy</span>
          <div className="text-2xl font-extrabold text-slate-900">v2.4.0</div>
          <p className="text-[11px] text-slate-400">Effective from 2026-01-01 (Board Approved)</p>
        </div>
      </div>

      {/* Exemption Register Table */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Regulatory Exemption Register (Four-Eyes Lineage)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Subject / Party</th>
                <th className="py-2.5 px-3">Exemption Reason</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Requested By</th>
                <th className="py-2.5 px-3">Approved By (SoD)</th>
                <th className="py-2.5 px-3">Evidence Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {obligations
                ?.filter((o) => o?.exemption)
                .map((o) => {
                  const ex = o.exemption!;
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{o.partyName}</div>
                        <div className="text-[11px] text-slate-400">
                          {o.partyRole ? o.partyRole.replace(/_/g, ' ') : ''}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-800">
                          {ex.reasonCode.replace(/_/g, ' ')}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {ex.justification}
                        </p>
                      </td>

                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            ex.status === 'APPROVED'
                              ? 'success'
                              : ex.status === 'PENDING_APPROVAL'
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {ex.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>

                      <td className="py-3 px-3 text-slate-700">
                        {ex.requestedByName}
                      </td>

                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {ex.approvedByName || <span className="text-amber-600 italic">Pending Review</span>}
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-500">
                        {ex.evidenceReference}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

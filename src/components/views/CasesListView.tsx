import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Filter,
  FolderPlus,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { CustomerType, KycCase, RiskLevel, UserRole } from '../../types/index.ts';
import { Badge, BadgeVariant } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { Modal } from '../common/Modal.tsx';

interface CasesListViewProps {
  cases: KycCase[];
  activeRole: UserRole;
  onOpenCase: (caseId: string) => void;
  onCreateCase: (data: any) => Promise<void>;
}

export const CasesListView: React.FC<CasesListViewProps> = ({
  cases,
  activeRole,
  onOpenCase,
  onCreateCase,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Case Form state
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerType, setNewCustomerType] = useState<CustomerType>('CORPORATE');
  const [newJurisdiction, setNewJurisdiction] = useState('GB');
  const [newRiskLevel, setNewRiskLevel] = useState<RiskLevel>('MEDIUM');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredCases = cases.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (riskFilter !== 'ALL' && c.riskLevel !== riskFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.customerName.toLowerCase().includes(q) ||
        c.reference.toLowerCase().includes(q) ||
        c.jurisdiction.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onCreateCase({
        customerName: newCustomerName.trim(),
        customerType: newCustomerType,
        jurisdiction: newJurisdiction.toUpperCase().trim(),
        riskLevel: newRiskLevel,
        notes: newNotes.trim(),
      });
      setIsModalOpen(false);
      setNewCustomerName('');
      setNewNotes('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const riskBadgeMap: Record<string, BadgeVariant> = {
    HIGH: 'critical',
    VERY_HIGH: 'critical',
    MEDIUM: 'warning',
    LOW: 'success',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">KYC Case Directory & Workspaces</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active onboarding, periodic remediation, and adverse media investigation files.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
          className="text-xs self-start sm:self-auto shadow-xs"
        >
          New KYC Case
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, case reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs text-slate-700 focus:outline-indigo-600"
          >
            <option value="ALL">All Statuses</option>
            <option value="SCREENING_PENDING">Screening Pending</option>
            <option value="INVESTIGATION_ACTIVE">Investigation Active</option>
            <option value="AWAITING_FOUR_EYES">Awaiting Four-Eyes</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs text-slate-700 focus:outline-indigo-600"
          >
            <option value="ALL">All Risks</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Reference & Entity Name</th>
                <th className="py-2.5 px-3">Entity Type / Country</th>
                <th className="py-2.5 px-3">Risk Tier</th>
                <th className="py-2.5 px-3">Screening Status</th>
                <th className="py-2.5 px-3">Assigned Owner</th>
                <th className="py-2.5 px-3">Blocking Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.map((c) => {
                const hasBlockers = c.blockingConditions && c.blockingConditions.length > 0;
                return (
                  <tr
                    key={c.id}
                    onClick={() => onOpenCase(c.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-900">{c.customerName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{c.reference}</div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="font-medium text-slate-700">{c.customerType}</span>
                      <span className="text-slate-400 block text-[11px]">
                        Country: {c.jurisdiction}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <Badge variant={riskBadgeMap[c.riskLevel] || 'neutral'} size="sm">
                        {c.riskLevel}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-slate-800">
                        {c.screeningStatus.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-400 block text-[11px]">
                        Target: {new Date(c.slaDueDate).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-medium text-slate-700">
                      {c.assignedToName}
                    </td>

                    <td className="py-3.5 px-3">
                      {hasBlockers ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{c.blockingConditions.length} Blocker(s)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Cleared</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCase(c.id);
                        }}
                        className="text-xs"
                      >
                        Open Workspace
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Case Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New KYC Case (Synthetic Onboarding)"
        description="Initializes a new case and automatically resolves screening population against active policy rules."
        maxWidth="lg"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateSubmit}
              isLoading={isSubmitting}
              className="text-xs"
            >
              Create Case & Resolve Population
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Customer or Entity Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Caspian Energy Logistics AG"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-indigo-600 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Entity Type</label>
              <select
                value={newCustomerType}
                onChange={(e) => setNewCustomerType(e.target.value as CustomerType)}
                className="w-full px-2.5 py-2 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-indigo-600 text-xs"
              >
                <option value="CORPORATE">Corporate Legal Entity</option>
                <option value="INDIVIDUAL">Natural Person</option>
                <option value="FINANCIAL_INSTITUTION">Financial Institution / Intermediary</option>
                <option value="TRUST">Trust / Foundation</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Incorporation Jurisdiction
              </label>
              <input
                type="text"
                required
                maxLength={2}
                placeholder="e.g. GB, CH, CY, SG"
                value={newJurisdiction}
                onChange={(e) => setNewJurisdiction(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-indigo-600 font-mono text-xs uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Customer Risk Tier</label>
            <select
              value={newRiskLevel}
              onChange={(e) => setNewRiskLevel(e.target.value as RiskLevel)}
              className="w-full px-2.5 py-2 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-indigo-600 text-xs"
            >
              <option value="LOW">Low Risk (Standard Lookback 3 Yrs)</option>
              <option value="MEDIUM">Medium Risk (Standard Lookback 3 Yrs)</option>
              <option value="HIGH">High Risk (Forensic Lookback 10 Yrs)</option>
              <option value="VERY_HIGH">Very High Risk (Deep Forensic Lookback)</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Initial Onboarding Notes</label>
            <textarea
              rows={3}
              placeholder="Provide background context on relationship and source of wealth..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-indigo-600 text-xs leading-relaxed"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Code2,
  FileBadge2,
  Lock,
  Play,
  Scale,
  Shield,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import { CustomerType, PolicyRule, RiskLevel, UserRole } from '../../types/index.ts';
import { Alert } from '../common/Alert.tsx';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';

interface AdministrationViewProps {
  policyRules: PolicyRule[];
  activeRole: UserRole;
  onSimulatePolicy: (input: any) => Promise<any>;
}

export const AdministrationView: React.FC<AdministrationViewProps> = ({
  policyRules,
  activeRole,
  onSimulatePolicy,
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'simulator' | 'roles'>('rules');

  // Simulator state
  const [simRole, setSimRole] = useState('ULTIMATE_BENEFICIAL_OWNER');
  const [simOwnership, setSimOwnership] = useState('25');
  const [simCustomerRisk, setSimCustomerRisk] = useState<RiskLevel>('HIGH');
  const [simCustomerType, setSimCustomerType] = useState<CustomerType>('CORPORATE');
  const [simJurisdiction, setSimJurisdiction] = useState('CY');
  const [simResult, setSimResult] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    try {
      const res = await onSimulatePolicy({
        partyRole: simRole,
        ownershipPercentage: Number(simOwnership),
        customerRiskLevel: simCustomerRisk,
        customerType: simCustomerType,
        jurisdiction: simJurisdiction,
      });
      setSimResult(res);
    } finally {
      setIsSimulating(false);
    }
  };

  const rolesMatrix = [
    {
      role: 'ANALYST',
      title: 'Level 1 Screening Analyst',
      canScreen: true,
      canProposeAlias: true,
      canApproveAlias: false,
      canRequestExemption: true,
      canApproveExemption: false,
      canSignOffCase: false,
    },
    {
      role: 'CHECKER',
      title: 'Level 2 Reviewer / Checker',
      canScreen: true,
      canProposeAlias: true,
      canApproveAlias: true,
      canRequestExemption: true,
      canApproveExemption: true,
      canSignOffCase: true,
    },
    {
      role: 'COMPLIANCE_OFFICER',
      title: 'Compliance Officer',
      canScreen: true,
      canProposeAlias: true,
      canApproveAlias: true,
      canRequestExemption: true,
      canApproveExemption: true,
      canSignOffCase: true,
    },
    {
      role: 'MLRO',
      title: 'Money Laundering Reporting Officer',
      canScreen: true,
      canProposeAlias: true,
      canApproveAlias: true,
      canRequestExemption: true,
      canApproveExemption: true,
      canSignOffCase: true,
    },
    {
      role: 'OPERATIONS_MANAGER',
      title: 'Team Lead / Operations Manager',
      canScreen: true,
      canProposeAlias: true,
      canApproveAlias: true,
      canRequestExemption: true,
      canApproveExemption: true,
      canSignOffCase: true,
    },
    {
      role: 'POLICY_ADMINISTRATOR',
      title: 'Policy Administrator',
      canScreen: false,
      canProposeAlias: false,
      canApproveAlias: false,
      canRequestExemption: false,
      canApproveExemption: false,
      canSignOffCase: false,
    },
    {
      role: 'SYSTEM_ADMINISTRATOR',
      title: 'System Administrator',
      canScreen: false,
      canProposeAlias: false,
      canApproveAlias: false,
      canRequestExemption: false,
      canApproveExemption: false,
      canSignOffCase: false,
    },
    {
      role: 'AUDITOR',
      title: 'Internal / Regulatory Auditor',
      canScreen: false,
      canProposeAlias: false,
      canApproveAlias: false,
      canRequestExemption: false,
      canApproveExemption: false,
      canSignOffCase: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Policy & Security Administration (AM-05 & RBAC)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic policy rules, rule simulation sandbox, and Segregation of Duties (SoD) matrix.
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`pb-2.5 px-3 text-xs font-semibold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'rules'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Rules Library (AM-05)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('simulator')}
          className={`pb-2.5 px-3 text-xs font-semibold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'simulator'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Deterministic Policy Simulator
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('roles')}
          className={`pb-2.5 px-3 text-xs font-semibold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'roles'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Role & Segregation of Duties Matrix
        </button>
      </div>

      {/* Tab 1: Rules Library */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed flex items-start gap-2.5">
            <Code2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800 block">Deterministic Architecture Invariant:</strong>
              These policy rules are executed strictly in pure TypeScript code outside of any AI prompt.
              They evaluate party role, equity ownership, jurisdiction, and risk tier to determine
              mandatory screening obligations.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policyRules.map((rule) => (
              <div
                key={rule.id}
                className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-900">{rule.id}</span>
                    <h4 className="text-sm font-bold text-slate-800 mt-0.5">{rule.name}</h4>
                  </div>
                  <Badge variant={rule.mandatesScreening ? 'danger' : 'neutral'} size="sm">
                    {rule.mandatesScreening ? 'Mandatory' : 'Conditional'}
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{rule.description}</p>

                <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-600 space-y-1">
                  <div>Role Trigger: {rule.subjectRole || (rule as any)?.criteria?.partyRole || 'ANY'}</div>
                  {(rule.minOwnershipPercent !== undefined || (rule as any)?.criteria?.ownershipThreshold) && (
                    <div>
                      Ownership Threshold: ≥{rule.minOwnershipPercent ?? (rule as any)?.criteria?.ownershipThreshold}%
                    </div>
                  )}
                  {(rule.customerRisk || (rule as any)?.criteria?.customerRisk) && (
                    <div>Customer Risk Trigger: {rule.customerRisk ?? (rule as any)?.criteria?.customerRisk}</div>
                  )}
                  {rule.jurisdictionRisk && (
                    <div>Jurisdiction Risk: {rule.jurisdictionRisk}</div>
                  )}
                  {rule.searchDepth && (
                    <div>Search Depth: {rule.searchDepth}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Policy Simulator */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleRunSimulation}
            className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4 text-xs"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Deterministic Rule Evaluation Sandbox
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulate how policy rules resolve for custom corporate structures.
              </p>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Party Role</label>
              <select
                value={simRole}
                onChange={(e) => setSimRole(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-indigo-600"
              >
                <option value="ULTIMATE_BENEFICIAL_OWNER">Ultimate Beneficial Owner (UBO)</option>
                <option value="DIRECTOR">Executive Board Director</option>
                <option value="AUTHORIZED_SIGNATORY">Authorized Signatory</option>
                <option value="SENIOR_MANAGER">Senior Managing Official</option>
                <option value="SHAREHOLDER">Minority Shareholder</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Equity Ownership %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={simOwnership}
                  onChange={(e) => setSimOwnership(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-indigo-600 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Jurisdiction</label>
                <input
                  type="text"
                  maxLength={2}
                  value={simJurisdiction}
                  onChange={(e) => setSimJurisdiction(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-indigo-600 font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Customer Risk Tier</label>
              <select
                value={simCustomerRisk}
                onChange={(e) => setSimCustomerRisk(e.target.value as RiskLevel)}
                className="w-full px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-indigo-600"
              >
                <option value="LOW">Low Risk</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="HIGH">High Risk</option>
                <option value="VERY_HIGH">Very High Risk</option>
              </select>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSimulating}
              leftIcon={<Play className="h-3.5 w-3.5 fill-current" />}
              className="w-full text-xs"
            >
              Evaluate Deterministic Rules
            </Button>
          </form>

          {/* Simulation Output Card */}
          <div className="p-5 rounded-xl bg-slate-900 text-white shadow-md text-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Evaluation Output
              </h4>
              <span className="text-[10px] font-mono text-slate-400">Policy v2.4.0</span>
            </div>

            {simResult ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-between">
                  <span>Mandatory Screening Required:</span>
                  <Badge variant={simResult.isMandatory ? 'danger' : 'neutral'} size="sm">
                    {simResult.isMandatory ? 'YES — MANDATORY' : 'NO — CONDITIONAL'}
                  </Badge>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-1">Matched Rules:</span>
                  <div className="space-y-1.5">
                    {simResult.matchedRules.map((r: any) => (
                      <div
                        key={r.id}
                        className="p-2 rounded bg-slate-800/80 border border-slate-700 text-slate-200 font-mono text-[11px]"
                      >
                        {r.id}: {r.name}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  Search Depth Resolved:{' '}
                  <strong className="text-white">{simResult.searchDepth || 'STANDARD'}</strong>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 italic">
                Adjust parameters on the left and click "Evaluate Deterministic Rules".
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Roles & Segregation of Duties Matrix */}
      {activeTab === 'roles' && (
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Role-Based Access Control & Segregation of Duties Matrix
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Execute Search</th>
                  <th className="py-2.5 px-3">Propose Alias</th>
                  <th className="py-2.5 px-3">Approve Alias</th>
                  <th className="py-2.5 px-3">Request Exemption</th>
                  <th className="py-2.5 px-3">Approve Exemption*</th>
                  <th className="py-2.5 px-3">Sign-Off Case</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rolesMatrix.map((r) => (
                  <tr key={r.role} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{r.title}</div>
                      <div className="text-[10px] font-mono text-slate-400">{r.role}</div>
                    </td>

                    <td className="py-3 px-3">
                      {r.canScreen ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {r.canProposeAlias ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {r.canApproveAlias ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {r.canRequestExemption ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {r.canApproveExemption ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {r.canSignOffCase ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-500 italic pt-2">
            *Segregation of Duties Invariant: Self-approval is strictly prohibited by code. Even if a
            user holds the Checker or Compliance Officer role, they cannot approve an exemption or alias
            they requested.
          </p>
        </div>
      )}
    </div>
  );
};

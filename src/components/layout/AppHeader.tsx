import React, { useState } from 'react';
import {
  Bell,
  Check,
  ChevronDown,
  FileCheck2,
  FolderOpen,
  LayoutDashboard,
  Radio,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  UserCircle2,
  Users,
} from 'lucide-react';
import { UserRole } from '../../types/index.ts';
import { Badge } from '../common/Badge.tsx';

export type PrimaryNavTab =
  | 'home'
  | 'work-queue'
  | 'cases'
  | 'monitoring'
  | 'reports'
  | 'admin';

interface AppHeaderProps {
  currentTab: PrimaryNavTab;
  onSelectTab: (tab: PrimaryNavTab) => void;
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenQuickSearch: () => void;
  workItemsSummary?: { awaitingReview: number; failedConnectors: number };
}

const ROLES: Array<{ role: UserRole; label: string; desc: string; persona: string }> = [
  {
    role: 'ANALYST',
    label: 'AML/KYC Analyst (L1)',
    desc: 'Conducts triage, gathers aliases, proposes exemptions, resolves evidence',
    persona: 'Sarah Chen',
  },
  {
    role: 'CHECKER',
    label: 'Reviewer / Checker (L2)',
    desc: 'Four-eyes secondary reviewer, approves aliases and exemptions, quality checks',
    persona: 'Marcus Vance',
  },
  {
    role: 'COMPLIANCE_OFFICER',
    label: 'Compliance Officer (L2)',
    desc: 'Policy guidance, regulatory escalations, complex risk determinations',
    persona: 'Elena Rostova',
  },
  {
    role: 'MLRO',
    label: 'MLRO (Executive Oversight)',
    desc: 'Final risk sign-off, SAR/STR disclosures, regulatory reporting',
    persona: 'David O’Connor',
  },
  {
    role: 'OPERATIONS_MANAGER',
    label: 'Team Lead / Ops Manager',
    desc: 'Workload distribution, SLA monitoring, capacity planning',
    persona: 'Priya Sharma',
  },
  {
    role: 'POLICY_ADMINISTRATOR',
    label: 'Policy Administrator',
    desc: 'Maintains screening policy rules, threshold matrices, search presets',
    persona: 'Julian Thorne',
  },
  {
    role: 'SYSTEM_ADMINISTRATOR',
    label: 'System Administrator',
    desc: 'Connector health, circuit breaker controls, integration observability',
    persona: 'Alex Rivera',
  },
  {
    role: 'AUDITOR',
    label: 'Auditor (Read-Only)',
    desc: 'Independent assurance, regulatory examination, immutable audit logs',
    persona: 'Dr. Fiona Campbell',
  },
];

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentTab,
  onSelectTab,
  activeRole,
  onRoleChange,
  onOpenQuickSearch,
  workItemsSummary,
}) => {
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const activeRoleConfig = ROLES.find((r) => r.role === activeRole) || ROLES[0];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white select-none">
      {/* Top tier: Brand, Environment Banner, Global Search, and Role Simulator */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand & Stage 1 Badge */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-inner">
            AM
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white">
                Adverse Media Screening Agent
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                Stage 1 Foundation
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal">
              Enterprise AML/KYC Screening & Investigation Engine
            </p>
          </div>
        </div>

        {/* Global Quick Search */}
        <div className="hidden md:flex flex-1 max-w-xs mx-4">
          <button
            type="button"
            onClick={onOpenQuickSearch}
            className="w-full h-8 px-3 rounded-md bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-xs text-slate-400 flex items-center justify-between transition-colors shadow-2xs"
          >
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span>Search cases, subjects, aliases...</span>
            </span>
            <kbd className="text-[10px] font-mono bg-slate-700/80 px-1.5 py-0.5 rounded text-slate-300">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Role Switcher & System Status */}
        <div className="flex items-center gap-3">
          {/* Synthetic Data Pill */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] bg-slate-800/80 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Synthetic Demo Data</span>
          </div>

          {/* Role Simulator Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="h-8 px-2.5 rounded-md bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center gap-2 text-xs transition-colors cursor-pointer"
              title="Switch user role to simulate server-side RBAC and SoD"
            >
              <div className="h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                {activeRoleConfig.role[0]}
              </div>
              <div className="text-left hidden sm:block">
                <span className="font-medium text-slate-200 leading-none block">
                  {activeRoleConfig.persona}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {activeRole}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {roleMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setRoleMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-white text-slate-800 shadow-2xl border border-slate-200 z-50 overflow-hidden py-1">
                  <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50">
                    <p className="text-xs font-semibold text-slate-900">
                      Simulate Enterprise User Role (RBAC & SoD)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Changes server-side authorization and active permissions
                    </p>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-1 divide-y divide-slate-100">
                    {ROLES.map((r) => {
                      const isSelected = r.role === activeRole;
                      return (
                        <button
                          key={r.role}
                          type="button"
                          onClick={() => {
                            onRoleChange(r.role);
                            setRoleMenuOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-lg flex items-start gap-2.5 transition-colors ${
                            isSelected
                              ? 'bg-indigo-50/80 text-indigo-950 font-medium'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div
                            className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5 ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {r.persona[0]}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold">{r.label}</span>
                              {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                            </div>
                            <p className="text-[11px] text-slate-500 font-normal line-clamp-1">
                              {r.desc}
                            </p>
                            <span className="text-[10px] font-mono text-slate-400">
                              Actor: {r.persona}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Primary Navigation Bar */}
      <div className="bg-slate-950 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto scrollbar-none h-11">
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              currentTab === 'home'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('work-queue')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              currentTab === 'work-queue'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Work Queue</span>
            {workItemsSummary && workItemsSummary.awaitingReview > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {workItemsSummary.awaitingReview}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('cases')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              currentTab === 'cases'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span>Cases & Workspace</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('monitoring')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              currentTab === 'monitoring'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>Monitoring</span>
            {workItemsSummary && workItemsSummary.failedConnectors > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {workItemsSummary.failedConnectors} Alert
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('reports')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              currentTab === 'reports'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>Reports & Oversight</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('admin')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              currentTab === 'admin'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Administration</span>
          </button>
        </div>
      </div>
    </header>
  );
};

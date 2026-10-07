import React from 'react';
import {
  AlertOctagon,
  CheckCircle,
  Clock,
  Compass,
  FileCheck,
  FileText,
  History,
  Newspaper,
  ShieldAlert,
  Users2,
} from 'lucide-react';

export type WorkflowArea =
  | 'overview'
  | 'subjects'
  | 'events-evidence'
  | 'investigation'
  | 'tasks-requests'
  | 'decisions'
  | 'audit';

export type WorkflowTab = WorkflowArea;

interface WorkflowNavProps {
  currentArea?: WorkflowArea;
  activeTab?: WorkflowArea;
  onSelectArea?: (area: WorkflowArea) => void;
  onSelectTab?: (area: WorkflowArea) => void;
  metrics?: {
    subjectCount?: number;
    conflictCount?: number;
    articleCount?: number;
    coveragePercent?: number;
    pendingTasksCount?: number;
    blockersCount?: number;
    auditEventCount?: number;
  };
  blockerCount?: number;
  findingsCount?: number;
  tasksCount?: number;
}

export const WorkflowNav: React.FC<WorkflowNavProps> = ({
  currentArea,
  activeTab,
  onSelectArea,
  onSelectTab,
  metrics,
  blockerCount = 0,
  findingsCount = 0,
  tasksCount = 0,
}) => {
  const selectedArea = activeTab || currentArea || 'overview';
  const handleSelect = onSelectTab || onSelectArea || (() => {});

  const subjectCount = metrics?.subjectCount ?? 0;
  const conflictCount = metrics?.conflictCount ?? 0;
  const articleCount = metrics?.articleCount ?? findingsCount;
  const coveragePercent = metrics?.coveragePercent ?? 0;
  const pendingTasksCount = metrics?.pendingTasksCount ?? tasksCount;
  const blockersCount = metrics?.blockersCount ?? blockerCount;
  const auditEventCount = metrics?.auditEventCount ?? 0;

  const tabs = [
    {
      id: 'overview' as const,
      label: 'Overview',
      icon: Compass,
      badge: null,
    },
    {
      id: 'subjects' as const,
      label: 'Subjects',
      icon: Users2,
      badge: subjectCount > 0 ? subjectCount : null,
      badgeColor: conflictCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700',
      flag: conflictCount > 0 ? `${conflictCount} conflicts` : null,
    },
    {
      id: 'events-evidence' as const,
      label: 'Events & Evidence',
      icon: Newspaper,
      badge: articleCount > 0 ? articleCount : null,
      badgeColor: articleCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600',
    },
    {
      id: 'investigation' as const,
      label: 'Investigation',
      icon: FileText,
      badge: coveragePercent > 0 ? `${coveragePercent}%` : null,
      badgeColor:
        coveragePercent === 100
          ? 'bg-emerald-100 text-emerald-800'
          : coveragePercent > 0
          ? 'bg-amber-100 text-amber-800'
          : 'bg-slate-100 text-slate-600',
    },
    {
      id: 'tasks-requests' as const,
      label: 'Tasks & Requests',
      icon: Clock,
      badge: pendingTasksCount > 0 ? pendingTasksCount : null,
      badgeColor: pendingTasksCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600',
    },
    {
      id: 'decisions' as const,
      label: 'Decisions',
      icon: FileCheck,
      badge: blockersCount > 0 ? `${blockersCount} Blockers` : 'Ready',
      badgeColor: blockersCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'audit' as const,
      label: 'Audit & Traceability',
      icon: History,
      badge: auditEventCount > 0 ? auditEventCount : null,
      badgeColor: 'bg-slate-100 text-slate-700',
    },
  ];

  return (
    <div className="bg-slate-50 border-b border-slate-200 sticky top-14 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 overflow-x-auto scrollbar-none py-1.5" aria-label="Workflow Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = selectedArea === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelect(tab.id)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all select-none cursor-pointer ${
                  isSelected
                    ? 'bg-white text-indigo-950 font-semibold shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isSelected ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span>{tab.label}</span>

                {tab.badge !== null && (
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded font-mono font-medium ${
                      isSelected && !tab.badgeColor ? 'bg-indigo-50 text-indigo-700' : tab.badgeColor
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}

                {tab.flag && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-white font-medium">
                    {tab.flag}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Filter,
  Layers,
  Search,
  ShieldAlert,
  UserCheck,
  Users,
} from 'lucide-react';
import { UserRole, WorkItem } from '../../types/index.ts';
import { Badge, BadgeVariant } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { EmptyState } from '../common/EmptyState.tsx';

interface WorkQueueViewProps {
  workItems: WorkItem[];
  activeRole: UserRole;
  onOpenCase: (caseId: string) => void;
}

export const WorkQueueView: React.FC<WorkQueueViewProps> = ({
  workItems,
  activeRole,
  onOpenCase,
}) => {
  const [selectedQueue, setSelectedQueue] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('ALL');

  const queues = [
    { id: 'all', label: 'All Items', count: workItems.length },
    {
      id: 'assigned',
      label: 'Assigned to My Role',
      count: workItems.filter((w) => w.assignedRole === activeRole).length,
    },
    {
      id: 'unassigned',
      label: 'Unassigned (Claimable)',
      count: workItems.filter((w) => !w.assignedTo).length,
    },
    {
      id: 'review',
      label: 'Awaiting Four-Eyes Review',
      count: workItems.filter((w) => w.type === 'CHECKER_REVIEW' || w.type === 'EXEMPTION_REQUEST').length,
    },
    {
      id: 'escalated',
      label: 'High-Risk Escalations',
      count: workItems.filter((w) => w.riskLevel === 'HIGH').length,
    },
    {
      id: 'failed',
      label: 'Failed Connectors',
      count: workItems.filter((w) => w.type === 'FAILED_CONNECTOR').length,
    },
  ];

  const filteredItems = workItems.filter((item) => {
    if (selectedQueue === 'assigned' && item.assignedRole !== activeRole) return false;
    if (selectedQueue === 'unassigned' && item.assignedTo) return false;
    if (selectedQueue === 'review' && item.type !== 'CHECKER_REVIEW' && item.type !== 'EXEMPTION_REQUEST') return false;
    if (selectedQueue === 'escalated' && item.riskLevel !== 'HIGH') return false;
    if (selectedQueue === 'failed' && item.type !== 'FAILED_CONNECTOR') return false;
    if (selectedRisk !== 'ALL' && item.riskLevel !== selectedRisk) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.caseReference.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const priorityBadgeMap: Record<string, BadgeVariant> = {
    URGENT: 'critical',
    HIGH: 'danger',
    MEDIUM: 'warning',
    LOW: 'neutral',
  };

  return (
    <div className="space-y-6">
      {/* Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">Enterprise Work Queues</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational triage, four-eyes review distribution, and SLA-prioritized screening tasks.
          </p>
        </div>
      </div>

      {/* Queue Tabs */}
      <div className="flex space-x-1 overflow-x-auto scrollbar-none pb-1 border-b border-slate-200">
        {queues.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setSelectedQueue(q.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedQueue === q.id
                ? 'bg-slate-900 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{q.label}</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                selectedQueue === q.id ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {q.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search items by case ref, customer, or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-indigo-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-xs text-slate-700 focus:outline-indigo-600"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>
        </div>
      </div>

      {/* Work Items Table */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6 text-slate-400" />}
          title="No Items Found in Queue"
          description="There are currently no active tasks matching the selected queue and filter criteria."
        />
      ) : (
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Case Reference & Customer</th>
                  <th className="py-2.5 px-3">Task Title & Type</th>
                  <th className="py-2.5 px-3">Priority / Risk</th>
                  <th className="py-2.5 px-3">Assignment</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onOpenCase(item.caseId)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{item.customerName}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {item.caseReference}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">{item.title}</div>
                      <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                        {item.type.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={priorityBadgeMap[item.priority] || 'neutral'} size="sm">
                          {item.priority}
                        </Badge>
                        <span className="text-[11px] text-slate-500">
                          {item.riskLevel} Risk
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {item.assignedToName ? (
                        <div className="text-slate-800 font-medium">{item.assignedToName}</div>
                      ) : (
                        <span className="text-amber-600 font-semibold italic">Unassigned (Claimable)</span>
                      )}
                      <span className="text-[11px] text-slate-400 block">{item.assignedRole}</span>
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-600">
                      {new Date(item.dueDate).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1">
                        <span>Open</span>
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

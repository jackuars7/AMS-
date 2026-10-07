import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Layers,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { MonitoringAlert, MonitoringAlertStatus } from '../../types/index.ts';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';

interface MonitoringAlertsTableProps {
  alerts: MonitoringAlert[];
  onSelectAlert: (alert: MonitoringAlert) => void;
  onNavigateToCase?: (caseId: string) => void;
  onUpdateStatus?: (alertId: string, status: MonitoringAlertStatus) => void;
}

export const MonitoringAlertsTable: React.FC<MonitoringAlertsTableProps> = ({
  alerts,
  onSelectAlert,
  onNavigateToCase,
  onUpdateStatus,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE_ONLY');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredAlerts = alerts.filter((alert) => {
    if (priorityFilter !== 'ALL' && alert.priorityTier !== priorityFilter) return false;
    if (statusFilter === 'ACTIVE_ONLY') {
      if (alert.status === 'CLEARED' || alert.status === 'SUPPRESSED') return false;
    } else if (statusFilter !== 'ALL' && alert.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = alert.title.toLowerCase().includes(q);
      const matchDesc = alert.deltaExplanation.toLowerCase().includes(q);
      const matchSubject = alert.subjectName.toLowerCase().includes(q);
      const matchCase = alert.caseId.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchSubject || matchCase;
    }
    return true;
  });

  const getPriorityBadge = (priority: MonitoringAlert['priorityTier']) => {
    switch (priority) {
      case 'CRITICAL':
        return <Badge variant="critical">Critical</Badge>;
      case 'HIGH':
        return <Badge variant="danger">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">Medium</Badge>;
      case 'LOW':
        return <Badge variant="neutral">Low</Badge>;
      default:
        return <Badge variant="default">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: MonitoringAlertStatus) => {
    switch (status) {
      case 'NEW':
        return <Badge variant="primary">New</Badge>;
      case 'INVESTIGATING':
        return <Badge variant="warning">Investigating</Badge>;
      case 'ESCALATED':
        return <Badge variant="critical">Escalated</Badge>;
      case 'CLEARED':
        return <Badge variant="success">Cleared</Badge>;
      case 'SUPPRESSED':
        return <Badge variant="neutral">Suppressed</Badge>;
      case 'CONVERTED_TO_CASE':
        return <Badge variant="info">Case Created</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search alert title, subject, case..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1 text-slate-600">
            <Filter className="w-3.5 h-3.5" />
            <span>Priority:</span>
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs px-2 py-1 rounded border border-slate-300 bg-white"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <div className="flex items-center gap-1 text-slate-600 ml-1">
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2 py-1 rounded border border-slate-300 bg-white"
          >
            <option value="ACTIVE_ONLY">Active Alerts (New/Investigating)</option>
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="ESCALATED">Escalated</option>
            <option value="CONVERTED_TO_CASE">Converted to Case</option>
            <option value="CLEARED">Cleared</option>
            <option value="SUPPRESSED">Suppressed</option>
          </select>
        </div>
      </div>

      {/* Alert List / Table */}
      {filteredAlerts.length === 0 ? (
        <div className="text-center py-10 px-4 bg-white rounded-lg border border-slate-200">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">No alerts match current criteria</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Active continuous monitoring has evaluated all schedules and subscriptions.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden bg-white border border-slate-200 rounded-lg shadow-2xs">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Priority / Score</th>
                <th className="py-2.5 px-3">Alert & Subject</th>
                <th className="py-2.5 px-3">Linked Context</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">SLA / Age</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredAlerts.map((alert) => (
                <tr
                  key={alert.id}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  onClick={() => onSelectAlert(alert)}
                >
                  <td className="py-3 px-3 align-top whitespace-nowrap">
                    <div className="flex flex-col gap-1 items-start">
                      {getPriorityBadge(alert.priorityTier)}
                      <span className="text-[11px] font-mono text-slate-500">
                        Score: <strong className="text-slate-800">{alert.priorityScore}/100</strong>
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3 align-top">
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-900 line-clamp-1">
                        {alert.title}
                      </div>
                      <p className="text-slate-600 text-[11px] line-clamp-2">
                        {alert.deltaExplanation}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span>Subject:</span>
                        <strong className="text-indigo-700 font-medium">
                          {alert.subjectName}
                        </strong>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                          {alert.alertType}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3 align-top whitespace-nowrap">
                    <div className="space-y-1 text-[11px]">
                      <div>
                        Case:{' '}
                        {onNavigateToCase ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToCase(alert.caseId);
                            }}
                            className="font-medium text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-0.5"
                          >
                            <span>{alert.caseId}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="font-medium text-slate-800">{alert.caseId}</span>
                        )}
                      </div>
                      {alert.eventId && (
                        <div className="text-slate-500 font-mono text-[10px]">
                          Event: {alert.eventId.slice(0, 12)}...
                        </div>
                      )}
                      {alert.articleId && (
                        <div className="text-slate-500 text-[10px]">
                          Article: {alert.articleId.slice(0, 12)}...
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-3 align-top whitespace-nowrap">
                    {getStatusBadge(alert.status)}
                  </td>

                  <td className="py-3 px-3 align-top whitespace-nowrap text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      SLA: 24h review
                    </span>
                  </td>

                  <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => onSelectAlert(alert)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Inspect
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

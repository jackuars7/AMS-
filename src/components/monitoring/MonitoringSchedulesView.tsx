import React, { useState } from 'react';
import {
  AlertOctagon,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Play,
  PlayCircle,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Sliders,
  History,
} from 'lucide-react';
import { ScreeningSchedule, ScheduleRevision, UserRole } from '../../types/index.ts';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { Modal } from '../common/Modal.tsx';
import { apiClient } from '../../lib/api-client.ts';

interface MonitoringSchedulesViewProps {
  schedules: ScreeningSchedule[];
  activeRole: UserRole;
  filterMode?: 'all' | 'due-upcoming' | 'overdue';
  onRefresh: () => void;
  onNavigateToCase?: (caseId: string) => void;
}

export const MonitoringSchedulesView: React.FC<MonitoringSchedulesViewProps> = ({
  schedules,
  activeRole,
  filterMode = 'all',
  onRefresh,
  onNavigateToCase,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [selectedSchedule, setSelectedSchedule] = useState<ScreeningSchedule | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalculateReason, setRecalculateReason] = useState('Customer Risk Rating Revision');
  const [isTriggeringJob, setIsTriggeringJob] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const filtered = schedules.filter((s) => {
    if (filterMode === 'overdue' && !s.isOverdue) return false;
    if (filterMode === 'due-upcoming') {
      const now = new Date().getTime();
      const nextDate = new Date(s.nextScreeningAt).getTime();
      const diffDays = (nextDate - now) / 86400000;
      // Due soon if within 30 days or overdue
      if (diffDays > 30 && !s.isOverdue) return false;
    }
    if (riskFilter !== 'ALL' && s.customerRisk !== riskFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.caseReference.toLowerCase().includes(q) ||
        s.policyRuleId.toLowerCase().includes(q) ||
        s.reviewType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleRecalculate = async () => {
    if (!selectedSchedule) return;
    setIsRecalculating(true);
    setActionNotice(null);
    try {
      const res = await apiClient.recalculateSchedule(selectedSchedule.id, recalculateReason);
      setActionNotice(`Schedule recalculation completed. Next date: ${new Date(res.data.nextScreeningAt).toLocaleDateString()}`);
      setSelectedSchedule(res.data);
      onRefresh();
    } catch (err: any) {
      setActionNotice(`Error: ${err.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleTogglePause = async (schedule: ScreeningSchedule) => {
    const newStatus = schedule.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
    setActionNotice(null);
    try {
      await apiClient.updateScheduleStatus(
        schedule.id,
        newStatus,
        newStatus === 'PAUSED' ? 'Administrative freeze' : 'Screening resumed by compliance'
      );
      setActionNotice(`Schedule ${schedule.id} set to ${newStatus}`);
      onRefresh();
    } catch (err: any) {
      setActionNotice(`Error: ${err.message}`);
    }
  };

  const handleRunImmediateJob = async (schedule: ScreeningSchedule) => {
    setIsTriggeringJob(true);
    setActionNotice(null);
    try {
      const res = await apiClient.triggerRescreeningJob(schedule.id);
      setActionNotice(`Rescreening job completed! Cycle ID: ${res.cycle.id}, Alerts generated: ${res.cycle.alertCount}`);
      onRefresh();
    } catch (err: any) {
      setActionNotice(`Error triggering job: ${err.message}`);
    } finally {
      setIsTriggeringJob(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Risk Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search case, policy, review type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-slate-300 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-600">Risk Filter:</span>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="text-xs px-2 py-1 rounded border border-slate-300 bg-white"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="HIGH">High Risk (90-day cycle)</option>
            <option value="MEDIUM">Medium Risk (180-day cycle)</option>
            <option value="LOW">Low Risk (365-day cycle)</option>
          </select>

          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            className="text-xs h-7 px-2.5"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 text-xs bg-indigo-50 border border-indigo-200 rounded-md text-indigo-900">
          {actionNotice}
        </div>
      )}

      {/* Schedules Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 bg-white border border-slate-200 rounded-lg">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No screening schedules found</p>
          <p className="text-xs text-slate-500">
            All schedules match current filter criteria.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden bg-white border border-slate-200 rounded-lg shadow-2xs">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Case Reference</th>
                <th className="py-2.5 px-3">Customer Risk</th>
                <th className="py-2.5 px-3">Review Type & Policy</th>
                <th className="py-2.5 px-3">Next Due Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 align-top whitespace-nowrap">
                    {onNavigateToCase ? (
                      <button
                        type="button"
                        onClick={() => onNavigateToCase(s.caseId)}
                        className="font-bold text-indigo-600 hover:text-indigo-800 underline text-xs flex items-center gap-1"
                      >
                        <span>{s.caseReference}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="font-bold text-slate-900">{s.caseReference}</span>
                    )}
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {s.relationshipType}
                    </div>
                  </td>

                  <td className="py-3 px-3 align-top whitespace-nowrap">
                    <span
                      className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded border ${
                        s.customerRisk === 'HIGH'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : s.customerRisk === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {s.customerRisk}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      Interval: {s.intervalDays}d
                    </div>
                  </td>

                  <td className="py-3 px-3 align-top">
                    <div className="font-medium text-slate-800">{s.reviewType}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Policy: {s.policyRuleId}
                    </div>
                  </td>

                  <td className="py-3 px-3 align-top whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span
                        className={
                          s.isOverdue
                            ? 'text-rose-700 font-bold'
                            : 'text-slate-800'
                        }
                      >
                        {new Date(s.nextScreeningAt).toLocaleDateString()}
                      </span>
                    </div>
                    {s.isOverdue && (
                      <span className="inline-block text-[10px] font-bold text-rose-700 mt-0.5 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-200">
                        {s.overdueDays} Days Overdue
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 align-top whitespace-nowrap">
                    <Badge
                      variant={
                        s.status === 'ACTIVE'
                          ? 'success'
                          : s.status === 'PAUSED'
                          ? 'warning'
                          : s.status === 'OVERDUE'
                          ? 'critical'
                          : 'default'
                      }
                    >
                      {s.status}
                    </Badge>
                  </td>

                  <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => setSelectedSchedule(s)}
                      >
                        <Sliders className="w-3 h-3 mr-1" />
                        Admin
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => handleRunImmediateJob(s)}
                        disabled={isTriggeringJob}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Run Job
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Schedule Detail & Recalculation Modal */}
      {selectedSchedule && (
        <Modal
          isOpen={!!selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
          title={`Screening Schedule Administration: ${selectedSchedule.caseReference}`}
          description="AM-53: Calculate schedules from policy, customer risk, relationship type, and authorized exceptions."
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTogglePause(selectedSchedule)}
              >
                {selectedSchedule.status === 'PAUSED' ? 'Resume Schedule' : 'Pause Schedule'}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRecalculate}
                  disabled={isRecalculating}
                >
                  {isRecalculating ? 'Recalculating...' : 'Recalculate Dates'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedSchedule(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500">Current Interval:</span>
                <div className="font-bold text-slate-800 text-sm">
                  {selectedSchedule.intervalDays} Days
                </div>
              </div>
              <div>
                <span className="text-slate-500">Customer Risk Level:</span>
                <div className="font-bold text-indigo-700 text-sm">
                  {selectedSchedule.customerRisk}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Next Scheduled Screening:</span>
                <div className="font-semibold text-slate-800">
                  {new Date(selectedSchedule.nextScreeningAt).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Schedule Status:</span>
                <div>
                  <Badge
                    variant={
                      selectedSchedule.status === 'ACTIVE'
                        ? 'success'
                        : selectedSchedule.status === 'PAUSED'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {selectedSchedule.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">
                Recalculation Trigger / Audit Justification:
              </label>
              <input
                type="text"
                value={recalculateReason}
                onChange={(e) => setRecalculateReason(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 bg-white"
                placeholder="Reason for recalculation (e.g. Risk score change or exception approval)"
              />
            </div>

            {/* Schedule Revision History */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>Revision Audit History (AM-53)</span>
              </h4>
              {selectedSchedule.revisions && selectedSchedule.revisions.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedSchedule.revisions.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] space-y-0.5"
                    >
                      <div className="flex justify-between font-medium text-slate-700">
                        <span>
                          {rev.previousIntervalDays}d → {rev.revisedIntervalDays}d
                        </span>
                        <span className="text-slate-400">
                          {new Date(rev.recalculatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-600 italic">"{rev.reason}"</p>
                      <div className="text-[10px] text-slate-400">By: {rev.recalculatedBy}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-[11px]">
                  No prior schedule revisions recorded. Initial calculation based on policy baseline.
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

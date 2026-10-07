import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Layers,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  DeltaSet,
  KycCase,
  MaterialUpdate,
  MonitoringAlert,
  MonitoringCycle,
  MonitoringMetrics,
  MonitoringSubscription,
  ScreeningSchedule,
  SourceConnector,
  SuppressionDecision,
  TriggeredCase,
  UserRole,
} from '../../types/index.ts';
import { apiClient } from '../../lib/api-client.ts';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { MonitoringAlertsTable } from '../monitoring/MonitoringAlertsTable.tsx';
import { MonitoringDetailDrawer } from '../monitoring/MonitoringDetailDrawer.tsx';
import { MonitoringSchedulesView } from '../monitoring/MonitoringSchedulesView.tsx';
import { MaterialUpdatesView } from '../monitoring/MaterialUpdatesView.tsx';
import { SuppressionHistoryView } from '../monitoring/SuppressionHistoryView.tsx';
import { ScheduleConnectorHealthView } from '../monitoring/ScheduleConnectorHealthView.tsx';

export type MonitoringSavedView =
  | 'overview'
  | 'due-upcoming'
  | 'overdue'
  | 'alerts'
  | 'material-updates'
  | 'reopened'
  | 'suppressions'
  | 'health';

interface MonitoringViewProps {
  connectors: SourceConnector[];
  activeRole: UserRole;
  cases?: KycCase[];
  onRefreshConnectors: () => void;
  onRetryConnectorDirect: (connectorId: string) => Promise<void>;
  onNavigateToCase?: (caseId: string, tab?: any) => void;
}

export const MonitoringView: React.FC<MonitoringViewProps> = ({
  connectors,
  activeRole,
  cases = [],
  onRefreshConnectors,
  onRetryConnectorDirect,
  onNavigateToCase,
}) => {
  const [currentView, setCurrentView] = useState<MonitoringSavedView>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [schedules, setSchedules] = useState<ScreeningSchedule[]>([]);
  const [subscriptions, setSubscriptions] = useState<MonitoringSubscription[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [materialUpdates, setMaterialUpdates] = useState<MaterialUpdate[]>([]);
  const [suppressions, setSuppressions] = useState<SuppressionDecision[]>([]);
  const [triggeredCases, setTriggeredCases] = useState<TriggeredCase[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<MonitoringAlert | null>(null);
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [demoBanner, setDemoBanner] = useState<string | null>(null);

  // Load all monitoring domain state
  const loadMonitoringData = async () => {
    setIsLoading(true);
    try {
      const [
        overviewRes,
        schedulesRes,
        subsRes,
        alertsRes,
        matRes,
        supRes,
        trigRes,
      ] = await Promise.all([
        apiClient.getMonitoringOverview().catch(() => null),
        apiClient.getScreeningSchedules().catch(() => ({ data: [] })),
        apiClient.getMonitoringSubscriptions().catch(() => ({ data: [] })),
        apiClient.getMonitoringAlerts().catch(() => ({ data: [] })),
        apiClient.getMaterialUpdates().catch(() => ({ data: [] })),
        apiClient.getSuppressionDecisions().catch(() => ({ data: [] })),
        apiClient.getTriggeredCases().catch(() => ({ data: [] })),
      ]);

      if (overviewRes?.metrics) setMetrics(overviewRes.metrics);
      if (schedulesRes?.data) setSchedules(schedulesRes.data);
      if (subsRes?.data) setSubscriptions(subsRes.data);
      if (alertsRes?.data) setAlerts(alertsRes.data);
      if (matRes?.data) setMaterialUpdates(matRes.data);
      if (supRes?.data) setSuppressions(supRes.data);
      if (trigRes?.data) setTriggeredCases(trigRes.data);
    } catch (err: any) {
      console.error('Failed to load monitoring data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMonitoringData();
  }, []);

  const handleRunMultiCycleDemo = async () => {
    setIsRunningDemo(true);
    setDemoBanner(null);
    try {
      const res = await apiClient.runMultiCycleDemo();
      setDemoBanner(
        `Multi-cycle demonstration completed! Executed ${res.cyclesExecuted || 3} sequential cycles: Unchanged FP suppression (AM-56), Material charge & corroboration detection (AM-57), Triggered EDD case generation (AM-58), and P1 priority scoring (AM-59).`
      );
      await loadMonitoringData();
    } catch (err: any) {
      setDemoBanner(`Demo error: ${err.message}`);
    } finally {
      setIsRunningDemo(false);
    }
  };

  const overdueSchedules = schedules.filter((s) => s.isOverdue);
  const activeAlerts = alerts.filter((a) => a.status === 'NEW' || a.status === 'INVESTIGATING' || a.status === 'ESCALATED');
  const criticalAlerts = alerts.filter((a) => a.priorityTier === 'CRITICAL');
  const reopenedSuppressions = suppressions.filter((s) => s.isReopened);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Simulation Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Continuous Monitoring & Rescreening
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-200">
              AM-53 – AM-59
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Policy-driven scheduled rescreening, continuous adverse-media ingestion, delta analysis, suppression safeguards, material change detection, and alert prioritization.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadMonitoringData}
            className="text-xs"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRunMultiCycleDemo}
            disabled={isRunningDemo}
            className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            leftIcon={<Play className="w-3.5 h-3.5" />}
          >
            {isRunningDemo ? 'Executing Cycles...' : 'Run Multi-Cycle Demo (AM-53 - AM-59)'}
          </Button>
        </div>
      </div>

      {demoBanner && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Synthetic Multi-Cycle Simulation Outcome:</span>
            <p className="text-emerald-900 leading-relaxed">{demoBanner}</p>
          </div>
        </div>
      )}

      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setCurrentView('alerts')}
          className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs hover:border-indigo-300 cursor-pointer transition-colors space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Active Alerts</span>
            <Bell className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{activeAlerts.length}</div>
          <div className="text-[10px] text-slate-400">
            {criticalAlerts.length} P1 Critical
          </div>
        </div>

        <div
          onClick={() => setCurrentView('overdue')}
          className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs hover:border-rose-300 cursor-pointer transition-colors space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Overdue Schedules</span>
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className={`text-xl font-black ${overdueSchedules.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {overdueSchedules.length}
          </div>
          <div className="text-[10px] text-slate-400">Escalated for immediate review</div>
        </div>

        <div
          onClick={() => setCurrentView('due-upcoming')}
          className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition-colors space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Screening Schedules</span>
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-xl font-black text-slate-900">{schedules.length}</div>
          <div className="text-[10px] text-slate-400">Policy-calculated intervals</div>
        </div>

        <div
          onClick={() => setCurrentView('material-updates')}
          className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs hover:border-amber-300 cursor-pointer transition-colors space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Material Updates</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-600">{materialUpdates.length}</div>
          <div className="text-[10px] text-slate-400">Charges, dismissals, retractions</div>
        </div>

        <div
          onClick={() => setCurrentView('suppressions')}
          className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs hover:border-emerald-300 cursor-pointer transition-colors space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Suppression Rate</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600">
            {metrics?.suppressionRatePercent || 48}%
          </div>
          <div className="text-[10px] text-slate-400">{suppressions.length} unchanged cleared</div>
        </div>

        <div
          onClick={() => setCurrentView('health')}
          className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition-colors space-y-1"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Coverage & Health</span>
            <Server className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {connectors.filter((c) => c.status === 'ACTIVE').length}/{connectors.length}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium">Queue lag: 0.14s</div>
        </div>
      </div>

      {/* Unified Saved-View Selector (Section 3: No separate tabs, 1 consolidated area with filters/views) */}
      <div className="border-b border-slate-200 bg-white rounded-t-lg px-2 pt-2 flex items-center gap-1 overflow-x-auto text-xs font-semibold">
        <button
          type="button"
          onClick={() => setCurrentView('overview')}
          className={`py-2 px-3 border-b-2 transition-colors whitespace-nowrap ${
            currentView === 'overview'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Monitoring Overview
        </button>

        <button
          type="button"
          onClick={() => setCurrentView('due-upcoming')}
          className={`py-2 px-3 border-b-2 transition-colors whitespace-nowrap ${
            currentView === 'due-upcoming'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Due and Upcoming ({schedules.length})
        </button>

        <button
          type="button"
          onClick={() => setCurrentView('overdue')}
          className={`py-2 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            currentView === 'overdue'
              ? 'border-rose-600 text-rose-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Overdue</span>
          {overdueSchedules.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800">
              {overdueSchedules.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setCurrentView('alerts')}
          className={`py-2 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            currentView === 'alerts'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Alerts</span>
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800">
            {activeAlerts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentView('material-updates')}
          className={`py-2 px-3 border-b-2 transition-colors whitespace-nowrap ${
            currentView === 'material-updates'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Material Updates ({materialUpdates.length})
        </button>

        <button
          type="button"
          onClick={() => setCurrentView('reopened')}
          className={`py-2 px-3 border-b-2 transition-colors whitespace-nowrap ${
            currentView === 'reopened'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Reopened Events ({reopenedSuppressions.length})
        </button>

        <button
          type="button"
          onClick={() => setCurrentView('suppressions')}
          className={`py-2 px-3 border-b-2 transition-colors whitespace-nowrap ${
            currentView === 'suppressions'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Suppression History ({suppressions.length})
        </button>

        <button
          type="button"
          onClick={() => setCurrentView('health')}
          className={`py-2 px-3 border-b-2 transition-colors whitespace-nowrap ${
            currentView === 'health'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Schedule & Connector Health
        </button>
      </div>

      {/* Main Perspective Body */}
      <div>
        {currentView === 'overview' && (
          <div className="space-y-6">
            {/* Top Priority Alerts Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    High Priority Adverse-Media Alerts (AM-59)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Calculated using customer risk, severity, evidence strength, recency, and identity confidence.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentView('alerts')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
                >
                  View All Alerts ({alerts.length})
                </button>
              </div>

              <MonitoringAlertsTable
                alerts={alerts.slice(0, 5)}
                onSelectAlert={(a) => setSelectedAlert(a)}
                onNavigateToCase={(caseId) => {
                  if (onNavigateToCase) onNavigateToCase(caseId);
                }}
              />
            </div>

            {/* Overdue Schedules Alert Card (if any) */}
            {overdueSchedules.length > 0 && (
              <div className="p-4 rounded-lg bg-rose-50/70 border border-rose-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900">
                    <AlertOctagon className="w-4 h-4 text-rose-600" />
                    <span>Overdue Rescreening Detected ({overdueSchedules.length} cases past SLA)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentView('overdue')}
                    className="text-xs font-bold text-rose-700 hover:text-rose-900 underline"
                  >
                    Resolve Overdue Queue
                  </button>
                </div>
                <p className="text-rose-800 leading-relaxed">
                  Screening schedules for high-risk accounts have exceeded their review interval without completed review. Immediate rescreening jobs can be triggered directly from the Overdue view.
                </p>
              </div>
            )}

            {/* Dual Grid: Recent Material Updates & Suppression Safeguards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Material Updates Summary */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    <span>Recent Material Updates (AM-57)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setCurrentView('material-updates')}
                    className="text-[11px] font-medium text-indigo-600 hover:underline"
                  >
                    View Details
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  {materialUpdates.slice(0, 3).map((u) => (
                    <div
                      key={u.id}
                      className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{u.subjectName}</span>
                        <Badge variant="warning" size="sm">{u.changeType}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">
                        {u.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suppression Safeguards Summary */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Suppressed Cleared Findings (AM-56)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setCurrentView('suppressions')}
                    className="text-[11px] font-medium text-indigo-600 hover:underline"
                  >
                    Audit History
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  {suppressions.slice(0, 3).map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{s.subjectName}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Rule: {s.ruleId} v{s.ruleVersion}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 italic line-clamp-1">
                        Prior: "{s.priorRationale}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'due-upcoming' && (
          <MonitoringSchedulesView
            schedules={schedules}
            activeRole={activeRole}
            filterMode="due-upcoming"
            onRefresh={loadMonitoringData}
            onNavigateToCase={onNavigateToCase}
          />
        )}

        {currentView === 'overdue' && (
          <MonitoringSchedulesView
            schedules={schedules}
            activeRole={activeRole}
            filterMode="overdue"
            onRefresh={loadMonitoringData}
            onNavigateToCase={onNavigateToCase}
          />
        )}

        {currentView === 'alerts' && (
          <MonitoringAlertsTable
            alerts={alerts}
            onSelectAlert={(a) => setSelectedAlert(a)}
            onNavigateToCase={(caseId) => {
              if (onNavigateToCase) onNavigateToCase(caseId);
            }}
          />
        )}

        {currentView === 'material-updates' && (
          <MaterialUpdatesView
            updates={materialUpdates}
            activeRole={activeRole}
            onRefresh={loadMonitoringData}
            onNavigateToCase={onNavigateToCase}
          />
        )}

        {currentView === 'reopened' && (
          <SuppressionHistoryView
            suppressions={suppressions}
            activeRole={activeRole}
            filterMode="reopened-only"
            onRefresh={loadMonitoringData}
            onNavigateToCase={onNavigateToCase}
          />
        )}

        {currentView === 'suppressions' && (
          <SuppressionHistoryView
            suppressions={suppressions}
            activeRole={activeRole}
            filterMode="all"
            onRefresh={loadMonitoringData}
            onNavigateToCase={onNavigateToCase}
          />
        )}

        {currentView === 'health' && (
          <ScheduleConnectorHealthView
            connectors={connectors}
            activeRole={activeRole}
            onRefresh={onRefreshConnectors}
            onRetryConnector={onRetryConnectorDirect}
          />
        )}
      </div>

      {/* Alert Deep Link Inspection Drawer */}
      <MonitoringDetailDrawer
        alert={selectedAlert}
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        activeRole={activeRole}
        onNavigateToCase={onNavigateToCase}
        onStatusUpdated={(updated) => {
          setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          setSelectedAlert(updated);
        }}
      />
    </div>
  );
};

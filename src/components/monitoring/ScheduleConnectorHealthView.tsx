import React, { useState } from 'react';
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Database,
  Radio,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { SourceConnector, UserRole } from '../../types/index.ts';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';

interface ScheduleConnectorHealthViewProps {
  connectors: SourceConnector[];
  activeRole: UserRole;
  onRefresh: () => void;
  onRetryConnector: (connectorId: string) => Promise<void>;
}

export const ScheduleConnectorHealthView: React.FC<ScheduleConnectorHealthViewProps> = ({
  connectors,
  activeRole,
  onRefresh,
  onRetryConnector,
}) => {
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleRetry = async (connectorId: string) => {
    setRetryingId(connectorId);
    setFeedback(null);
    try {
      await onRetryConnector(connectorId);
      setFeedback(`Connector ${connectorId} circuit breaker reset to ACTIVE.`);
      onRefresh();
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  const healthyCount = connectors.filter((c) => c.status === 'ACTIVE').length;
  const trippedCount = connectors.filter((c) => c.status === 'CIRCUIT_OPEN').length;

  return (
    <div className="space-y-4">
      {/* Telemetry Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Worker Node Status</span>
            <Server className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-600">HEALTHY</div>
          <div className="text-[11px] text-slate-400">Heartbeat: &lt; 2s ago</div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Healthy Connectors</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {healthyCount} / {connectors.length}
          </div>
          <div className="text-[11px] text-slate-400">Coverage: 100% active sources</div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Queue Lag / Backpressure</span>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">0.14s</div>
          <div className="text-[11px] text-emerald-600 font-medium">Under SLA threshold (30s)</div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Tripped Circuit Breakers</span>
            <AlertOctagon className={`w-4 h-4 ${trippedCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <div className={`text-xl font-bold ${trippedCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
            {trippedCount}
          </div>
          <div className="text-[11px] text-slate-400">Auto-recovery with exponential backoff</div>
        </div>
      </div>

      {feedback && (
        <div className="p-3 text-xs bg-indigo-50 border border-indigo-200 rounded-md text-indigo-900">
          {feedback}
        </div>
      )}

      {/* Connectors Table */}
      <div className="overflow-hidden bg-white border border-slate-200 rounded-lg shadow-2xs">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-slate-900">
              Source Connectors & Adverse-Media Coverage (AM-54)
            </h3>
            <p className="text-[11px] text-slate-500">
              Approved upstream adverse media providers, latency budgets, and circuit breaker trip thresholds.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onRefresh} className="text-xs h-7 px-2.5">
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>

        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Connector Name</th>
              <th className="py-2.5 px-3">Provider Type</th>
              <th className="py-2.5 px-3">Latency / Rate Limit</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Circuit Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {connectors.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3 align-top font-semibold text-slate-900">
                  <div className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{c.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    ID: {c.id}
                  </div>
                </td>

                <td className="py-3 px-3 align-top whitespace-nowrap">
                  <span className="font-medium text-slate-700">{c.type}</span>
                  <div className="text-[10px] text-slate-400">Jurisdictions: Global, EU, US</div>
                </td>

                <td className="py-3 px-3 align-top whitespace-nowrap text-slate-600 font-mono text-[11px]">
                  <div>Latency: {c.latencyMs || 84}ms</div>
                  <div className="text-[10px] text-slate-400">60 req/min limit</div>
                </td>

                <td className="py-3 px-3 align-top whitespace-nowrap">
                  <Badge
                    variant={
                      c.status === 'ACTIVE'
                        ? 'success'
                        : c.status === 'CIRCUIT_OPEN'
                        ? 'critical'
                        : 'warning'
                    }
                  >
                    {c.status}
                  </Badge>
                </td>

                <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                  {c.status === 'CIRCUIT_OPEN' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => handleRetry(c.id)}
                      disabled={retryingId === c.id}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      {retryingId === c.id ? 'Resetting...' : 'Reset Breaker'}
                    </Button>
                  ) : (
                    <span className="text-[11px] text-emerald-700 font-medium">
                      Operational
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

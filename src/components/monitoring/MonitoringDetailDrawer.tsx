import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  History,
  Info,
  Scale,
  Shield,
  ShieldAlert,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { MonitoringAlert, MonitoringAlertStatus, UserRole } from '../../types/index.ts';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { apiClient } from '../../lib/api-client.ts';

interface MonitoringDetailDrawerProps {
  alert: MonitoringAlert | null;
  isOpen: boolean;
  onClose: () => void;
  activeRole: UserRole;
  onNavigateToCase?: (caseId: string) => void;
  onStatusUpdated?: (updatedAlert: MonitoringAlert) => void;
}

export const MonitoringDetailDrawer: React.FC<MonitoringDetailDrawerProps> = ({
  alert,
  isOpen,
  onClose,
  activeRole,
  onNavigateToCase,
  onStatusUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'what-changed' | 'why-review' | 'prior-decision'>('what-changed');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !alert) return null;

  const handleUpdateStatus = async (newStatus: MonitoringAlertStatus) => {
    setIsUpdating(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.updateAlertStatus(alert.id, newStatus, actionNotes || undefined);
      if (onStatusUpdated) onStatusUpdated(res.data);
      setActionNotes('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update alert status');
    } finally {
      setIsUpdating(false);
    }
  };

  const getPriorityBadge = (p: MonitoringAlert['priorityTier']) => {
    switch (p) {
      case 'CRITICAL':
        return <Badge variant="critical">Critical</Badge>;
      case 'HIGH':
        return <Badge variant="danger">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">Medium</Badge>;
      default:
        return <Badge variant="neutral">Low</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-2xs flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {getPriorityBadge(alert.priorityTier)}
              <span className="text-xs font-mono font-semibold text-slate-600">
                Score: {alert.priorityScore}/100
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-200/80 text-slate-800">
                Status: {alert.status}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              {alert.title}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span>
                Subject: <strong className="text-indigo-700">{alert.subjectName}</strong>
              </span>
              <span>•</span>
              <span>
                Case ID: <strong className="text-slate-800">{alert.caseId}</strong>
              </span>
              <span>•</span>
              <span className="text-slate-400">
                {new Date(alert.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Direct Deep-Links Toolbar */}
        <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-indigo-950 font-medium">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>Deep Links:</span>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToCase && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToCase(alert.caseId);
                  onClose();
                }}
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 bg-white px-2 py-1 rounded border border-indigo-200"
              >
                <span>Jump to Case {alert.caseId}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            {alert.articleId && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Article: {alert.articleId.slice(0, 10)}...
              </span>
            )}
          </div>
        </div>

        {/* Sub-Navigation Tabs within Drawer */}
        <div className="flex border-b border-slate-200 bg-white px-4 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('what-changed')}
            className={`py-2.5 px-3 border-b-2 font-semibold transition-colors ${
              activeTab === 'what-changed'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            What Changed? (Delta)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('why-review')}
            className={`py-2.5 px-3 border-b-2 font-semibold transition-colors ${
              activeTab === 'why-review'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Why Review This? (Priority Engine)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('prior-decision')}
            className={`py-2.5 px-3 border-b-2 font-semibold transition-colors ${
              activeTab === 'prior-decision'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Prior Disposition
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {errorMessage && (
            <div className="p-3 text-xs text-rose-800 bg-rose-50 rounded border border-rose-200">
              {errorMessage}
            </div>
          )}

          {activeTab === 'what-changed' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Ingestion Delta Summary
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {alert.deltaExplanation}
                </p>
                <div className="pt-2 flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500">Alert Type:</span>
                  <span className="font-bold text-slate-900">{alert.alertType}</span>
                </div>
              </div>

              {/* Before and After Comparison */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Before vs After Version Comparison</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Previous Cleared Baseline
                    </span>
                    <div className="mt-2 space-y-1.5 text-slate-700">
                      <div>
                        <strong>Prior Finding:</strong>{' '}
                        <span className="text-emerald-700 font-semibold">CLEARED / FALSE_POSITIVE</span>
                      </div>
                      <div>
                        <strong>Recorded Disposition:</strong>{' '}
                        <p className="text-[11px] text-slate-600 italic">
                          "{alert.priorDecisionSummary || 'Subject cleared during initial onboarding screening with no confirmed adverse media.'}"
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/40">
                    <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wide">
                      Newly Ingested State
                    </span>
                    <div className="mt-2 space-y-1.5 text-slate-800">
                      <div>
                        <strong>Required Action:</strong>{' '}
                        <span className="text-indigo-900 font-bold">
                          {alert.requiredAction}
                        </span>
                      </div>
                      <div>
                        <strong>Reopening Rationale:</strong>{' '}
                        <p className="text-[11px] text-slate-700">
                          Fresh adverse media updates invalidates previous clearance fingerprint due to new legal developments.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Delta Interpretation Note */}
              <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>AI Interpretation Guardrails (Section 7)</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  AI may suggest classifications and summarize deltas, but deterministic rules govern suppression, trigger creation, and priority. AI will not close alerts or make dispositions.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'why-review' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950">
                    Priority Score Breakdown (AM-59)
                  </span>
                  <span className="font-mono font-extrabold text-sm text-indigo-900">
                    {alert.priorityScore} / 100 ({alert.priorityTier})
                  </span>
                </div>
                <p className="text-[11px] text-indigo-800">
                  Priority is calculated from customer risk, severity, legal status, evidence strength, relationship relevance, and recency.
                </p>
              </div>

              {alert.priorityAssessment && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900">Weighted Risk Factors</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded border border-slate-200 bg-white">
                      <span className="text-slate-500 text-[11px]">Severity Contribution</span>
                      <div className="font-semibold text-slate-800 mt-0.5">
                        {alert.priorityAssessment.contributingFactors?.find((f) => f.factorName === 'adverse_media_severity')?.pointsAwarded || 15} pts
                      </div>
                    </div>
                    <div className="p-2.5 rounded border border-slate-200 bg-white">
                      <span className="text-slate-500 text-[11px]">Customer Risk Level</span>
                      <div className="font-semibold text-slate-800 mt-0.5">
                        {alert.priorityAssessment.contributingFactors?.find((f) => f.factorName === 'customer_risk_rating')?.pointsAwarded || 12} pts
                      </div>
                    </div>
                    <div className="p-2.5 rounded border border-slate-200 bg-white">
                      <span className="text-slate-500 text-[11px]">Evidence Strength</span>
                      <div className="font-semibold text-slate-800 mt-0.5">
                        {alert.priorityAssessment.contributingFactors?.find((f) => f.factorName === 'evidence_strength')?.pointsAwarded || 15} pts
                      </div>
                    </div>
                    <div className="p-2.5 rounded border border-slate-200 bg-white">
                      <span className="text-slate-500 text-[11px]">Procedural Materiality</span>
                      <div className="font-semibold text-slate-800 mt-0.5">
                        {alert.priorityAssessment.contributingFactors?.find((f) => f.factorName === 'material_update_category')?.pointsAwarded || 15} pts
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1.5 text-xs">
                <span className="font-bold text-slate-900">Mandated Action</span>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {alert.requiredAction}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'prior-decision' && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Previous Cleared Finding</span>
                  <Badge variant="success">Cleared</Badge>
                </div>
                <div className="text-slate-700 space-y-1 text-xs">
                  <div>
                    <strong>Prior Disposition:</strong> FALSE_POSITIVE
                  </div>
                  <div>
                    <strong>Summary on Record:</strong>{' '}
                    {alert.priorDecisionSummary || 'Subject previously cleared during initial customer onboarding.'}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 text-xs text-amber-900 space-y-1">
                <span className="font-bold">Why was this unsuppressed / reopened?</span>
                <p className="text-[11px] leading-relaxed">
                  Section AM-56 suppression safeguards dictate that when material updates (e.g. criminal charges, convictions, or corroborated identities) occur, prior clearance cannot suppress new alerts.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action / Adjudication Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Analyst Review Notes:
            </label>
            <input
              type="text"
              placeholder="Enter review notes before updating status..."
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 bg-white"
            />
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div className="flex items-center gap-1.5">
              {alert.status === 'NEW' && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleUpdateStatus('INVESTIGATING')}
                  disabled={isUpdating}
                >
                  Start Investigation
                </Button>
              )}
              {alert.status !== 'ESCALATED' && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleUpdateStatus('ESCALATED')}
                  disabled={isUpdating}
                >
                  Escalate Alert
                </Button>
              )}
              {alert.status !== 'CLEARED' && (
                <Button
                  variant="primary"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleUpdateStatus('CLEARED')}
                  disabled={isUpdating}
                >
                  Clear Alert
                </Button>
              )}
              {alert.status !== 'CONVERTED_TO_CASE' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-600 hover:text-slate-900"
                  onClick={() => handleUpdateStatus('CONVERTED_TO_CASE')}
                  disabled={isUpdating}
                >
                  Convert to Case
                </Button>
              )}
            </div>

            <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

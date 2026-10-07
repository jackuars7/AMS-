import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  Filter,
  History,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Undo2,
} from 'lucide-react';
import { SuppressionDecision, UserRole } from '../../types/index.ts';
import { Badge } from '../common/Badge.tsx';
import { Button } from '../common/Button.tsx';
import { Modal } from '../common/Modal.tsx';
import { apiClient } from '../../lib/api-client.ts';

interface SuppressionHistoryViewProps {
  suppressions: SuppressionDecision[];
  activeRole: UserRole;
  filterMode?: 'all' | 'reopened-only';
  onRefresh: () => void;
  onNavigateToCase?: (caseId: string) => void;
}

export const SuppressionHistoryView: React.FC<SuppressionHistoryViewProps> = ({
  suppressions,
  activeRole,
  filterMode = 'all',
  onRefresh,
  onNavigateToCase,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForReopen, setSelectedForReopen] = useState<SuppressionDecision | null>(null);
  const [reopenReason, setReopenReason] = useState('New adverse media corroboration requires re-investigation');
  const [isReopening, setIsReopening] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = suppressions.filter((s) => {
    if (filterMode === 'reopened-only' && !s.isReopened) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.caseReference.toLowerCase().includes(q) ||
        s.subjectName.toLowerCase().includes(q) ||
        s.priorRationale.toLowerCase().includes(q) ||
        s.ruleId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleReopen = async () => {
    if (!selectedForReopen) return;
    setIsReopening(true);
    setFeedback(null);
    try {
      const res = await apiClient.reopenSuppressedItem(selectedForReopen.id, reopenReason);
      setFeedback(`Suppression reversed successfully! Created monitoring alert ${res.alert.id} with priority ${res.alert.priorityTier}.`);
      setSelectedForReopen(null);
      onRefresh();
    } catch (err: any) {
      setFeedback(`Failed to reopen item: ${err.message}`);
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Safeguard Banner */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-slate-900">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>AM-56 Suppression Safeguards & Immutability Guarantee</span>
        </div>
        <p className="text-slate-600 leading-relaxed">
          Suppressed items do not delete evidence or decisions. Versioned policy criteria, prior fingerprints, rationales, and historical decision dates are permanently preserved. Any finding can be reopened when new criteria or material updates emerge.
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search suppression history by subject, case, rationale..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-slate-300 bg-white"
          />
        </div>

        <Button variant="secondary" size="sm" onClick={onRefresh} className="text-xs h-7 px-2.5">
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>

      {feedback && (
        <div className="p-3 text-xs bg-indigo-50 border border-indigo-200 rounded-md text-indigo-900">
          {feedback}
        </div>
      )}

      {/* Suppressions Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 bg-white border border-slate-200 rounded-lg">
          <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No suppression records found</p>
          <p className="text-xs text-slate-500">
            Records appear here when unchanged cleared results match versioned policy suppression rules.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden bg-white border border-slate-200 rounded-lg shadow-2xs">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Subject & Case</th>
                <th className="py-2.5 px-3">Rule & Version</th>
                <th className="py-2.5 px-3">Preserved Prior Disposition</th>
                <th className="py-2.5 px-3">Execution Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 align-top">
                    <div className="font-bold text-slate-900">{item.subjectName}</div>
                    <div className="text-[11px] text-indigo-600 font-medium">
                      Case: {item.caseReference}
                    </div>
                    {item.priorFingerprint && (
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        FP: {item.priorFingerprint}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-3 align-top whitespace-nowrap">
                    <div className="font-semibold text-slate-800">{item.ruleId}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Version: {item.ruleVersion}
                    </div>
                  </td>

                  <td className="py-3 px-3 align-top">
                    <div className="space-y-0.5">
                      <span className="inline-block text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                        {item.priorDisposition}
                      </span>
                      <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                        "{item.priorRationale}"
                      </p>
                    </div>
                  </td>

                  <td className="py-3 px-3 align-top whitespace-nowrap text-slate-600">
                    <div>{new Date(item.executedAt).toLocaleDateString()}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(item.executedAt).toLocaleTimeString()}
                    </div>
                  </td>

                  <td className="py-3 px-3 align-top whitespace-nowrap">
                    {item.isReopened ? (
                      <Badge variant="critical">Reopened</Badge>
                    ) : (
                      <Badge variant="success">Suppressed</Badge>
                    )}
                  </td>

                  <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                    {!item.isReopened ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => setSelectedForReopen(item)}
                      >
                        <Undo2 className="w-3 h-3 mr-1 text-indigo-600" />
                        Reopen
                      </Button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        Reopened: {item.reopenedReason || 'Material update'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reopen Adjudication Modal */}
      {selectedForReopen && (
        <Modal
          isOpen={!!selectedForReopen}
          onClose={() => setSelectedForReopen(null)}
          title={`Reopen Finding for Subject: ${selectedForReopen.subjectName}`}
          description="AM-56: Reopen a previously suppressed finding for 4-eyes re-investigation when new evidence or criteria emerge."
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedForReopen(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleReopen}
                disabled={isReopening || !reopenReason.trim()}
              >
                {isReopening ? 'Reopening...' : 'Confirm & Create Alert'}
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <div>
                <strong>Case Reference:</strong> {selectedForReopen.caseReference}
              </div>
              <div>
                <strong>Original Disposition:</strong> {selectedForReopen.priorDisposition}
              </div>
              <div>
                <strong>Original Rationale:</strong> "{selectedForReopen.priorRationale}"
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">
                Audited Justification for Reopening:
              </label>
              <textarea
                rows={3}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                placeholder="Explain the new evidence, corroboration, or compliance reason to reopen this item..."
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

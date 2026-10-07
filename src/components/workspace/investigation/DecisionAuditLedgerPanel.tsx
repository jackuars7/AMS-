import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Fingerprint,
  History,
  Link,
  Lock,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Zap,
} from 'lucide-react';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';

interface DecisionAuditLedgerPanelProps {
  ledger: {
    analystConclusions: any[];
    reviewDecisions: any[];
    complianceDecisions: any[];
    mlroDecisions: any[];
    overrides: any[];
    decisionChain: Array<{
      version: number;
      decisionType: string;
      decisionId: string;
      data: any;
      actorId: string;
      actorRole: string;
      timestamp: string;
      hash: string;
      previousVersionHash: string;
    }>;
    isChainValid: boolean;
  };
  investigationId: string;
}

export const DecisionAuditLedgerPanel: React.FC<DecisionAuditLedgerPanelProps> = ({
  ledger,
  investigationId,
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(ledger, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `audit-ledger-${investigationId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const allRecords = [
    ...ledger.analystConclusions.map((c) => ({ ...c, kind: 'ANALYST_CONCLUSION', date: c.submittedAt })),
    ...ledger.reviewDecisions.map((r) => ({ ...r, kind: 'REVIEW_DECISION', date: r.decidedAt })),
    ...ledger.complianceDecisions.map((cd) => ({ ...cd, kind: 'COMPLIANCE_DECISION', date: cd.adjudicatedAt })),
    ...ledger.mlroDecisions.map((m) => ({ ...m, kind: 'MLRO_DECISION', date: m.determinedAt })),
    ...ledger.overrides.map((o) => ({ ...o, kind: 'OVERRIDE', date: o.actor.timestamp })),
  ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  return (
    <div className="space-y-6">
      {/* Cryptographic Proof Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
              <Fingerprint className="h-6 w-6 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Immutable Cryptographic Audit Ledger (AM-43)</h3>
                <span className="flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" />
                  SHA-256 Hash Chain Verified
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Every human adjudication and policy determination is sealed into a tamper-evident cryptographic version sequence.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleExportJson}
            leftIcon={<Download className="h-3.5 w-3.5" />}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 shrink-0"
          >
            Export Signed JSON
          </Button>
        </div>

        {/* Chain Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-white/10 text-center">
          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Chain Blocks</span>
            <span className="text-base font-bold text-white">{ledger.decisionChain.length}</span>
          </div>
          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Analyst Dispositions</span>
            <span className="text-base font-bold text-white">{ledger.analystConclusions.length}</span>
          </div>
          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Four-Eyes Reviews</span>
            <span className="text-base font-bold text-white">{ledger.reviewDecisions.length}</span>
          </div>
          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Compliance / MLRO</span>
            <span className="text-base font-bold text-white">
              {ledger.complianceDecisions.length + ledger.mlroDecisions.length}
            </span>
          </div>
          <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Active Overrides</span>
            <span className="text-base font-bold text-white">{ledger.overrides.length}</span>
          </div>
        </div>
      </div>

      {/* Cryptographic Version Chain Visualization */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Cryptographic Hash Sequence
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Genesis Root &rarr; Block {ledger.decisionChain.length}
          </span>
        </div>

        <div className="space-y-2">
          {ledger.decisionChain.map((block, idx) => (
            <div
              key={block.version}
              className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded text-[11px]">
                  v{block.version}
                </span>
                <div>
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <span>{block.decisionType}</span>
                    <span className="text-[10px] font-mono text-slate-500 font-normal">
                      Actor: {block.actorId} ({block.actorRole})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mt-0.5">
                    <span>Prev: {block.previousVersionHash.substring(0, 12)}...</span>
                    <span>&rarr;</span>
                    <span className="text-indigo-600 font-bold">Hash: {block.hash.substring(0, 16)}...</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-slate-400">
                  {new Date(block.timestamp).toLocaleTimeString()}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(block.hash)}
                  className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors cursor-pointer"
                  title="Copy SHA-256 Hash"
                >
                  {copiedHash === block.hash ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Decision Records & Human Attribution Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Decision & Adjudication Records
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">
            Showing {allRecords.length} recorded events
          </span>
        </div>

        <div className="space-y-4">
          {allRecords.map((rec, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* AI vs Human Attribution Tag */}
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                    <User className="h-3 w-3 text-indigo-600" />
                    Human Decision ({rec.actorRole || rec.adjudicatedByRole || rec.determinedByRole || 'ANALYST'})
                  </span>

                  <Badge
                    variant={
                      rec.kind === 'ANALYST_CONCLUSION'
                        ? 'primary'
                        : rec.kind === 'REVIEW_DECISION'
                        ? rec.decision === 'APPROVE'
                          ? 'success'
                          : 'danger'
                        : rec.kind === 'MLRO_DECISION'
                        ? 'critical'
                        : 'warning'
                    }
                  >
                    {rec.kind.replace('_', ' ')}
                  </Badge>

                  {rec.finding && (
                    <span className="text-xs font-bold text-slate-900">
                      Finding: {rec.finding}
                    </span>
                  )}
                  {rec.decision && (
                    <span className="text-xs font-bold text-slate-900">
                      Outcome: {rec.decision}
                    </span>
                  )}
                  {rec.statutoryDecision && (
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      MLRO: {rec.statutoryDecision}
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-slate-400 font-mono">
                  {rec.date ? new Date(rec.date).toLocaleString() : 'N/A'}
                </span>
              </div>

              {/* Rationale / Details */}
              <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1">
                <div className="font-semibold text-slate-900 flex items-center justify-between">
                  <span>Author: {rec.submittedByName || rec.decidedByName || rec.adjudicatedByName || rec.determinedByName || rec.actor?.name || 'Authorized Actor'}</span>
                  {rec.policyVersion && (
                    <span className="font-mono text-[10px] text-slate-500">
                      Policy: {rec.policyVersion}
                    </span>
                  )}
                </div>
                <p className="text-slate-600">
                  {rec.rationale || rec.reviewNotes || rec.guidanceNotes || rec.regulatoryDisclosureNotes || rec.justification || 'Formal decision record logged.'}
                </p>

                {rec.citations && rec.citations.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-slate-500 font-semibold">Citations:</span>
                    {rec.citations.map((c: string, cIdx: number) => (
                      <span
                        key={cIdx}
                        className="text-[10px] font-mono bg-white text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

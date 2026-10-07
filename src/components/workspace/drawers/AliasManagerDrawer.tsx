import React, { useState } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  Globe,
  Languages,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { Alias, AliasState, AliasType, Subject, UserRole } from '../../../types/index.ts';
import { Alert } from '../../common/Alert.tsx';
import { Badge, BadgeVariant } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';
import { Drawer } from '../../common/Drawer.tsx';

interface AliasManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  activeRole: UserRole;
  onAddAlias: (subjectId: string, data: any) => Promise<void>;
  onSuggestAI: (subjectId: string) => Promise<void>;
  onUpdateStatus: (aliasId: string, newState: AliasState, reason?: string) => Promise<void>;
  isSuggestingAI?: boolean;
}

export const AliasManagerDrawer: React.FC<AliasManagerDrawerProps> = ({
  isOpen,
  onClose,
  subject,
  activeRole,
  onAddAlias,
  onSuggestAI,
  onUpdateStatus,
  isSuggestingAI = false,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [aliasName, setAliasName] = useState('');
  const [aliasType, setAliasType] = useState<AliasType>('TRANSLITERATION');
  const [script, setScript] = useState('LATN');
  const [source, setSource] = useState('Analyst Entry');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!subject) return null;

  const handleCreateAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aliasName.trim()) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await onAddAlias(subject.id, {
        aliasName: aliasName.trim(),
        aliasType,
        script,
        source,
        confidence: 0.95,
      });
      setAliasName('');
      setShowAddForm(false);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (aliasId: string) => {
    setActionError(null);
    try {
      await onUpdateStatus(aliasId, 'APPROVED');
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleReject = async (aliasId: string) => {
    setActionError(null);
    try {
      await onUpdateStatus(aliasId, 'REJECTED', 'Rejected by compliance reviewer');
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const stateBadgeMap: Record<AliasState, BadgeVariant> = {
    APPROVED: 'success',
    PENDING_APPROVAL: 'warning',
    SOURCED: 'info',
    GENERATED: 'primary',
    ANALYST_ADDED: 'primary',
    REJECTED: 'danger',
    RETIRED: 'neutral',
  };

  const approvedAliases = subject.aliases.filter((a) => a.state === 'APPROVED');
  const pendingAliases = subject.aliases.filter((a) => a.state === 'PENDING_APPROVAL');
  const rejectedAliases = subject.aliases.filter((a) => a.state === 'REJECTED' || a.state === 'RETIRED');

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Name & Alias Management (AM-03)"
      subtitle={`Subject: ${subject.primaryName} • Script Transliteration & Approval Controls`}
      width="xl"
    >
      <div className="space-y-5">
        {/* Error Alert if action failed */}
        {actionError && (
          <Alert type="error" title="Action Prohibited by Policy or Authorization">
            {actionError}
          </Alert>
        )}

        {/* AI Safety Banner */}
        <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>AI Name Transliteration Engine</span>
            </div>
            <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded">
              Human-in-the-Loop Enforced
            </span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            AI-suggested aliases generate multi-script representations (Cyrillic, Arabic, legal variants)
            into an immutable <strong>PENDING_APPROVAL</strong> state. Under strict AML governance, no
            AI-suggested name enters the production search pipeline until verified and approved by an
            authorized human reviewer.
          </p>
          <div className="pt-1 flex items-center justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onSuggestAI(subject.id)}
              isLoading={isSuggestingAI}
              leftIcon={<Bot className="h-3.5 w-3.5 text-indigo-300" />}
              className="bg-indigo-600 hover:bg-indigo-500 text-white border-none shadow-xs text-xs"
            >
              Generate AI Transliterations
            </Button>
          </div>
        </div>

        {/* Primary Name Display */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wide text-slate-400 block">
              Primary Golden Record Name
            </span>
            <span className="font-bold text-slate-900 text-sm">{subject.primaryName}</span>
          </div>
          <Badge variant="success" size="sm">
            Primary / Sourced
          </Badge>
        </div>

        {/* Add Alias Button & Form */}
        <div>
          {!showAddForm ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              className="w-full text-xs"
            >
              Add Manual Name Variant or Transliteration
            </Button>
          ) : (
            <form
              onSubmit={handleCreateAlias}
              className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-3 text-xs"
            >
              <div className="flex items-center justify-between font-semibold text-slate-800">
                <span>Add Sourced or Analyst Name Variant</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Name Variant / Alias</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maximilian A. Vance or Cyrillic script"
                  value={aliasName}
                  onChange={(e) => setAliasName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 text-xs focus:outline-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Variant Type</label>
                  <select
                    value={aliasType}
                    onChange={(e) => setAliasType(e.target.value as AliasType)}
                    className="w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 text-xs focus:outline-indigo-600"
                  >
                    <option value="TRANSLITERATION">Transliteration</option>
                    <option value="FORMER_NAME">Former Name</option>
                    <option value="LEGAL_NAME_VARIANT">Legal Name Variant</option>
                    <option value="COMMON_NAME">Common Name</option>
                    <option value="INITIALS">Initials</option>
                    <option value="MAIDEN_NAME">Maiden Name</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Writing Script</label>
                  <select
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 text-xs focus:outline-indigo-600"
                  >
                    <option value="LATN">Latin (LATN)</option>
                    <option value="CYRL">Cyrillic (CYRL)</option>
                    <option value="ARAB">Arabic (ARAB)</option>
                    <option value="HANI">Hanzi / Chinese (HANI)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                  Save Variant
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Awaiting Review / Pending Aliases (AM-03 & AI Guardrail) */}
        {pendingAliases.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Awaiting Human Authorization ({pendingAliases.length})
              </h5>
              <span className="text-[11px] text-slate-500 font-normal">
                Exempt from search until approved
              </span>
            </div>

            <div className="space-y-2">
              {pendingAliases.map((alias) => (
                <div
                  key={alias.id}
                  className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm font-mono">
                        {alias.aliasName}
                      </span>
                      <Badge variant="warning" size="sm">
                        {alias.aliasType ? alias.aliasType.replace(/_/g, ' ') : 'ALIAS'}
                      </Badge>
                      <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200 text-slate-600">
                        {alias.script}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                      <span>Source: {alias.source}</span>
                      <span>•</span>
                      <span>Confidence: {Math.round(alias.confidence * 100)}%</span>
                      <span>•</span>
                      <span>Added by: {alias.addedByName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApprove(alias.id)}
                      leftIcon={<Check className="h-3 w-3" />}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1 px-2.5 min-h-[28px]"
                      title="Approve alias for screening (Requires Checker/Compliance role)"
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(alias.id)}
                      leftIcon={<X className="h-3 w-3" />}
                      className="text-xs py-1 px-2 min-h-[28px] text-rose-700 hover:bg-rose-50"
                      title="Reject alias"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved Production Aliases */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Approved Screening Aliases ({approvedAliases.length})
            </h5>
            <span className="text-[11px] text-slate-500 font-normal">
              Active in search query orchestration
            </span>
          </div>

          {approvedAliases.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
              No additional approved aliases. Only the primary name is screened.
            </p>
          ) : (
            <div className="space-y-2">
              {approvedAliases.map((alias) => (
                <div
                  key={alias.id}
                  className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm font-mono">
                        {alias.aliasName}
                      </span>
                      <Badge variant="success" size="sm">
                        {alias.aliasType ? alias.aliasType.replace(/_/g, ' ') : 'ALIAS'}
                      </Badge>
                      <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                        {alias.script}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                      <span>Source: {alias.source}</span>
                      <span>•</span>
                      <span>Approved by: {alias.approvedByName || 'Authorized Reviewer'}</span>
                      {alias.approvedAt && (
                        <>
                          <span>•</span>
                          <span>At: {new Date(alias.approvedAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUpdateStatus(alias.id, 'RETIRED')}
                    className="text-slate-400 hover:text-slate-600 text-xs p-1"
                    title="Retire alias from active screening"
                  >
                    Retire
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rejected / Retired Aliases */}
        {rejectedAliases.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Rejected or Retired Records ({rejectedAliases.length})
            </h5>
            <div className="space-y-1.5 opacity-75">
              {rejectedAliases.map((alias) => (
                <div
                  key={alias.id}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-600 line-through">{alias.aliasName}</span>
                    <Badge variant={alias.state === 'REJECTED' ? 'danger' : 'neutral'} size="sm">
                      {alias.state}
                    </Badge>
                  </div>
                  {alias.rejectionReason && (
                    <span className="text-[11px] text-slate-500">{alias.rejectionReason}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};

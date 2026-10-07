import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Lock,
  Plus,
  ShieldAlert,
  User,
} from 'lucide-react';
import { InvestigationTask, RoleId, TaskPriority, TaskStatus, TaskType } from '../../../types/index.ts';
import { Badge } from '../../common/Badge.tsx';
import { Button } from '../../common/Button.tsx';

interface TasksManagementPanelProps {
  tasks: InvestigationTask[];
  onCompleteTask: (taskId: string, evidence: { notes: string; documentLinks?: string[] }) => Promise<void>;
  onCreateTask: (taskData: {
    taskType: TaskType;
    title: string;
    description: string;
    dueDate: string;
    priority: TaskPriority;
    dependencies?: string[];
  }) => Promise<void>;
  onUpdateStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  isProcessing?: boolean;
}

export const TasksManagementPanel: React.FC<TasksManagementPanelProps> = ({
  tasks,
  onCompleteTask,
  onCreateTask,
  onUpdateStatus,
  isProcessing = false,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidenceLinks, setEvidenceLinks] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTaskType, setNewTaskType] = useState<TaskType>('DOCUMENT_COLLECTION');
  const [newPriority, setNewPriority] = useState<TaskPriority>('MEDIUM');
  const [newDueDate, setNewDueDate] = useState(
    new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
  );
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'PENDING') return t.status !== 'COMPLETED' && t.status !== 'CANCELLED';
    return t.status === filterStatus;
  });

  const handleOpenCompleteModal = (taskId: string) => {
    setCompletingTaskId(taskId);
    setEvidenceNotes('');
    setEvidenceLinks('');
    setFormError(null);
  };

  const handleConfirmCompletion = async () => {
    if (!completingTaskId) return;
    if (evidenceNotes.trim().length < 10) {
      setFormError('Completion requires explanatory evidence notes (minimum 10 characters).');
      return;
    }

    try {
      const links = evidenceLinks
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      await onCompleteTask(completingTaskId, {
        notes: evidenceNotes.trim(),
        documentLinks: links,
      });
      setCompletingTaskId(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to complete task.');
    }
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      setFormError('Title and description are required.');
      return;
    }

    try {
      await onCreateTask({
        taskType: newTaskType,
        title: newTitle.trim(),
        description: newDescription.trim(),
        dueDate: new Date(newDueDate).toISOString(),
        priority: newPriority,
        dependencies: selectedDependencies,
      });
      setIsCreateOpen(false);
      setNewTitle('');
      setNewDescription('');
      setSelectedDependencies([]);
      setFormError(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create task.');
    }
  };

  const pendingCount = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length;
  const overdueCount = tasks.filter((t) => t.isOverdue && t.status !== 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Header with Metrics & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Investigation Task Management (AM-44)</h3>
            <span className="text-xs bg-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded-full">
              {tasks.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enforce task ownership, dependency prerequisites, overdue SLAs, and mandatory completion evidence before disposition.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
              <Clock className="h-3.5 w-3.5" />
              {overdueCount} Overdue
            </span>
          )}
          <span className="text-xs font-medium text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            {pendingCount} Pending
          </span>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Create Task
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {['ALL', 'PENDING', 'OPEN', 'BLOCKED', 'COMPLETED'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              filterStatus === st
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Task Cards List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
            No tasks found matching filter &ldquo;{filterStatus}&rdquo;.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isBlocked = task.status === 'BLOCKED';
            const isCompleted = task.status === 'COMPLETED';
            const isOverdue = task.isOverdue && !isCompleted;

            return (
              <div
                key={task.id}
                className={`p-4 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-slate-50/70 border-slate-200 opacity-90'
                    : isBlocked
                    ? 'bg-amber-50/40 border-amber-200'
                    : isOverdue
                    ? 'bg-rose-50/30 border-rose-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                } shadow-2xs`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {task.taskType.replace('_', ' ')}
                      </span>
                      <h4
                        className={`text-sm font-semibold ${
                          isCompleted ? 'line-through text-slate-500' : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </h4>
                      <Badge
                        variant={
                          isCompleted
                            ? 'success'
                            : isBlocked
                            ? 'warning'
                            : task.priority === 'URGENT'
                            ? 'critical'
                            : task.priority === 'HIGH'
                            ? 'danger'
                            : 'neutral'
                        }
                      >
                        {task.status}
                      </Badge>
                      {isOverdue && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-100/80 px-1.5 py-0.5 rounded">
                          OVERDUE
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600">{task.description}</p>

                    {/* Dependencies metadata */}
                    {task.dependencies && task.dependencies.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-100/60 px-2 py-1 rounded">
                        <Lock className="h-3 w-3" />
                        <span>Prerequisites: {task.dependencies.join(', ')}</span>
                      </div>
                    )}

                    {/* Completion Evidence if completed */}
                    {task.completionEvidence && (
                      <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Completion Evidence ({task.completionEvidence.completedByName}):</span>
                        </div>
                        <p className="text-[11px] italic">&ldquo;{task.completionEvidence.notes}&rdquo;</p>
                        {task.completionEvidence.documentLinks && task.completionEvidence.documentLinks.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {task.completionEvidence.documentLinks.map((link, idx) => (
                              <a
                                key={idx}
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-[10px] text-indigo-600 hover:underline bg-white px-2 py-0.5 rounded border border-indigo-200"
                              >
                                <ExternalLink className="h-2.5 w-2.5" />
                                {link}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right side: Owner, Due Date, and Actions */}
                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {task.ownerName} ({task.ownerRole})
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      {!isCompleted && !isBlocked && (
                        <Button
                          size="xs"
                          variant="primary"
                          onClick={() => handleOpenCompleteModal(task.id)}
                          leftIcon={<FileCheck className="h-3 w-3" />}
                        >
                          Complete Task
                        </Button>
                      )}
                      {isBlocked && (
                        <span className="text-[11px] text-amber-700 italic">
                          Blocked by prerequisite tasks
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Completion Evidence Modal */}
      {completingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <FileCheck className="h-5 w-5 text-indigo-600" />
              <h3 className="text-base font-bold">Submit Task Completion Evidence (AM-44)</h3>
            </div>
            <p className="text-xs text-slate-500">
              Enterprise policy mandates explanatory factual evidence before resolving investigation tasks.
            </p>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Evidence Notes & Findings (Mandatory)
                </label>
                <textarea
                  rows={3}
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  placeholder="Detail the verified facts, external registry checks, or interview findings..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Links & Registries (One URL per line, optional)
                </label>
                <textarea
                  rows={2}
                  value={evidenceLinks}
                  onChange={(e) => setEvidenceLinks(e.target.value)}
                  placeholder="https://court-records.gov/cases/2026-0912&#10;https://regulator.ch/decree-492"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCompletingTaskId(null)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleConfirmCompletion}
                isLoading={isProcessing}
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              >
                Confirm Completion
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateTaskSubmit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-2 text-slate-900">
              <Plus className="h-5 w-5 text-indigo-600" />
              <h3 className="text-base font-bold">Create Investigation Task (AM-44)</h3>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Verify Swiss commercial registry litigation record"
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Task Type</label>
                <select
                  value={newTaskType}
                  onChange={(e) => setNewTaskType(e.target.value as TaskType)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="DOCUMENT_COLLECTION">Document Collection</option>
                  <option value="SUBJECT_OUTREACH">Subject Outreach</option>
                  <option value="ENHANCED_DUE_DILIGENCE">Enhanced Due Diligence (EDD)</option>
                  <option value="LAW_ENFORCEMENT_CHECK">Law Enforcement Check</option>
                  <option value="COURT_RECORD_RETRIEVAL">Court Record Retrieval</option>
                  <option value="SOURCE_AUTHENTICATION">Source Authentication</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the specific objectives and required evidence..."
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {tasks.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prerequisite Dependencies (Optional)
                  </label>
                  <select
                    multiple
                    value={selectedDependencies}
                    onChange={(e) =>
                      setSelectedDependencies(
                        Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value)
                      )
                    }
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 h-20 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.status})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400">Hold Ctrl/Cmd to select multiple.</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setIsCreateOpen(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                variant="primary"
                isLoading={isProcessing}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Create Task
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

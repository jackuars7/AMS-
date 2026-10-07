/**
 * Task Service (AM-44)
 * Investigation task management, dependencies, reassignment, completion evidence, and overdue tracking.
 */

import {
  InvestigationTask,
  RoleId,
  TaskCompletionEvidence,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '../../types/index.ts';

export class TaskService {
  public tasks: Map<string, InvestigationTask> = new Map();

  /**
   * Create an investigation task.
   */
  public createTask(
    taskData: {
      investigationId: string;
      caseId: string;
      subjectId: string;
      eventId?: string;
      taskType: TaskType;
      title: string;
      description: string;
      ownerId: string;
      ownerName: string;
      ownerRole: RoleId;
      dueDate: string;
      priority: TaskPriority;
      dependencies?: string[];
    }
  ): InvestigationTask {
    const id = `tsk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const isOverdue = new Date(taskData.dueDate).getTime() < Date.now();

    // If task has uncompleted dependencies, status starts as BLOCKED, else OPEN
    const dependencies = taskData.dependencies || [];
    const hasUnresolvedDeps = dependencies.some((depId) => {
      const dep = this.tasks.get(depId);
      return !dep || dep.status !== 'COMPLETED';
    });

    const task: InvestigationTask = {
      ...taskData,
      id,
      dependencies,
      status: hasUnresolvedDeps ? 'BLOCKED' : 'OPEN',
      reminders: [],
      isOverdue,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(id, task);
    return task;
  }

  /**
   * Complete an investigation task with mandatory evidence.
   */
  public completeTask(
    taskId: string,
    evidence: {
      notes: string;
      documentLinks?: string[];
      actor: { id: string; name: string; role: RoleId };
    }
  ): InvestigationTask {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found.`);
    }

    if (!evidence.notes || evidence.notes.trim().length < 10) {
      throw new Error('Task completion requires explanatory evidence notes (minimum 10 characters).');
    }

    // Check if dependencies are completed
    for (const depId of task.dependencies) {
      const dep = this.tasks.get(depId);
      if (!dep || dep.status !== 'COMPLETED') {
        throw new Error(`Cannot complete task: prerequisite dependency ${dep?.title || depId} is not completed.`);
      }
    }

    const completionEvidence: TaskCompletionEvidence = {
      notes: evidence.notes,
      documentLinks: evidence.documentLinks || [],
      completedBy: evidence.actor.id,
      completedByName: evidence.actor.name,
      completedAt: new Date().toISOString(),
    };

    task.status = 'COMPLETED';
    task.completionEvidence = completionEvidence;
    task.updatedAt = new Date().toISOString();

    // Check other tasks that were BLOCKED on this task
    this.refreshDependentTasks(taskId);

    return task;
  }

  /**
   * Reassign a task to another owner.
   */
  public reassignTask(
    taskId: string,
    newOwner: { id: string; name: string; role: RoleId }
  ): InvestigationTask {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found.`);
    }

    task.ownerId = newOwner.id;
    task.ownerName = newOwner.name;
    task.ownerRole = newOwner.role;
    task.updatedAt = new Date().toISOString();

    return task;
  }

  /**
   * Update task status (e.g. IN_PROGRESS, CANCELLED, COMPLETED).
   */
  public updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    evidence?: { notes: string; documentLinks?: string[] },
    actor?: { id: string; name: string; role: RoleId }
  ): InvestigationTask {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found.`);
    }

    if (status === 'COMPLETED') {
      if (evidence && actor) {
        return this.completeTask(taskId, {
          notes: evidence.notes || 'Task marked completed with evidence.',
          documentLinks: evidence.documentLinks,
          actor,
        });
      } else if (!task.completionEvidence) {
        task.completionEvidence = {
          notes: evidence?.notes || 'Task marked completed by investigator.',
          documentLinks: evidence?.documentLinks || [],
          completedBy: actor?.id || 'system',
          completedByName: actor?.name || 'Investigator',
          completedAt: new Date().toISOString(),
        };
      }
    }

    task.status = status;
    task.updatedAt = new Date().toISOString();

    if (status === 'COMPLETED') {
      this.refreshDependentTasks(taskId);
    }

    return task;
  }

  /**
   * When a task completes, unblock any dependent tasks whose dependencies are now all satisfied.
   */
  private refreshDependentTasks(completedTaskId: string): void {
    for (const task of this.tasks.values()) {
      if (task.status === 'BLOCKED' && task.dependencies.includes(completedTaskId)) {
        const allDepsSatisfied = task.dependencies.every((depId) => {
          const dep = this.tasks.get(depId);
          return dep && dep.status === 'COMPLETED';
        });
        if (allDepsSatisfied) {
          task.status = 'OPEN';
          task.updatedAt = new Date().toISOString();
        }
      }
    }
  }

  /**
   * Get tasks for investigation.
   */
  public getTasksByInvestigation(investigationId: string): InvestigationTask[] {
    const result: InvestigationTask[] = [];
    const now = Date.now();
    for (const task of this.tasks.values()) {
      if (task.investigationId === investigationId) {
        // Update overdue status dynamically
        task.isOverdue = task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && new Date(task.dueDate).getTime() < now;
        result.push(task);
      }
    }
    return result;
  }

  public getTasksForInvestigation(investigationId: string): InvestigationTask[] {
    return this.getTasksByInvestigation(investigationId);
  }

  public getPendingTaskCount(investigationId: string): number {
    return this.getTasksByInvestigation(investigationId).filter(
      (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
    ).length;
  }
}

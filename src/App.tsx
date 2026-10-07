import React, { useEffect, useState } from 'react';
import {
  AdverseMediaArticle,
  Alias,
  AliasState,
  Article,
  AuditEvent,
  KycCase,
  PolicyRule,
  ScreeningObligation,
  ScreeningRun,
  SourceConnector,
  Subject,
  UserRole,
  WorkItem,
} from './types/index.ts';
import { apiClient } from './lib/api-client.ts';
import { AppHeader } from './components/layout/AppHeader.tsx';
import { CaseHeader } from './components/workspace/CaseHeader.tsx';
import { WorkflowNav, WorkflowTab } from './components/workspace/WorkflowNav.tsx';
import { SubjectProfileDrawer } from './components/workspace/drawers/SubjectProfileDrawer.tsx';
import { AliasManagerDrawer } from './components/workspace/drawers/AliasManagerDrawer.tsx';
import { ExemptionModal } from './components/workspace/modals/ExemptionModal.tsx';
import { OverviewArea } from './components/workspace/tabs/OverviewArea.tsx';
import { SubjectsArea } from './components/workspace/tabs/SubjectsArea.tsx';
import { EventsEvidenceArea } from './components/workspace/tabs/EventsEvidenceArea.tsx';
import { InvestigationArea } from './components/workspace/tabs/InvestigationArea.tsx';
import { TasksRequestsArea } from './components/workspace/tabs/TasksRequestsArea.tsx';
import { DecisionsArea } from './components/workspace/tabs/DecisionsArea.tsx';
import { AuditTraceabilityArea } from './components/workspace/tabs/AuditTraceabilityArea.tsx';
import { HomeView } from './components/views/HomeView.tsx';
import { WorkQueueView } from './components/views/WorkQueueView.tsx';
import { CasesListView } from './components/views/CasesListView.tsx';
import { MonitoringView } from './components/views/MonitoringView.tsx';
import { ReportsOversightView } from './components/views/ReportsOversightView.tsx';
import { AdministrationView } from './components/views/AdministrationView.tsx';
import { Alert } from './components/common/Alert.tsx';

export default function App() {
  // Navigation State
  const [activeNavTab, setActiveNavTab] = useState<'home' | 'work-queue' | 'cases' | 'monitoring' | 'reports' | 'administration'>('home');
  const [activeWorkflowTab, setActiveWorkflowTab] = useState<WorkflowTab>('overview');

  // Role Simulator State
  const [activeRole, setActiveRole] = useState<UserRole>('CHECKER');
  const [currentUserId, setCurrentUserId] = useState<string>('USR-CHECKER-01');

  // Core Domain State
  const [cases, setCases] = useState<KycCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [obligations, setObligations] = useState<ScreeningObligation[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [connectors, setConnectors] = useState<SourceConnector[]>([]);
  const [policyRules, setPolicyRules] = useState<PolicyRule[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [screeningRun, setScreeningRun] = useState<ScreeningRun | null>(null);
  const [articles, setArticles] = useState<(Article | AdverseMediaArticle)[]>([]);

  // Drawers & Modals
  const [inspectedSubject, setInspectedSubject] = useState<Subject | null>(null);
  const [managingAliasSubject, setManagingAliasSubject] = useState<Subject | null>(null);
  const [exemptionObligation, setExemptionObligation] = useState<ScreeningObligation | null>(null);

  // Status & Loaders
  const [isLoading, setIsLoading] = useState(true);
  const [bannerNotice, setBannerNotice] = useState<{ type: 'success' | 'warning' | 'info' | 'error'; message: string } | null>(null);
  const [isSuggestingAI, setIsSuggestingAI] = useState(false);
  const [isExecutingScreening, setIsExecutingScreening] = useState(false);
  const [isCompletingCase, setIsCompletingCase] = useState(false);

  // Synchronize actor with apiClient
  useEffect(() => {
    const userId =
      activeRole === 'ANALYST'
        ? 'USR-ANALYST-01'
        : activeRole === 'CHECKER'
        ? 'USR-CHECKER-01'
        : activeRole === 'COMPLIANCE_OFFICER'
        ? 'USR-COMPLIANCE-01'
        : activeRole === 'MLRO'
        ? 'USR-MLRO-01'
        : 'USR-ADMIN-01';
    setCurrentUserId(userId);
    apiClient.setActor(userId, activeRole);
  }, [activeRole]);

  // Load initial dataset
  const loadData = async () => {
    try {
      const [casesRes, queueRes, connRes, rulesRes, auditRes] = await Promise.all([
        apiClient.getCases(),
        apiClient.getWorkQueue(),
        apiClient.getConnectors(),
        apiClient.getPolicyRules(),
        apiClient.getAuditTrail(),
      ]);

      const uniqueCases = Array.from(
        new Map((casesRes || []).map((c) => [c.id, c])).values()
      );
      setCases(uniqueCases);
      setWorkItems(queueRes);
      setConnectors(connRes);
      setPolicyRules(rulesRes);
      setAuditEvents(auditRes);

      const targetCase =
        (selectedCaseId && uniqueCases.find((c) => c.id === selectedCaseId || c.reference === selectedCaseId)) ||
        uniqueCases[0];
      if (targetCase) {
        setSelectedCaseId(targetCase.id);
        await loadCaseDetails(targetCase.id);
      }
    } catch (err: any) {
      console.error('Failed to load application data:', err);
      setBannerNotice({
        type: 'error',
        message: 'Could not connect to AML screening backend: ' + err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCaseDetails = async (caseId: string) => {
    try {
      const [caseDetail, oblRes, subjRes, artRes, runRes] = await Promise.all([
        apiClient.getCase(caseId),
        apiClient.getObligations(caseId),
        apiClient.getSubjects(caseId),
        apiClient.getEnrichedArticles({ caseId }).catch(() => apiClient.getArticles(caseId)),
        apiClient.getScreeningRun(caseId).catch(() => null),
      ]);

      setSelectedCaseId(caseDetail.id || caseId);
      setObligations(oblRes || []);
      setSubjects(subjRes || []);
      setArticles(artRes || []);
      setScreeningRun(runRes);

      // Update case in cases array without duplicate keys
      setCases((prev) => {
        const targetId = caseDetail.id || caseId;
        const exists = prev.some((c) => c.id === targetId);
        if (exists) {
          return prev.map((c) => (c.id === targetId ? caseDetail : c));
        }
        return [...prev, caseDetail];
      });
    } catch (err: any) {
      console.error('Error loading case detail:', err);
    }
  };

  const handleNavigateToCase = async (caseId: string, workflowTab: WorkflowTab = 'overview') => {
    await loadCaseDetails(caseId);
    setActiveNavTab('cases');
    setActiveWorkflowTab(workflowTab);
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeCase = cases.find((c) => c.id === selectedCaseId) || cases[0] || null;

  // Handlers
  const handleOpenCase = async (caseId: string) => {
    await loadCaseDetails(caseId);
    setActiveNavTab('cases');
    setActiveWorkflowTab('overview');
  };

  const handleCreateCase = async (data: any) => {
    const newCase = await apiClient.createCase(data);
    setCases((prev) => [newCase, ...prev]);
    await loadCaseDetails(newCase.id);
    setBannerNotice({
      type: 'success',
      message: `Case ${newCase.reference} created. Screening obligations deterministically generated.`,
    });
  };

  const handleRunScreening = async () => {
    if (!activeCase) return;
    setIsExecutingScreening(true);
    try {
      const run = await apiClient.executeScreening(activeCase.id);
      setScreeningRun(run);
      // Reload articles and case status
      const [newArticles, updatedCase, updatedObligations] = await Promise.all([
        apiClient.getEnrichedArticles({ caseId: activeCase.id }).catch(() => apiClient.getArticles(activeCase.id)),
        apiClient.getCase(activeCase.id),
        apiClient.getObligations(activeCase.id),
      ]);
      setArticles(newArticles);
      setCases((prev) => prev.map((c) => (c.id === activeCase.id ? updatedCase : c)));
      setObligations(updatedObligations);

      setBannerNotice({
        type: run.status === 'PARTIAL_SUCCESS' ? 'warning' : 'success',
        message: `Screening run completed with ${run.overallCoveragePercent}% coverage. Status: ${run.status}.`,
      });
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message });
    } finally {
      setIsExecutingScreening(false);
    }
  };

  const handleRetryConnector = async (connectorId: string, runId: string) => {
    const outcome = await apiClient.retryConnector(connectorId, runId);
    // Reload connectors and screening run
    const [connList, run] = await Promise.all([
      apiClient.getConnectors(),
      activeCase ? apiClient.getScreeningRun(activeCase.id) : Promise.resolve(null),
    ]);
    setConnectors(connList);
    if (run) setScreeningRun(run);

    setBannerNotice({
      type: 'success',
      message: `Connector ${connectorId} retried. Recovered ${outcome.articlesRetrieved} adverse media records.`,
    });
  };

  const handleRetryConnectorDirect = async (connectorId: string) => {
    await apiClient.retryConnectorDirect(connectorId);
    const connList = await apiClient.getConnectors();
    setConnectors(connList);
  };

  const handleAddAlias = async (subjectId: string, data: any) => {
    const newAlias = await apiClient.createAlias(subjectId, data);
    // Reload subjects
    if (activeCase) {
      const subjRes = await apiClient.getSubjects(activeCase.id);
      setSubjects(subjRes);
      if (managingAliasSubject && managingAliasSubject.id === subjectId) {
        setManagingAliasSubject(subjRes.find((s) => s.id === subjectId) || null);
      }
    }
    setBannerNotice({
      type: 'success',
      message: `Alias '${newAlias.aliasName}' added in ${newAlias.state} status.`,
    });
  };

  const handleSuggestAI = async (subjectId: string) => {
    setIsSuggestingAI(true);
    try {
      const suggestions = await apiClient.suggestAliasesAI(subjectId);
      if (activeCase) {
        const subjRes = await apiClient.getSubjects(activeCase.id);
        setSubjects(subjRes);
        if (managingAliasSubject && managingAliasSubject.id === subjectId) {
          setManagingAliasSubject(subjRes.find((s) => s.id === subjectId) || null);
        }
      }
      setBannerNotice({
        type: 'info',
        message: `AI generated ${suggestions.length} candidate transliterations. All placed in PENDING_APPROVAL.`,
      });
    } catch (err: any) {
      setBannerNotice({ type: 'error', message: err.message });
    } finally {
      setIsSuggestingAI(false);
    }
  };

  const handleUpdateAliasStatus = async (aliasId: string, newState: AliasState, reason?: string) => {
    await apiClient.updateAliasStatus(aliasId, newState, reason);
    if (activeCase) {
      const subjRes = await apiClient.getSubjects(activeCase.id);
      setSubjects(subjRes);
      if (managingAliasSubject) {
        setManagingAliasSubject(subjRes.find((s) => s.id === managingAliasSubject.id) || null);
      }
    }
    setBannerNotice({
      type: 'success',
      message: `Alias state updated to ${newState}.`,
    });
  };

  const handleSubmitExemption = async (data: { reasonCode: string; justification: string; evidenceReference: string }) => {
    if (!exemptionObligation) return;
    const updated = await apiClient.requestExemption(exemptionObligation.id, data);
    if (activeCase) {
      const [oblRes, caseRes] = await Promise.all([
        apiClient.getObligations(activeCase.id),
        apiClient.getCase(activeCase.id),
      ]);
      setObligations(oblRes);
      setCases((prev) => prev.map((c) => (c.id === activeCase.id ? caseRes : c)));
    }
    setBannerNotice({
      type: 'info',
      message: `Exemption requested. Obligation placed in PENDING_APPROVAL for 4-eyes review.`,
    });
  };

  const handleAdjudicateExemption = async (obligationId: string, approved: boolean, notes: string) => {
    await apiClient.adjudicateExemption(obligationId, approved, notes);
    if (activeCase) {
      const [oblRes, caseRes] = await Promise.all([
        apiClient.getObligations(activeCase.id),
        apiClient.getCase(activeCase.id),
      ]);
      setObligations(oblRes);
      setCases((prev) => prev.map((c) => (c.id === activeCase.id ? caseRes : c)));
    }
    setBannerNotice({
      type: approved ? 'success' : 'warning',
      message: `Exemption ${approved ? 'APPROVED' : 'REJECTED'}. Audit event recorded.`,
    });
  };

  const handleCompleteCase = async () => {
    if (!activeCase) return;
    setIsCompletingCase(true);
    try {
      const result = await apiClient.completeCase(activeCase.id);
      setCases((prev) => prev.map((c) => (c.id === activeCase.id ? result.case : c)));
      setBannerNotice({
        type: 'success',
        message: 'Case successfully signed off and sealed. All screening obligations confirmed.',
      });
    } catch (err: any) {
      setBannerNotice({
        type: 'error',
        message: `Case completion failed: ${err.message}`,
      });
      throw err;
    } finally {
      setIsCompletingCase(false);
    }
  };

  // Synthetic Test Bench Tour Triggers (1 to 6)
  const handleRunTourStep = async (step: number) => {
    if (!activeCase) return;
    setActiveNavTab('cases');

    if (step === 1) {
      // Test AM-01 Completion Blocker
      setActiveWorkflowTab('decisions');
      setBannerNotice({
        type: 'warning',
        message: 'AM-01 Test: Notice the completion blockers. Attempting sign-off will enforce the mandatory invariant.',
      });
    } else if (step === 2) {
      // Test AM-02 Multi-source subject conflicts
      setActiveWorkflowTab('subjects');
      const subjectWithConflicts = subjects.find((s) => s.hasConflicts) || subjects[0];
      if (subjectWithConflicts) {
        setInspectedSubject(subjectWithConflicts);
      }
      setBannerNotice({
        type: 'info',
        message: 'AM-02 Test: Opened consolidated subject drawer displaying conflicting DOBs from Core Banking vs Registrar.',
      });
    } else if (step === 3) {
      // Test AM-03 AI Transliteration suggestions
      setActiveWorkflowTab('subjects');
      const subjectToManage = subjects[0];
      if (subjectToManage) {
        setManagingAliasSubject(subjectToManage);
      }
      setBannerNotice({
        type: 'info',
        message: 'AM-03 Test: Opened Name & Alias Manager. Click "Generate AI Transliterations" to verify human-in-the-loop gate.',
      });
    } else if (step === 4) {
      // Test AM-05 Deterministic Policy Simulator
      setActiveNavTab('administration');
      setBannerNotice({
        type: 'info',
        message: 'AM-05 Test: Opened Policy Administration. Switch to the Deterministic Simulator tab to test rule evaluations.',
      });
    } else if (step === 5) {
      // Test AM-06 Connector Circuit Breaker
      setActiveWorkflowTab('investigation');
      setBannerNotice({
        type: 'warning',
        message: 'AM-06 Test: Opened Investigation tab. Observe CONN-COURTS-DB circuit breaker is OPEN. Click "Retry Connector" to recover.',
      });
    } else if (step === 6) {
      // Test Segregation of Duties
      setActiveWorkflowTab('tasks-requests');
      setBannerNotice({
        type: 'info',
        message: 'Security & SoD Test: Switch role in the top header to Analyst or Checker to observe self-approval prohibition.',
      });
    }
  };

  // Compile all pending aliases for Tasks & Requests tab
  const allPendingAliases = subjects.flatMap((s) =>
    s.aliases
      .filter((a) => a.state === 'PENDING_APPROVAL')
      .map((a) => ({ alias: a, subjectName: s.primaryName }))
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white antialiased">
      {/* App Header with Global Nav & Role Simulator */}
      <AppHeader
        activeTab={activeNavTab}
        onSelectTab={setActiveNavTab}
        activeRole={activeRole}
        onRoleChange={setActiveRole}
      />

      {/* Global Banner Notification */}
      {bannerNotice && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <Alert
            type={bannerNotice.type}
            title="System Operation Notice"
            onClose={() => setBannerNotice(null)}
          >
            {bannerNotice.message}
          </Alert>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {/* Navigation Area 1: Home View */}
        {activeNavTab === 'home' && (
          <HomeView
            cases={cases}
            workItems={workItems}
            connectors={connectors}
            activeRole={activeRole}
            onOpenCase={handleOpenCase}
            onSelectNavTab={setActiveNavTab}
            onRunTourStep={handleRunTourStep}
          />
        )}

        {/* Navigation Area 2: Work Queue View */}
        {activeNavTab === 'work-queue' && (
          <WorkQueueView
            workItems={workItems}
            activeRole={activeRole}
            onOpenCase={handleOpenCase}
          />
        )}

        {/* Navigation Area 3: Cases View (Unified 7-Area Workspace) */}
        {activeNavTab === 'cases' && activeCase && (
          <div className="space-y-6">
            {/* Case Header with Persistent Blocker Indicators */}
            <CaseHeader
              kycCase={activeCase}
              blockingConditions={activeCase.blockingConditions || []}
              onRunScreening={handleRunScreening}
              isScreeningRunning={isExecutingScreening}
            />

            {/* 7-Area Workflow Navigation */}
            <WorkflowNav
              activeTab={activeWorkflowTab}
              onSelectTab={setActiveWorkflowTab}
              blockerCount={activeCase.blockingConditions?.length || 0}
              findingsCount={articles.length}
              tasksCount={
                obligations.filter((o) => o.exemption?.status === 'PENDING_APPROVAL').length +
                allPendingAliases.length
              }
            />

            {/* Workflow Area Content */}
            <div className="bg-transparent">
              {activeWorkflowTab === 'overview' && (
                <OverviewArea
                  kycCase={activeCase}
                  obligations={obligations}
                  subjects={subjects}
                  activeRole={activeRole}
                  onNavigateToTab={setActiveWorkflowTab}
                  onRunScreening={handleRunScreening}
                  onAttemptComplete={handleCompleteCase}
                />
              )}

              {activeWorkflowTab === 'subjects' && (
                <SubjectsArea
                  subjects={subjects}
                  obligations={obligations}
                  activeRole={activeRole}
                  onInspectSubject={setInspectedSubject}
                  onManageAliases={setManagingAliasSubject}
                  onRequestExemption={setExemptionObligation}
                  onScreenSubject={() => handleRunScreening()}
                />
              )}

              {activeWorkflowTab === 'events-evidence' && (
                <EventsEvidenceArea
                  articles={articles}
                  onExecuteScreening={handleRunScreening}
                  activeRole={activeRole}
                  onArticlesChange={() => {
                    if (activeCase) {
                      apiClient
                        .getEnrichedArticles({ caseId: activeCase.id })
                        .then(setArticles)
                        .catch(() => {});
                    }
                  }}
                />
              )}

              {activeWorkflowTab === 'investigation' && (
                <InvestigationArea
                  screeningRun={screeningRun}
                  connectors={connectors}
                  activeRole={activeRole}
                  currentUserId={currentUserId}
                  onRetryConnector={handleRetryConnector}
                  onExecuteNewRun={handleRunScreening}
                  isExecuting={isExecutingScreening}
                  caseId={activeCase?.id}
                  subjects={subjects}
                  onRefreshRun={() => {
                    if (activeCase) {
                      apiClient
                        .getScreeningRun(activeCase.id)
                        .then(setScreeningRun)
                        .catch(() => {});
                    }
                  }}
                />
              )}

              {activeWorkflowTab === 'tasks-requests' && (
                <TasksRequestsArea
                  obligations={obligations}
                  pendingAliases={allPendingAliases}
                  activeRole={activeRole}
                  currentUserId={currentUserId}
                  onAdjudicateExemption={handleAdjudicateExemption}
                  onApproveAlias={(id) => handleUpdateAliasStatus(id, 'APPROVED')}
                  onRejectAlias={(id) => handleUpdateAliasStatus(id, 'REJECTED', 'Rejected in 4-eyes review')}
                />
              )}

              {activeWorkflowTab === 'decisions' && (
                <DecisionsArea
                  kycCase={activeCase}
                  obligations={obligations}
                  activeRole={activeRole}
                  onCompleteCase={handleCompleteCase}
                  isCompleting={isCompletingCase}
                />
              )}

              {activeWorkflowTab === 'audit-traceability' && (
                <AuditTraceabilityArea
                  events={auditEvents}
                  caseReference={activeCase.reference}
                />
              )}
            </div>
          </div>
        )}

        {/* Navigation Area 4: Monitoring View */}
        {activeNavTab === 'monitoring' && (
          <MonitoringView
            connectors={connectors}
            activeRole={activeRole}
            cases={cases}
            onRefreshConnectors={async () => {
              const res = await apiClient.getConnectors();
              setConnectors(res);
            }}
            onRetryConnectorDirect={handleRetryConnectorDirect}
            onNavigateToCase={handleNavigateToCase}
          />
        )}

        {/* Navigation Area 5: Reports & Oversight View */}
        {activeNavTab === 'reports' && (
          <ReportsOversightView
            cases={cases}
            obligations={obligations}
            activeRole={activeRole}
          />
        )}

        {/* Navigation Area 6: Administration View */}
        {activeNavTab === 'administration' && (
          <AdministrationView
            policyRules={policyRules}
            activeRole={activeRole}
            onSimulatePolicy={apiClient.simulatePolicy.bind(apiClient)}
          />
        )}
      </main>

      {/* Slide-out Drawers */}
      <SubjectProfileDrawer
        isOpen={!!inspectedSubject}
        onClose={() => setInspectedSubject(null)}
        subject={inspectedSubject}
        onManageAliases={(subj) => {
          setInspectedSubject(null);
          setManagingAliasSubject(subj);
        }}
      />

      <AliasManagerDrawer
        isOpen={!!managingAliasSubject}
        onClose={() => setManagingAliasSubject(null)}
        subject={managingAliasSubject}
        activeRole={activeRole}
        onAddAlias={handleAddAlias}
        onSuggestAI={handleSuggestAI}
        onUpdateStatus={handleUpdateAliasStatus}
        isSuggestingAI={isSuggestingAI}
      />

      {/* Modal Dialogs */}
      <ExemptionModal
        isOpen={!!exemptionObligation}
        onClose={() => setExemptionObligation(null)}
        obligation={exemptionObligation}
        onSubmitExemption={handleSubmitExemption}
      />
    </div>
  );
}

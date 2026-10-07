# Role Experience Map

This map outlines how each enterprise persona navigates the application shell and Case Workspace.

---

## 1. Primary Navigation Flow by Role

```
                     ┌──────────────┐
                     │ Role Switcher│
                     └──────┬───────┘
                            │
       ┌───────────┬────────┴───┬──────────────┬────────────┐
       ▼           ▼            ▼              ▼            ▼
   ┌──────┐  ┌───────────┐ ┌────────┐    ┌──────────┐ ┌──────────────┐
   │ Home │  │Work Queue │ │ Cases  │    │Monitoring│ │Administration│
   └───┬──┘  └─────┬─────┘ └───┬────┘    └────┬─────┘ └──────┬───────┘
       │           │           │              │              │
       │           ▼           ▼              │              │
       │     ┌──────────────────────┐         │              │
       └────►│    Case Workspace    │         │              │
             │   (7 Workflow Areas) │         │              │
             └──────────────────────┘         │              │
                           ▲                  │              │
                           └──────────────────┴──────────────┘
```

## 2. Interaction Experience by Role

| Role | Primary Entry Page | First Visual Focus | Key Daily Actions | Case Workspace Focus |
|---|---|---|---|---|
| **ANALYST** | Home | "My Work" & "Screening Failures" | Claim unassigned cases, review subjects, propose aliases, run searches | Subjects, Events & Evidence, Investigation |
| **CHECKER** | Work Queue | "Awaiting Review" filter | Adjudicate proposed aliases, verify screening evidence, approve low-risk exemptions | Tasks & Requests, Decisions, Audit |
| **COMPLIANCE_OFFICER**| Work Queue | "Escalated Cases" & High Risk | Adjudicate policy exceptions, review high-risk adverse media hits | Decisions, Audit & Traceability |
| **MLRO** | Home | "High Risk Escalations" & Overdue | Final sign-off, regulatory disclosures, SAR triggers | Decisions, Case Header blocking conditions |
| **OPERATIONS_MANAGER** | Work Queue | "Unassigned" & "Overdue" | Reassign workload, address SLA breaches, view throughput | Overview, Tasks & Requests |
| **POLICY_ADMINISTRATOR**| Administration | "Policies & Rules Library" | Update policy versions, adjust jurisdiction criteria, simulate rules | Administration Shell |
| **SYSTEM_ADMINISTRATOR**| Monitoring | Connector health & Circuit breakers | Unblock connectors, clear rate-limit queues, view API latencies | Monitoring, Sources & Connectors |
| **AUDITOR** | Reports & Oversight| Screening obligation summary & audit trail | Inspect historical cases, check segregation of duties, export proof | Audit & Traceability, Reports |

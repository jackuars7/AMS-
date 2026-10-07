# System Architecture Specification

## 1. Modular Architectural Overview

The Adverse Media Screening Agent is architected as an enterprise modular system with clean separation of concerns, strict boundary protection, deterministic compliance engines, and a unified React/Tailwind application shell.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ENTERPRISE APPLICATION SHELL                     │
│  Primary Nav: Home | Work Queue | Cases | Monitoring | Reports | Admin      │
├─────────────────────────────────────────────────────────────────────────────┤
│                         UNIFIED CASE WORKSPACE                              │
│  Persistent Header: Entity, Case ID, Risk, Screening, Owner, SLA, Blockers  │
│  Workflow: Overview | Subjects | Evidence | Investigate | Tasks | Decisions │
├─────────────────────────────────────────────────────────────────────────────┤
│                          SERVER-SIDE APIS & GATEWAYS                        │
│   /api/v1/cases          /api/v1/subjects        /api/v1/obligations        │
│   /api/v1/aliases        /api/v1/policies        /api/v1/screening-runs     │
│   /api/v1/search-configs /api/v1/connectors      /api/v1/audit-events       │
├─────────────────────────────────────────────────────────────────────────────┤
│                      BOUNDED DOMAIN SERVICE MODULES                         │
│  ┌───────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ Screening Population  │  │  Subject Profile &   │  │   Name & Alias   │  │
│  │ Engine (AM-01)        │  │  Attribute Registry  │  │   Lifecycle      │  │
│  │ - Policy obligation   │  │  (AM-02)             │  │   (AM-03)        │  │
│  │   generation          │  │ - Provenance tracker │  │ - Multi-script   │  │
│  │ - Completion blocker  │  │ - Conflict detection │  │ - AI suggestion  │  │
│  │ - Exemption workflow  │  │ - Confidence rating  │  │ - Human approval │  │
│  └───────────┬───────────┘  └──────────┬───────────┘  └────────┬─────────┘  │
│              │                         │                       │            │
│  ┌───────────┴───────────┐  ┌──────────┴───────────┐  ┌────────┴─────────┐  │
│  │ Deterministic Policy  │  │ Search Configuration │  │ Approved-Source  │  │
│  │ Engine (AM-05)        │  │ Engine (AM-04)       │  │ Search Orch      │  │
│  │ - Versioned rules     │  │ - Multi-dimension    │  │ (AM-06)          │  │
│  │ - Reproducible audit  │  │   parameters         │  │ - Connectors     │  │
│  │ - Risk calibration    │  │ - Controlled waivers │  │ - Circuit break  │  │
│  └───────────────────────┘  └──────────────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                 FOUNDATIONAL SECURITY & TRACEABILITY LAYER                  │
│  - RBAC (8 roles)   - Segregation of Duties   - Audit Event Append Log      │
│  - Strict AI Safety Boundary (Advisory Only, Never Adjudicating)            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. Bounded Modules

1. **Identity & Access**: 8-role RBAC matrix, actor provenance, session state, no-self-approval rule enforcement.
2. **KYC Cases**: Case state machine (`DRAFT`, `SCREENING_PENDING`, `IN_REVIEW`, `ESCALATED`, `COMPLETED`, `REJECTED`). Enforces mandatory obligation completion before transition to `COMPLETED`.
3. **Screening Population (AM-01)**: Resolves parties (UBOs, directors, signatories, trustees) from customer relationship graphs against versioned screening policies. Generates immutable `ScreeningObligation` records.
4. **Subject Profiles (AM-02)**: Multi-source natural-person and legal-entity consolidation with attribute-level provenance, confidence scoring (0.00-1.00), conflict detection, and effective dates.
5. **Name & Alias Management (AM-03)**: Transliterations, nicknames, former names, trading monikers. State machine: `SOURCED`, `GENERATED`, `ANALYST_ADDED`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `RETIRED`. AI suggestions gated by human authorization.
6. **Search Configuration (AM-04)**: Multi-dimensional search parameters (jurisdictions, categories, keywords, domains, date ranges, depths) with auditable reason-coded exceptions.
7. **Policy-Based Screening Engine (AM-05)**: Pure deterministic rules engine mapping client type, role, jurisdiction, and risk to mandatory obligations and source requirements.
8. **Approved-Source Search Orchestration (AM-06)**: Connectors for search engines, regulatory portals, court records, and licensed media. Supports server allowlists, rate-limiting, circuit breakers, idempotency keys, and coverage trackers.
9. **Audit & Traceability**: Append-only event store capturing actor, role, correlation ID, change delta, policy version snapshot.

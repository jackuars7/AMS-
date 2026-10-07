# Architecture Decision Record (ADR-001)

**Title**: Modular Architecture, Workflow-Oriented Information Architecture, and Case Workspace Shell  
**Status**: ACCEPTED  
**Date**: September 2026  
**Deciders**: Principal Product Architect, Enterprise Software Architect, Lead Compliance Engineer  

---

## Context
The enterprise AML/KYC Adverse Media Screening Agent requires establishing a 10-stage product foundation. Compliance systems often suffer from:
1. Feature fragmentation where each engineering feature (e.g. "Screening Population", "Search Config") gets its own disconnected screen or tab, confusing analysts.
2. Fragile single-page prototypes that simulate state in browser memory without server-enforced business rules, audit logging, or segregation of duties.
3. Lack of deterministic guarantees when integrating generative AI.

## Decision
1. **Application Shell & Information Architecture**:
   - Establish six top-level navigation hubs: `Home`, `Work Queue`, `Cases`, `Monitoring`, `Reports & Oversight`, `Administration`.
   - Implement a unified **Case Workspace** with a compact, persistent **Case Header** (showing Customer, Case ID, Risk, Screening status, Owner, SLA, Blocking conditions, Primary Next Action) and 7 contextual workflow areas: `Overview`, `Subjects`, `Events & Evidence`, `Investigation`, `Tasks & Requests`, `Decisions`, `Audit & Traceability`.
   - Map AM-01 through AM-06 naturally into these workflow areas rather than creating feature tabs.

2. **Modular Architecture**:
   - Backend modular services for `ScreeningEngine` (AM-01), `SubjectService` (AM-02), `AliasLifecycle` (AM-03), `SearchConfigService` (AM-04), `PolicyEngine` (AM-05), `Orchestrator` (AM-06), `RBACService`, and `AuditStore`.
   - Unified full-stack application served via Express + Vite middleware, providing high developer velocity and container deployment compatibility.

3. **Deterministic Compliance Core**:
   - Keep all regulatory policy rules, ownership thresholds, screening obligation resolutions, and blocking invariants completely deterministic and outside AI prompts.
   - Restrict AI models strictly to advisory tasks (suggesting transliterations and normalizing messy data), with mandatory human approval checkpoints.

## Consequences
- **Positive**: Cohesive, enterprise-grade UX aligned with real compliance operations; 100% auditable deterministic policy evaluation; zero chance of AI hallucinating compliance exemptions; seamless extensibility for subsequent stages 2 through 10.
- **Trade-offs**: Requires disciplined state synchronization between connected party graphs, subject profiles, and screening obligations, which is solved through the bounded repository and event store.

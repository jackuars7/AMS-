# Testing Strategy and Quality Gates

This document outlines the multi-tiered verification framework established in Stage 1 to ensure production quality, regulatory compliance, and resilience.

---

## 1. Quality Gates & Test Levels

```
               ┌─────────────────────────────────┐
               │ End-to-End Workflow Validation   │
               │ (Screening run, blocking checks) │
               ├─────────────────────────────────┤
               │ API Contract & RBAC Tests        │
               │ (No self-approval, SoD, 403s)    │
               ├─────────────────────────────────┤
               │ Deterministic Engine Unit Tests │
               │ (Policy resolution, Alias state, │
               │  Circuit breakers, Allowlist)   │
               ├─────────────────────────────────┤
               │ Type-checking & Linting (tsc)   │
               └─────────────────────────────────┘
```

## 2. Test Suites Implemented (`test/run-tests.ts`)

1. **AM-01 Screening Population & Blocking**:
   - Verify that all connected parties meeting policy thresholds generate immutable `ScreeningObligation` records.
   - Verify that a case with incomplete mandatory obligations CANNOT transition to `COMPLETED` (returns 409 Conflict with blocking condition).
   - Verify that an approved exemption unblocks case completion with auditable reason code.

2. **AM-02 Subject Profile & Conflict Detection**:
   - Verify multi-source attribute provenance, confidence scores, and conflict flagging when dates of birth or nationalities diverge across records.

3. **AM-03 Name & Alias Lifecycle & AI Boundary**:
   - Verify alias state transitions: `GENERATED` / `ANALYST_ADDED` -> `PENDING_APPROVAL` -> `APPROVED` / `REJECTED`.
   - Verify that unapproved AI aliases do NOT enter production screening queries.

4. **AM-04 Search Configuration Validation**:
   - Verify multi-dimensional search parameters (jurisdictions, event categories, domains, search depth).
   - Verify controlled, reason-coded exception validation.

5. **AM-05 Deterministic Policy Resolution**:
   - Verify reproducible output given client type, relationship, and risk level.
   - Test rule matching without AI stochasticity.

6. **AM-06 Approved-Source Connector & Circuit Breaker**:
   - Verify server-side allowlist: unapproved domains or connectors are strictly rejected.
   - Verify circuit breaker trips after consecutive threshold failures and recovers on cooldown.
   - Verify partial-success state handling across heterogeneous sources.

7. **RBAC & Segregation of Duties**:
   - Verify that an analyst cannot approve their own exemption request (No self-approval).
   - Verify that read-only Auditor cannot execute mutating endpoints.

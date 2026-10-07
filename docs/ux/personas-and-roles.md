# Personas and Roles Specification

This document formalizes the 8 enterprise roles in the Adverse Media Screening Agent, their operational scope, decision authorities, and constraints.

---

## 1. Role Definitions

### 1. AML/KYC Analyst (`ANALYST`)
- **Primary Mission**: Perform initial screening investigations on onboarding and periodic KYC cases.
- **Allowed Actions**: Review subjects, manage aliases, run approved searches, add analyst notes, request exemptions, submit cases for checker review.
- **Restricted Actions**: Cannot approve exemptions, cannot approve AI-generated aliases for production use, cannot modify global policy, cannot close high-risk cases without checker sign-off.
- **Decision Authority**: Level 1 (Triage, Alias proposal, Exemption request).
- **Queue Access**: Assigned to Me, Unassigned (claimable), Returned Cases.

### 2. Reviewer or Checker (`CHECKER`)
- **Primary Mission**: Perform four-eyes secondary review on analyst recommendations, verify adverse media dispositions, and review low/medium risk exemption requests.
- **Allowed Actions**: Approve/reject aliases, approve Level 1 exemptions, return cases to analyst with revision notes, sign off on completed reviews.
- **Restricted Actions**: Cannot review own work (Segregation of Duties), cannot publish global policy changes.
- **Decision Authority**: Level 2 (Four-eyes sign-off, Standard exemption approval).
- **Queue Access**: Awaiting Review, Returned Cases, Escalated Cases.

### 3. Compliance Officer (`COMPLIANCE_OFFICER`)
- **Primary Mission**: Oversee regulatory compliance, handle escalated adverse media findings, review PEP/high-risk connected parties, approve high-risk exceptions.
- **Allowed Actions**: Approve high-risk exemptions, override search configurations with justification, escalate to MLRO, inspect audit trails.
- **Restricted Actions**: Cannot self-approve cases where they acted as analyst.
- **Decision Authority**: Level 3 (Regulatory oversight, High-risk exemptions).
- **Queue Access**: Escalated Queue, High Risk Queue, Oversight Dashboard.

### 4. Money Laundering Reporting Officer (`MLRO`)
- **Primary Mission**: Ultimate statutory and regulatory authority for suspicious activity determination, high-risk entity onboarding approval, and external regulatory reporting.
- **Allowed Actions**: Final sign-off on complex/adverse cases, trigger external filing workflows, view cross-tenant oversight reports.
- **Restricted Actions**: Administrative system configurations (delegated to System Admin).
- **Decision Authority**: Level 4 (Ultimate statutory sign-off).
- **Queue Access**: All queues, MLRO Priority Desk.

### 5. Team Lead / Operations Manager (`OPERATIONS_MANAGER`)
- **Primary Mission**: Manage queue SLA, load balance assignments, monitor team throughput, and detect operational bottlenecks.
- **Allowed Actions**: Reassign cases, modify work priority, unblock stalled runs, view team productivity metrics.
- **Restricted Actions**: Substantive policy edits or regulatory sign-off.
- **Decision Authority**: Operational (Queue reassignments, SLA overrides).
- **Queue Access**: All queues, Workload Management view.

### 6. Policy Administrator (`POLICY_ADMINISTRATOR`)
- **Primary Mission**: Define, version, test, and maintain deterministic screening policies, risk weightings, and connected party scoping rules.
- **Allowed Actions**: Create draft policy versions, modify rule sets, test policy simulations against historical cases, publish policy versions with checker approval.
- **Restricted Actions**: Operational case adjudication.
- **Decision Authority**: Policy & Rules (Versioned policy changes).
- **Queue Access**: Administration Shell, Policy Library.

### 7. System Administrator (`SYSTEM_ADMINISTRATOR`)
- **Primary Mission**: Manage system health, external connectors, source allowlists, tenant configuration, and platform credentials.
- **Allowed Actions**: Configure API connectors, toggle circuit breakers, manage rate limits, inspect technical logs, configure roles.
- **Restricted Actions**: Cannot adjudicate AML cases or approve compliance exemptions.
- **Decision Authority**: Infrastructure & Integration.
- **Queue Access**: Administration Shell, Monitoring, Connectors.

### 8. Auditor / Read-Only Reviewer (`AUDITOR`)
- **Primary Mission**: Independent internal or regulatory audit of screening operations, decision trails, and segregation of duties.
- **Allowed Actions**: Read-only inspection of all cases, audit trails, policy resolutions, exemption logs, and reports. Export audit packages.
- **Restricted Actions**: All mutating actions (strictly read-only).
- **Decision Authority**: None (Inspect and export only).
- **Queue Access**: Read-only access across all cases and reports.

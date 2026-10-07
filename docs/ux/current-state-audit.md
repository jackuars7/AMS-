# UX Current State Audit

**Product**: Enterprise AML/KYC Adverse Media Screening Agent  
**Stage**: Stage 1 Initial Architecture & Baseline Audit  

---

## 1. Prior Baseline Review

Prior to Stage 1, the repository contained no user-facing interface, design tokens, or workflow components. The initial template served only a blank `<div></div>`.

## 2. Identified Anti-Patterns to Prevent

In accordance with Section 1 and Section 4 of the architectural specifications:

1. **The Feature-per-Tab Anti-Pattern**: Many compliance systems create a primary navigation tab or page for each technical capability (e.g., "Screening Population", "Search Config", "Connector Status"). This fragments the analyst workflow, forcing users to click between disconnected screens to investigate a single customer.
   * *Resolution*: Implement a workflow-oriented Information Architecture. The Case Workspace embeds Screening Population (AM-01), Consolidated Profiles (AM-02), Alias Management (AM-03), and Orchestrated Evidence (AM-06) within contextual workflow areas (Overview, Subjects, Events & Evidence, Investigation, Tasks & Requests, Decisions, Audit).

2. **The "Hero Metric" & Artificial Splash Anti-Pattern**: Generic dashboards filled with oversized numbers and promotional fluff waste screen real estate.
   * *Resolution*: The Home view is strictly action-oriented—surfacing actionable work items ("My Work", "Due/Overdue", "Pending Approvals", "Screening Failures") with direct jump links.

3. **Silent Failure & Missing Blocking States**: In standard tools, screening failures or missing mandatory obligations often silently allow analysts to sign off on high-risk cases.
   * *Resolution*: Mandatory screening obligations programmatically block case closure until all in-scope connected parties have completed screening or have an approved, reason-coded exemption.

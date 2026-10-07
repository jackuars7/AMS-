# AM-01 to AM-06 Feature-to-Experience Coverage Matrix

This matrix maps each architectural and functional requirement to its UI workflow location, backend API, permission key, and test coverage.

---

| Feature Code | Feature Name | Primary User Role | Workflow Location | Backend API Endpoint | Required Permission | Test Evidence |
|---|---|---|---|---|---|---|
| **AM-01** | Screening Population Management | AML Analyst, Checker, Compliance Officer | Case Workspace -> **Subjects** area & **Overview** area | `GET /api/v1/cases/:id/obligations`<br>`POST /api/v1/cases/:id/obligations/resolve`<br>`POST /api/v1/obligations/:id/exempt` | `case:view`<br>`exemption:request`<br>`exemption:approve` | `test/run-tests.ts`: `testObligationBlocking()` & `testExemptionWorkflow()` |
| **AM-02** | Subject Profile Creation | AML Analyst, Checker | Case Workspace -> **Subjects** area -> Profile Drawer | `GET /api/v1/subjects/:id`<br>`GET /api/v1/subjects/:id/attributes` | `case:view`<br>`subject:create_edit` | `test/run-tests.ts`: `testSubjectAttributeProvenance()` |
| **AM-03** | Name and Alias Management | AML Analyst, Checker | Case Workspace -> **Subjects** area -> Alias Manager | `GET /api/v1/subjects/:id/aliases`<br>`POST /api/v1/subjects/:id/aliases`<br>`POST /api/v1/subjects/:id/aliases/ai-suggest`<br>`PATCH /api/v1/aliases/:id/status` | `alias:propose`<br>`alias:approve` | `test/run-tests.ts`: `testAliasLifecycleAndApproval()` |
| **AM-04** | Search Configuration | Compliance Officer, Policy Admin | Administration -> **Search Configurations** & Case Workspace -> **Investigation** | `GET /api/v1/search-configs`<br>`POST /api/v1/search-configs`<br>`POST /api/v1/search-configs/:id/exceptions` | `policy:view`<br>`search_config:edit` | `test/run-tests.ts`: `testSearchConfigurationValidation()` |
| **AM-05** | Policy-Based Screening Parameters | Policy Admin, Compliance Officer | Administration -> **Policies & Rules** & Case Workspace -> **Overview** | `GET /api/v1/policies`<br>`POST /api/v1/policies/evaluate`<br>`POST /api/v1/policies/versions` | `policy:view`<br>`policy:edit` | `test/run-tests.ts`: `testDeterministicPolicyResolution()` |
| **AM-06** | Approved-Source Search Orchestration | AML Analyst, System Admin | Case Workspace -> **Investigation** & Shell -> **Monitoring** | `POST /api/v1/screening-runs`<br>`GET /api/v1/screening-runs/:id`<br>`GET /api/v1/connectors`<br>`POST /api/v1/connectors/:id/retry` | `screening:run`<br>`connector:manage` | `test/run-tests.ts`: `testConnectorAllowlistAndCircuitBreaker()` |

---

## Architectural Guarantee Against "Feature-per-Tab" Anti-Pattern
Notice that **no primary navigation tab exists for AM-01, AM-02, AM-03, AM-04, AM-05, or AM-06**.
Instead:
- AM-01, AM-02, and AM-03 reside contextualized inside the **Case Workspace -> Subjects** view and **Overview** view.
- AM-04 and AM-05 reside in **Administration -> Policies & Search Configurations** and are applied transparently inside the **Investigation** workflow.
- AM-06 resides in **Case Workspace -> Investigation** (case-level execution) and **Monitoring** (system-level telemetry).

# Enterprise Authorization Matrix & Segregation of Duties

This matrix defines server-enforced permissions across all 8 enterprise roles in the Adverse Media Screening platform.

---

## 1. Permission Matrix

| Permission Key | Description | ANALYST | CHECKER | COMPLIANCE_OFFICER | MLRO | OPERATIONS_MANAGER | POLICY_ADMINISTRATOR | SYSTEM_ADMINISTRATOR | AUDITOR |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `case:view` | View KYC cases and subjects | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| `case:edit` | Update case notes, subject details | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `case:assign` | Assign or reallocate case owners | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `case:submit_review` | Submit case for secondary review | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `case:approve_close` | Final case sign-off / closure | ❌ | ✅ (Low/Med) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `subject:create_edit` | Create/edit party, add attributes | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `alias:propose` | Add analyst aliases, request AI aliases | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `alias:approve` | Approve proposed/AI alias for screening | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `screening:run` | Execute approved-source searches | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `exemption:request` | Request policy exemption for party | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `exemption:approve` | Approve screening obligation exemption | ❌ | ✅ (Low/Med) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `policy:view` | View active and historical policies | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `policy:edit` | Create and edit policy versions | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `search_config:edit` | Modify source categories and parameters | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `connector:manage` | Manage connector allowlists & circuit breakers | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `audit:view` | View full immutable audit event trail | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `audit:export` | Export compliance and audit packages | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |

---

## 2. Segregation of Duties (SoD) Invariants

1. **No Self-Approval**: If User A acts as the case analyst or requests an exemption for a subject, User A CANNOT approve that exemption or sign off as Checker on the case.
2. **AI Boundary Invariant**: An AI model or automated agent CANNOT approve an alias, approve an exemption, or close a case. All AI suggestions must transition through a `pending_approval` state with an authorized human signature.
3. **Mandatory Obligation Blocking**: A case CANNOT be marked as Completed (`status = 'COMPLETED'`) while any mandatory `ScreeningObligation` has status `PENDING`, `RUNNING`, `FAILED`, or `BLOCKED`. Case completion requires either `COMPLETED` screening run or an `EXEMPTED` status with an approved `ExemptionRequest`.

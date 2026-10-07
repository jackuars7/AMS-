# Threat Model and Security Architecture

## 1. Scope and Assets
This threat model addresses the adverse media screening pipeline, identity stores, screening obligations, and external connector interfaces.

### Critical Assets:
1. Subject PII and identity records (national IDs, corporate structures).
2. Screening obligations and compliance blocking status.
3. Adverse media search criteria, source allowlists, and execution logs.
4. AI agent integration boundaries and human approval checkpoints.
5. Immutable audit trails.

---

## 2. STRIDE Analysis and Mitigations

| Threat (STRIDE) | Attack Vector | Mitigation in Stage 1 Architecture |
|---|---|---|
| **Spoofing** | Adversary attempts to impersonate an MLRO or Compliance Officer to approve exemptions | Server-side role resolution; session tokens validated against authorization matrix; actor ID and role permanently stamped on audit records. |
| **Tampering** | Analyst attempts to modify screening obligation status directly or alter deterministic policy outcome | Screening obligations and policy resolution are calculated on backend services. Clients cannot set `obligation.status = COMPLETED` directly without an orchestrated screening run or approved exemption. |
| **Repudiation** | An analyst denies requesting an unvetted alias or an exemption | Every state change appends an immutable `AuditEvent` containing actor ID, role, client IP, UTC timestamp, correlation ID, and object delta. |
| **Information Disclosure** | Leakage of confidential adverse media or identity attributes via URLs or logs | Sensitive identifiers are kept in request bodies and headers, never logged in client analytics or query parameters; masking applied on sensitive fields. |
| **Denial of Service** | Upstream media API rate limit exhaustion or failure crashing the screening queue | AM-06 implements a robust circuit breaker with exponential backoff retries, rate-limiting guards, and partial-success status so failures in one connector don't freeze the run. |
| **Elevation of Privilege / AI Prompt Injection** | Web content containing adversarial prompt injections attempting to command the AI to approve aliases or clear subjects | **Strict AI Safety Boundary**: AI agent output is strictly validated against JSON schemas; AI cannot approve aliases or exemptions; retrieved text is NEVER executed as instructions. |

---

## 3. Four-Eyes & Segregation of Duties Enforcement

```
[Analyst] ── Proposes Alias / Requests Exemption ──► [Pending Approval State]
                                                            │
                                                     [Four-Eyes Check]
                                                            │
                                  ┌─────────────────────────┴────────────────────────┐
                                  ▼                                                  ▼
                     Same Actor? (User A == User A)                  Different Actor? (User B != User A)
                                  │                                                  │
                       ❌ REJECTED (403 Forbidden)                         ✅ APPROVED / ADJUDICATED
                      "Self-approval is prohibited"
```

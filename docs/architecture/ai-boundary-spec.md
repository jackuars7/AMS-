# AI Boundary Specification and Safety Guardrails

## 1. Statutory Mandate and Principle of Human Authority

In compliance with international AML regulations (FATF, FinCEN, EU AMLD) and enterprise risk standards, **AI systems must never make unilateral adjudications, approve compliance exemptions, or bypass deterministic rules**.

---

## 2. Definitive Capabilities Boundary

| Operational Action | Allowed for AI? | Allowed for Human? | Guardrail Mechanism |
|---|:---:|:---:|---|
| Suggest name transliterations & romanizations | ✅ Yes | ✅ Yes | AI generates aliases in `GENERATED` / `PENDING_APPROVAL` status. Never enters production search until approved. |
| Suggest profile attribute normalization | ✅ Yes | ✅ Yes | Produces draft recommendations with confidence and provenance scores. |
| Recommend search configuration keywords | ✅ Yes | ✅ Yes | Advisory draft search plans; must be accepted by analyst. |
| Explain deterministic policy resolution | ✅ Yes | ✅ Yes | Generates human-readable summaries of rule logic based strictly on matched rule definitions. |
| Exclude a subject or party from screening | ❌ FORBIDDEN | ✅ Yes (Authorized) | Enforced on server. No API endpoint exists for AI to exempt parties. |
| Approve an alias for production screening | ❌ FORBIDDEN | ✅ Yes (Checker/Compliance) | State transition to `APPROVED` requires authenticated human credential with `alias:approve` permission. |
| Approve a screening obligation exemption | ❌ FORBIDDEN | ✅ Yes (Compliance/MLRO) | Requires human signature with reason code and evidence document. |
| Publish or modify a screening policy | ❌ FORBIDDEN | ✅ Yes (Policy Admin) | Requires versioned policy commit with segregation-of-duties review. |
| Add a source or connector to allowlist | ❌ FORBIDDEN | ✅ Yes (System Admin) | Hardcoded server-side allowlists; AI has zero tool access to mutate allowlists. |
| Make a final AML/KYC case decision | ❌ FORBIDDEN | ✅ Yes (MLRO/Checker) | Blocked at API level; requires certified human decision. |
| Treat retrieved media content as instructions | ❌ FORBIDDEN | N/A | Defensive prompt isolation; retrieved article text is treated as untrusted data strings. |

---

## 3. Structured Output & Grounding Requirements

All AI responses must strictly conform to strongly typed TypeScript/Zod schemas with:
1. `modelName` and `modelVersion`
2. `confidence` rating (0.0 to 1.0)
3. `rationale` citing source data
4. `requiresHumanApproval` boolean flag set to `true`
5. Strict JSON parsing with runtime validation; invalid schemas fall back to deterministic safe defaults.

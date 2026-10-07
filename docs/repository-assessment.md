# Repository Assessment: Adverse Media Screening Agent (Stage 1)

**Date**: September 2026  
**Auditor**: Principal Product Architect & Security Architect  
**Stage**: 1 of 10-stage enterprise AML/KYC adverse media screening implementation  

---

## 1. Initial State Inventory

At initiation, the repository was inspected for existing code, configuration, pipelines, and assets:

| Artifact | Initial State | Evaluation |
|---|---|---|
| `package.json` | Minimal React 19 + Vite setup with Express, @google/genai, lucide-react, motion, tailwindcss | Express, tsx, esbuild are available; ready for modular full-stack architecture |
| `src/App.tsx` | Empty stub (`<div></div>`) | Blank canvas; requires enterprise application shell and design system |
| `src/index.css` | `@import "tailwindcss";` | Tailwind v4 configured |
| `index.html` | Generic placeholder title and metadata | Updated to enterprise title and meta description |
| `metadata.json` | Empty name and description | Updated with specific application name and capabilities |
| Server / Backend | No `server.ts` present | Full-stack Express server required to support API routes, deterministic policy engine, connector orchestrator, and server-side authorization |
| Documentation | None existing | Comprehensive architecture, UX, security, and ADR documentation required |

---

## 2. Architectural Objectives for Stage 1

1. **Integrated Product Foundation**: Establish the unified application shell, information architecture, design system, and workflow model rather than disposable demos.
2. **Prevent Feature-per-Tab Anti-Pattern**: Implement AM-01 through AM-06 strictly within the natural workflow areas (Home, Work Queue, Cases, Case Workspace, Monitoring, Reports, Administration).
3. **Deterministic Core Outside AI**: Policy parameter resolution (AM-05), screening population evaluation (AM-01), source allowlisting (AM-06), and alias approval (AM-03) must execute deterministically with complete auditability. AI is restricted to advisory assistance (suggestions, transliteration hints, explanations) with mandatory human checkpoints.
4. **Role-Aware Security & Segregation of Duties**: 8 enterprise roles with strict server-side authorization checks, no self-approval for exemptions, and tenant isolation.
5. **Synthetic Enterprise Dataset**: Realistic, clearly labeled fictional datasets representing corporate customers, natural persons, UBOs, directors, signatories, multilingual aliases, attribute conflicts, policy exceptions, and connector failures.

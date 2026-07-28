# Security Readiness Report

**Program date:** 2026-07-23  
**Overall status:** **BLOCKED**  
**Code-side controls:** **PASS WITH OPEN OPERATIONAL RISKS**

## Verified controls

| Control                      | Result             | Evidence                                                                                                                 |
| ---------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Dependency audit             | PASS               | `npm audit --audit-level=high`: 0 vulnerabilities                                                                        |
| Dependency baseline          | PASS               | Patched PostCSS and Sharp lock resolution guard                                                                          |
| Dependency regression tests  | PASS               | Baseline tests pass 3/3                                                                                                  |
| Runtime error secrecy        | PASS               | Raw error messages excluded from structured events                                                                       |
| Container user               | PASS in Dockerfile | Non-root UID/GID 10001                                                                                                   |
| Runtime image scan           | PASS locally       | Trivy 0.66.0: 0 HIGH, 0 CRITICAL; secret scan 0 findings                                                                 |
| Source-tree secret scan      | PASS locally       | Trivy filesystem secret scan: 0 findings                                                                                 |
| Runtime tooling minimization | PASS               | npm/npx removed from runner; Node starts Next directly                                                                   |
| Runtime security contract    | PASS locally       | `/healthz`, read-only root, no privilege escalation, drop `ALL`, `RuntimeDefault` seccomp required by manifest validator |
| Production build             | PASS               | Next.js optimized build completed                                                                                        |
| Architecture boundary        | PASS               | `npm run architecture:check`                                                                                             |
| No-deploy policy             | PASS               | Deployment primitives absent                                                                                             |

## Dependency risk register summary

- PostCSS vulnerable range: resolved to `8.5.20` and guarded.
- Sharp vulnerable range: resolved to `0.35.0` and guarded.
- Next.js 15 transitive compatibility: build/tests pass, but explicit override compatibility remains subject to framework support review.

## Operational blockers

1. Secret rotation has not been rehearsed in an approved Staging Secret Manager.
2. Field-encryption rotation requires old-key decryptability and rollback proof before execution.
3. Local candidate scan is clean, but the immutable Staging artifact has not been scanned/verified.
4. No Staging network policy, runtime identity or least-privilege verification.
5. No approved security owner/risk acceptance for residual dependency override compatibility.

## Decision

Current source dependency audit is clean. Security Readiness remains **BLOCKED** until rotation, runtime image scanning, Staging least-privilege verification and risk sign-off complete.

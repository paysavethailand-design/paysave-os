# PAYSAVE OS — Dependency Risk Register

**Sprint:** Release Readiness  
**Date:** 2026-07-23  
**Rules observed:** no Next.js downgrade; no `npm audit fix --force`

## Executive Summary

The safe direct remediation was applied: Next.js was upgraded from `15.5.20` to `15.5.21`. Direct Next.js advisories are no longer present. npm audit still reports three package-level entries because Next.js 15.5.21 pins/permits vulnerable transitive versions of PostCSS and Sharp.

## Register

### Fix Immediately — Completed

| Package            | Action                                   | Result                                             |
| ------------------ | ---------------------------------------- | -------------------------------------------------- |
| Next.js            | `15.5.20` → `15.5.21` (exact, non-major) | Direct Next.js advisories closed; build/tests pass |
| eslint-config-next | `15.5.20` → `15.5.21` (exact, non-major) | Lint tooling aligned with runtime framework        |

Resolved direct advisories included Server Actions DoS/SSRF, rewrite SSRF, cache confusion, image optimizer DoS, endpoint disclosure, and Edge payload findings affecting versions below 15.5.21.

### Risk Accepted — CTO Decision Required

| Advisory            | Package                            | Severity | Exposure                                                                                        | Compensating control                                                         | Review date |
| ------------------- | ---------------------------------- | -------: | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------- |
| GHSA-qx2v-qp2m-jg93 | `next/node_modules/postcss@8.4.31` | Moderate | PostCSS is used during controlled build processing; no untrusted CSS stringification path found | Immutable lockfile, controlled source/build inputs, no runtime CSS authoring | 2026-08-23  |

Recommendation: accept for **Beta only**, pending CTO acknowledgement. Reassess when Next.js updates its exact PostCSS dependency.

### Waiting Upstream

| Advisory            | Package                    | Severity | Why not forced                                                                                      | Exposure/mitigation                                                                                                                                                                                                                   | Review date |
| ------------------- | -------------------------- | -------: | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| GHSA-f88m-g3jw-g9cj | `sharp@0.34.5` via Next.js |     High | Fixed Sharp is 0.35.x, outside Next.js 15.5.21 range `^0.34.3`; forcing a 0.x minor may be breaking | No `next/image` import or `<Image>` usage found; this reduces but does not eliminate exposure to the built-in optimizer. Prohibit image optimization and block `/_next/image` for any shared Beta until a compatible upstream release | 2026-08-23  |

npm audit aggregates the two transitive findings under `next` as an additional high package-level entry. Its suggested Next.js downgrade to 9.3.3 is rejected by policy and is not a valid remediation.

## Current Audit State

- Critical: 0
- High package entries: 2 (`sharp` and aggregate `next`)
- Moderate package entries: 1 (`postcss`)
- Direct Next.js advisories after 15.5.21 update: 0
- Lock reproducibility: `npm ci --dry-run --ignore-scripts` — Exit 0
- Resolved tree verified: Next.js 15.5.21, nested PostCSS 8.4.31, Sharp 0.34.5

## Beta Disposition

Dependency review is complete. Beta may proceed only if CTO accepts the documented PostCSS risk and the Sharp waiting-upstream control. Production eligibility is not granted by this register.

The current CI `dependency-audit` job runs `npm audit --audit-level=high` and therefore remains **BLOCKED**. Because the build job depends on it, no release-eligible artifact can be produced until either the upstream risk is fixed or CTO authorizes a narrowly scoped, time-bounded exception policy. This register does not itself grant that authorization.

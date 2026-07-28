# RFC-0008 — Implementation Readiness Assessment

- **Assessment:** NOT READY
- **Stage 4.0 Phase B:** HOLD
- **Beta Gate:** HOLD
- **Assessment scope:** Design and evidence only

## 1. Readiness matrix

| Capability                               | Existing evidence                                   | Status                     | Blocker / required decision                                                                                                    |
| ---------------------------------------- | --------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Supabase credential login                | Existing `signInWithPassword` server action         | READY AS CODE CONTRACT     | Live authorized identity and runtime evidence still required                                                                   |
| JWT signature verification               | Existing Supabase `getClaims()` path                | READY AS CODE CONTRACT     | Valid PAYSAVE claims cannot yet be issued                                                                                      |
| Strict PAYSAVE claim parser              | Existing Zod parser                                 | PARTIAL                    | Parser requires unsupported `session_version`, does not enforce target `claims_version`, and role vocabulary may not match IAM |
| Partner RLS claim consumers              | M003 reads subject, active partner and tenant scope | READY AS DATABASE CONTRACT | Issuer and valid JWT path absent                                                                                               |
| HTTP Custom Access Token Hook capability | Supported by Supabase official platform contract    | DESIGN AVAILABLE           | No Edge Function, webhook secret, deterministic hook binding/config evidence or issued-token proof exists                      |
| Active-partner resolution                | Active memberships exist                            | BLOCKED                    | No selector authority for multiple memberships                                                                                 |
| Global-scope resolution                  | Frozen RLS supports claim                           | BLOCKED                    | No approved global-grant authority; issuance must stay disabled                                                                |
| Role resolution                          | Membership-role model exists                        | PARTIAL                    | Role status/code vocabulary unresolved                                                                                         |
| Permission resolution                    | Role-permission model exists                        | PARTIAL                    | Effect vocabulary/conflict precedence unresolved                                                                               |
| Branch scope                             | IAM rows exist                                      | BLOCKED                    | No shared fresh application resolver and no generic RLS integration                                                            |
| Permission/resource scope                | IAM rows exist                                      | BLOCKED                    | No shared fresh application resolver and no generic RLS integration                                                            |
| Immediate membership revocation          | Active-scope RLS rechecks membership                | PARTIAL                    | Disable workflow and token/session behavior need live proof                                                                    |
| Immediate role/permission revocation     | Supabase session revoke available                   | BLOCKED                    | Existing access token survives until expiry; no measured stale window                                                          |
| Session-version revocation               | Parser field exists                                 | NOT IMPLEMENTED            | No authoritative version source/comparison                                                                                     |
| Hook least-privilege access              | None                                                | BLOCKED                    | Service-role is broader than required; Security decision needed                                                                |
| Hook cache/invalidation                  | None                                                | BLOCKED                    | No event or operational design approved                                                                                        |
| Monitoring and on-call                   | Static alert rules only                             | BLOCKED                    | Managed backend and live alert drill absent                                                                                    |
| Staging JWT/RLS E2E                      | Database claim-layer tests only                     | BLOCKED                    | Valid issued JWT and synthetic identities absent                                                                               |
| Production                               | Explicitly prohibited                               | NOT IN SCOPE               | Separate future gate only                                                                                                      |

## 2. Architecture consistency check

| Frozen rule                                               | RFC-0008 alignment                                                                                     | Result                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Modular monolith with Supabase in infrastructure adapters | Existing application remains primary deployable; Edge Function is a platform Auth integration boundary | CONDITIONAL — CTO must approve runtime component |
| Server-side authorization on every protected operation    | Existing guards retained; fresh scope checks required for fine-grained operations                      | PASS AS DESIGN                                   |
| RLS is primary PostgreSQL data boundary                   | Partner RLS preserved and never replaced with service-role user access                                 | PASS AS DESIGN                                   |
| Tenant context must be server-verified                    | Hook and app revalidate membership/partner                                                             | PASS AS DESIGN                                   |
| IAM owns membership, role, permission scope and SoD       | Claim resolver reads IAM as authority                                                                  | PASS AS DESIGN                                   |
| No unapproved database change                             | No database change proposed                                                                            | PASS                                             |
| Runtime policy implementation was not frozen at Stage 2.7 | RFC defines a proposed runtime integration without altering logical contracts                          | PASS AS DESIGN                                   |

## 3. Security readiness

- Least privilege: **FAIL** until hook access is narrowed or compensating controls are approved.
- Claim tampering: **DESIGN PASS** through Supabase signing and verified parsing.
- Replay defense: **DESIGN DEFINED**, no runtime evidence.
- Token size: **DESIGN DEFINED**, no measured cookie evidence.
- Revocation: **PARTIAL** for active membership; **FAIL** for immediate permission/global revocation.
- Sensitive-data policy: **DESIGN PASS**, no runtime/logging evidence.

## 4. Governance readiness

- RFC deliverables: complete for review.
- Decision owner approval: pending.
- Security owner approval: pending.
- Platform/SRE ownership: pending.
- Status conflict in legacy authentication setup: resolved by marking `docs/security/AUTHENTICATION_SETUP.md` superseded; operator/CI enforcement remains required.
- Implementation authorization: absent.
- Deployment authorization: absent.

## 5. Independent review reconciliation

| Review                   | Independent verdict                                        | Reconciled disposition                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture Consistency | FAIL for current implementation; Hybrid is conditional     | Target/current parser mismatch, global authority, user-status, role/effect, scope, selector and Edge boundary remain explicit blockers                          |
| Identity & Security      | Conditional Fail                                           | Revocation, hook binding, branch/resource scope, inactive-user semantics and service-role boundary remain blocked and were added/strengthened in the risk model |
| Governance & Scope       | PASS for document scope; FAIL for implementation readiness | Legacy guide superseded; review record/evidence lock added; Stage/Beta remain HOLD                                                                              |

No reviewer finding was treated as implementation evidence. Recommendations that would require a new branch claim, RLS expansion, schema change or backend change are deferred to a separately approved future decision and are not implemented by RFC-0008.

## 6. Required pre-implementation approvals

1. CTO selects Option D.
2. Enterprise Architecture accepts Edge Function as runtime integration boundary without altering frozen logical architecture.
3. CISO approves global scope policy, credential boundary, effect semantics, stale-token exposure and sensitive-data policy.
4. IAM owner approves active-partner selector and status/role/permission vocabularies.
5. Platform/SRE accepts hook SLO, timeout, cache, alert, secret rotation and incident ownership.
6. Product/domain owners identify every workflow requiring branch/resource/SoD fresh checks.

## 7. Required Staging acceptance evidence after implementation authorization

- login and refresh produce versioned claims from synthetic IAM identities;
- malformed, ambiguous, unauthorized and oversized resolutions fail closed;
- active partner and cross-tenant positive/negative tests pass;
- membership removal denies an unexpired active-scope token at RLS;
- permission removal stale window is measured and within approved TTL;
- branch/resource scope positive and negative tests pass through application-only paths;
- HTTP hook signature/replay/timeout/outage tests pass;
- service-role material remains absent from browser bundles, tokens, logs and evidence;
- logout and administrative revocation behavior is measured;
- token/cookie byte budgets pass;
- managed monitoring Fire → Alert → Ack → Recover drill passes;
- independent Architecture, Security and Governance reviews close all Critical findings.

## 8. Final assessment

**Recommended architecture:** D — Hybrid.

**Implementation readiness:** **NO**.

**Reason:** Design is consistent with frozen seams, but authority sources, least-privilege hook access, fine-grained scope enforcement, revocation semantics and operational evidence remain unresolved.

No implementation, deployment, database change or Production access is authorized by this assessment.

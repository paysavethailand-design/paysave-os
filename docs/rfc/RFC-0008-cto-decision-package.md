# RFC-0008 — CTO Decision Package

- **Status:** AWAITING CTO DECISION
- **Decision scope:** Target architecture and controlled resumption conditions for Stage 4.0 Phase B
- **Current Stage 4.0 Phase B:** HOLD
- **Current Beta Gate:** HOLD
- **Implementation/deployment authority before approval:** None
- **Production:** Prohibited

## 1. Executive decision

Approve, conditionally approve or reject **Option D — Hybrid** as the target Supabase Auth ↔ PAYSAVE IAM integration architecture.

Approval of this package may authorize only the separately controlled resumption of **Non-Production Stage 4.0 Phase B** planning/implementation/evidence work. It does not approve Beta, Production, deployment, a database change, a migration or use of the legacy authentication hook.

## 2. Recommended architecture

**Option D — Hybrid**

1. Supabase Auth remains credential verifier, JWT issuer, refresh authority and session authority.
2. A proposed Supabase HTTP Custom Access Token Hook hosted on an Edge Function resolves minimal coarse claims at token issue and refresh.
3. Frozen RLS remains the partner-isolation authority for `sub`, `paysave.active_partner_id` and `paysave.tenant_scope`.
4. Application guards use `paysave.roles` and `paysave.permissions` for route/use-case authorization.
5. Branch, assignment, resource, SoD and fresh-revocation-sensitive operations use server-side current-state resolution and are prohibited from direct browser/Data API paths unless the frozen RLS already enforces the required rule.
6. `tenant_scope=all` remains disabled until an authoritative grant and emergency-revocation design are approved.

### Why this option

- It is the only compared option that can supply the claims frozen RLS already consumes without modifying M001–M016.
- It retains Supabase signing and refresh lifecycle.
- It preserves application permission guards and does not misrepresent them as database isolation.
- It isolates fine-grained fresh authorization from the JWT size/staleness problem.

### Architecture condition

The Edge Function is an additional runtime trust boundary. It is compatible with the frozen logical architecture only if CTO and Enterprise Architecture explicitly accept it as an infrastructure integration component and Security accepts its credential boundary.

## 3. Key risks

### Critical

| Risk                                                       | Current control          | Required disposition                                                                     |
| ---------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------- |
| Forged/stale `tenant_scope=all` bypasses membership checks | Issuance disabled        | Approve authority and emergency revocation or defer global scope                         |
| Broad service-role capability can bypass RLS               | No approved runtime path | Approve a least-privilege/isolation model, audit controls and owner                      |
| HTTP hook can be spoofed/replayed or may not be bound      | Design controls only     | Require signed-event verification, replay defense, deterministic config and outage tests |
| Direct Data API path can bypass app fine-grained checks    | Design prohibition       | Approve an application-only sensitive-path inventory and enforcement owner               |
| Legacy setup could cause prohibited migration use          | Guide superseded         | Add operator/CI guard before implementation handoff                                      |

### High

- active-partner selector authority is missing for multi-membership users;
- role and permission-effect vocabularies are not governed;
- permission claims and access tokens remain stale until expiry;
- IAM disable does not by itself invalidate all frozen RLS paths;
- branch/resource scope lacks generic RLS enforcement;
- target `claims_version` is not enforced by the current parser;
- `session_version` has no authoritative source/comparison and is not revocation evidence;
- token/cookie budget and hook latency are unmeasured;
- managed secrets, monitoring, backup/PITR/restore and valid JWT/RLS evidence remain incomplete.

## 4. Decisions required

| ID   | Decision                                                                | Recommended answer                                                                                      | If not approved                                              |
| ---- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| D-01 | Accept Option D and Edge Function as an infrastructure runtime boundary | Approve conditionally                                                                                   | Select another architecture; Phase B remains HOLD            |
| D-02 | Active partner for multiple memberships                                 | Server-controlled selector, revalidated at every issue/refresh; ambiguity denies                        | Multi-partner login remains blocked                          |
| D-03 | Global-admin authority                                                  | Keep `tenant_scope=all` disabled until a dedicated governed authority and emergency revocation exist    | Global scope remains unavailable                             |
| D-04 | Access-token lifetime/stale window                                      | Five-minute uniform Stage/Beta target, verified in Staging                                              | Security must approve another bounded window; otherwise HOLD |
| D-05 | User/membership/role status and permission-effect vocabulary            | Approve canonical values and deny-on-unknown/deny-overrides behavior                                    | Claim issuance remains blocked                               |
| D-06 | Branch/resource/SoD-sensitive access path                               | Application-only with fresh resolution until a separate future RLS decision                             | Sensitive workflows remain blocked                           |
| D-07 | Hook-to-IAM credential model                                            | Isolated server-only resolver capability; never use service role to represent a caller; audited use     | Implementation remains blocked                               |
| D-08 | Target claim version enforcement                                        | Authorize a separate application-contract change and negative tests before conformance                  | RFC target cannot be implemented                             |
| D-09 | `session_version` semantics                                             | Keep compatibility-only for this contract; design revocation separately                                 | No version-based revocation claim allowed                    |
| D-10 | Null-partner session behavior                                           | Deny protected tenant access; allow only explicitly approved global pre-selection surface               | Login behavior remains ambiguous                             |
| D-11 | Platform ownership and SLO                                              | Assign Platform/SRE owner for hook, secret, cache, alert, rollback and incident response                | Operational readiness remains blocked                        |
| D-12 | Phase B resumption boundary                                             | After approvals above, authorize a separately reviewed Non-Production implementation/evidence plan only | Stage 4.0 Phase B remains HOLD                               |

## 5. Required approvals

| Approver                | Required decision/sign-off                                                 | Status  |
| ----------------------- | -------------------------------------------------------------------------- | ------- |
| CTO                     | Architecture option, runtime boundary, stale window and Phase B resumption | PENDING |
| CISO / Security         | Global scope, credential boundary, replay, revocation and residual risks   | PENDING |
| Enterprise Architecture | Edge Function compatibility with frozen logical architecture               | PENDING |
| IAM Owner               | Selector and status/role/effect vocabularies                               | PENDING |
| Platform/SRE            | SLO, secrets, cache, monitoring, rollback and incident ownership           | PENDING |
| Product/Domain Owners   | Sensitive branch/resource/SoD path inventory                               | PENDING |

## 6. Decision choices

### A. Approve conditionally — recommended

Approve Option D as target architecture and authorize preparation of separately reviewed Non-Production Stage 4.0 Phase B implementation/evidence work only after D-02 through D-11 have named owners and approved outcomes.

### B. Approve architecture only

Approve Option D direction but keep all implementation and Phase B work HOLD until a second implementation authorization.

### C. Reject or request revision

Reject Option D or return specified decisions for redesign. Stage 4.0 Phase B and Beta remain HOLD.

## 7. Non-negotiable gate state

Until recorded CTO approval:

- RFC-0008 is not implementation authority;
- Stage 4.0 Phase B remains HOLD;
- Beta Gate remains HOLD;
- no deployment is authorized;
- no database schema, policy, role or function change is authorized;
- no migration is authorized;
- legacy `0002_authentication_rbac.sql` remains prohibited;
- Production remains disconnected and prohibited.

After CTO approval, resume only the bounded Stage 4.0 Phase B work explicitly authorized by the recorded decision. Beta does not open automatically.

# RFC-0008 — Architecture Decision Matrix

- **Status:** FINAL — SEALED FOR CTO DECISION
- **Scoring:** 1 = poor, 5 = strong
- **Non-negotiable:** No schema/M001–M016/legacy migration change

## 1. Options

### A. Supabase Postgres Custom Access Token Hook

A database function resolves IAM claims during token issuance.

- Requires a new database function, grants and hook configuration.
- Directly contradicts the no-schema/no-SQL constraint.
- Legacy hook is prohibited and incompatible with the approved IAM model.

### B. Edge Function HTTP Custom Access Token Hook

Supabase Auth sends a signed HTTP hook event to an Edge Function, which resolves IAM claims and returns updated claims.

- No database object is required.
- Produces a Supabase-signed JWT that frozen RLS can consume.
- Introduces a privileged resolver runtime, secret and availability dependency.
- Does not by itself solve branch/resource freshness.

### C. Application-side Claim Resolution

Next.js verifies a standard Supabase JWT and resolves IAM context per request without adding PAYSAVE claims to the Supabase JWT.

- Best freshness and simple revocation checks.
- Existing frozen RLS cannot receive `active_partner_id`/`tenant_scope` from the unchanged Supabase token.
- Application-only authority cannot safely substitute service-role access for caller RLS.

### D. Hybrid

Use the HTTP hook for minimal JWT claims needed by frozen RLS and existing app guards; resolve branch/resource/SoD-sensitive scope freshly in the server application.

- Preserves partner RLS and avoids oversized fine-scope tokens.
- Limits stale permission risk on high-impact operations.
- Has the greatest integration surface and requires coordinated operational ownership.

## 2. Matrix

| Criterion                         |  Weight | A: Postgres hook | B: Edge hook | C: App-side | D: Hybrid |
| --------------------------------- | ------: | ---------------: | -----------: | ----------: | --------: |
| Security / least privilege        |      25 |                3 |            3 |           4 |         4 |
| Frozen architecture compatibility |      25 |                1 |            4 |           3 |         4 |
| Frozen RLS compatibility          |      15 |                5 |            5 |           1 |         5 |
| Revocation/freshness              |      10 |                2 |            2 |           5 |         4 |
| Performance                       |      10 |                5 |            4 |           2 |         3 |
| Maintainability                   |       5 |                3 |            3 |           4 |         3 |
| Operational complexity            |      10 |                4 |            3 |           3 |         2 |
| **Weighted score / 5**            | **100** |         **2.70** |     **3.75** |    **3.15** |  **3.95** |

## 3. Detailed comparison

| Dimension                      | A                                             | B                                              | C                                      | D                                                                      |
| ------------------------------ | --------------------------------------------- | ---------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| Claim issuer                   | Supabase Auth after database hook             | Supabase Auth after signed HTTP hook           | No PAYSAVE claims in Supabase JWT      | Supabase Auth for coarse claims; app for fresh fine scope              |
| Schema impact                  | Required                                      | None                                           | None                                   | None                                                                   |
| Legacy dependency              | High temptation; prohibited                   | None                                           | None                                   | None                                                                   |
| Partner RLS                    | Native                                        | Native                                         | Incompatible without another mechanism | Native                                                                 |
| Branch/resource scope          | Token can bloat or remain incomplete          | Same limitation                                | Fresh lookup                           | Fresh lookup by design                                                 |
| Outage behavior                | Auth issue/refresh blocked on DB hook failure | Auth issue/refresh blocked on function failure | Requests blocked on resolver failure   | Login/refresh or scoped request blocked according to failing component |
| Credential risk                | Database execution grant                      | Broad server credential unless narrowed        | Server credential in application       | Credentials in hook and application scope path                         |
| Token freshness                | Refresh-bound                                 | Refresh-bound                                  | Request-bound                          | Coarse refresh-bound; sensitive scope request-bound                    |
| Current contract compatibility | Fails scope constraint                        | Fits Supabase and parser seams                 | Fails frozen RLS claim requirement     | Best overall fit                                                       |

## 4. Decision

**Recommend D — Hybrid.**

B is the minimum viable token-issuance component inside D. C is retained only for fine-grained fresh scope, not as a substitute for the Supabase JWT required by frozen RLS.

## 5. Rejected or deferred

- A is rejected under the present constraints.
- C alone is rejected because it cannot satisfy frozen partner RLS without an unsafe bypass or a future RLS redesign.
- B alone is insufficient for branch/resource/SoD freshness.
- D remains implementation-blocked until CTO approves the runtime component, authority sources, credential model and stale-token policy.

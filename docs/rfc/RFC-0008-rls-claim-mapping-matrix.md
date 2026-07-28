# RFC-0008 — RLS Claim Mapping Matrix

- **Status:** FINAL — SEALED FOR CTO DECISION
- **Frozen baseline:** M001–M016
- **Rule:** This matrix describes current enforcement honestly; it does not add RLS behavior.

## 1. Claim-to-control mapping

| Claim/source                   | Current frozen RLS use                                                                   | Application use                                                   | Enforcement status              | Boundary/gap                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| Supabase `sub`                 | `admin.current_auth_subject()` maps to `iam.users.auth_subject` and active membership    | `AuthContext.userId`                                              | Implemented contract            | Exact subject match required                                                             |
| `paysave.active_partner_id`    | `admin.current_partner_id()` and `admin.authorized_partner()` compare table `partner_id` | Write-target and tenant-context resolution                        | Implemented contract            | Null fails active-partner access                                                         |
| `paysave.tenant_scope=active`  | Partner access also requires matching active, non-deleted membership                     | Limits non-global writes to active partner                        | Implemented contract            | User status is not checked by `admin.authorized_partner()`                               |
| `paysave.tenant_scope=all`     | `admin.is_global_admin()` bypasses partner membership check                              | Global operations require explicit target partner                 | Implemented but high-risk       | Frozen schema has no approved global-grant authority or immediate token revocation check |
| `paysave.roles`                | Not read by M001–M016 RLS                                                                | Navigation/context; never sufficient alone                        | Application-only                | Current parser recognizes five role codes; approved IAM permits arbitrary role codes     |
| `paysave.permissions`          | Not read by M001–M016 RLS                                                                | `requirePermission` / `requireApiPermission` guards               | Application-only                | Stale until token refresh unless endpoint performs fresh check                           |
| `iam.membership_branch_scopes` | Table itself is partner-protected; branch IDs are not consumed by generic domain RLS     | Must be resolved for branch-sensitive use cases                   | Not integrated into current RLS | Direct browser access cannot claim branch isolation                                      |
| `iam.permission_scopes`        | Table itself is partner-protected; scope rows are not consumed by generic domain RLS     | Must be resolved for resource/classification-sensitive operations | Not integrated into current RLS | JWT permission code alone is insufficient for scoped grants                              |

## 2. Enforcement dimensions

| Requirement                        | Frozen RLS                                                         | Application layer                                     | RFC-0008 target                                              | Current readiness                           |
| ---------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| Partner isolation                  | Yes, through subject + active partner + membership or global scope | Duplicate pre-check                                   | Preserve both layers                                         | Ready for active-scope Staging tests        |
| Cross-partner write denial         | RLS denial                                                         | `resolveWritePartnerId` denial before repository      | Preserve both layers                                         | Code contract exists; live JWT path blocked |
| Branch scope                       | No generic branch predicate                                        | No complete shared branch-scope resolver evidenced    | Server-side fresh scope resolver                             | BLOCKED                                     |
| Permission code                    | No                                                                 | Existing route/use-case guards                        | JWT snapshot + guard                                         | Claim issuance blocked                      |
| Resource/data-classification scope | No generic scope predicate                                         | No complete shared scope resolver evidenced           | Fresh server-side resolver                                   | BLOCKED                                     |
| SoD/maker-checker                  | No generic claim predicate                                         | Domain-specific workflow control required             | Never infer from role/permission JWT alone                   | BLOCKED by workflow evidence                |
| Disabled user                      | No explicit user-status check in partner authorization             | May be denied by Auth if user is disabled             | Auth disable + session revoke + membership deactivation      | Partial                                     |
| Membership removal                 | Active-scope RLS checks membership each request                    | Token may still contain permissions                   | Remove membership and revoke sessions                        | Strong for active-scope partner access      |
| Global-scope revocation            | Token claim bypasses membership check                              | Token remains valid until expiry unless fresh checked | Keep issuance disabled pending approved authority/revocation | BLOCKED                                     |

## 3. Data-path policy

| Data path                                                   | Allowed use under RFC-0008                                                                               | Rationale                                                                  |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Browser → Supabase Data API                                 | Only operations fully protected by frozen partner RLS and not dependent on branch/resource/SoD freshness | Partner-level RLS is available; fine scope is not                          |
| Browser → Next.js API → Data API                            | Preferred for permission-controlled operations                                                           | Existing guards validate permissions and write partner                     |
| Browser → Next.js API → fresh IAM scope resolver → Data API | Required for branch/resource-sensitive operations                                                        | Provides current fine-grained scope outside JWT                            |
| Any service-role browser path                               | Prohibited                                                                                               | Bypasses user RLS and exposes broad authority                              |
| Global-scope direct access                                  | Prohibited until separately approved and tested                                                          | Current `all` claim bypass is too broad without authority/revocation proof |

## 4. Fail-closed rules

1. Missing/invalid `sub`, active partner or tenant scope yields no authorization context.
2. Active-scope access requires live active membership because frozen RLS rechecks it.
3. Permission code authorizes only the named action, never branch/resource scope implicitly.
4. A branch/resource-sensitive request without a fresh scope decision is denied.
5. `tenant_scope=all` is not issued in initial implementation.
6. A service-role credential is never used to make a user request appear RLS-authorized.

## 5. Required Staging evidence

- valid JWT active-partner read/write;
- cross-partner negative read and write;
- membership removal denial with an unexpired access token;
- permission removal stale-window measurement;
- branch-scope allowed and denied requests through the application path;
- direct Data API branch-sensitive request rejection or route prohibition;
- global-scope issuance disabled;
- no service-role credential in client bundles, cookies, logs or evidence.

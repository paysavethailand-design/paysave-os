# RFC-0008 — JWT Claim Specification

- **Status:** FINAL — SEALED FOR CTO DECISION
- **Contract version:** 1
- **Issuer:** Supabase Auth only
- **Audience:** PAYSAVE Next.js server and Supabase Data API
- **Authority:** IAM data at token issue/refresh time

## 1. Envelope

Supabase required standard claims are preserved. PAYSAVE adds one namespaced object:

```json
{
  "sub": "<supabase-auth-user-uuid>",
  "aud": "authenticated",
  "exp": 0,
  "iat": 0,
  "session_id": "<supabase-session-uuid>",
  "paysave": {
    "claims_version": 1,
    "session_version": 1,
    "active_partner_id": "<partner-uuid-or-null>",
    "tenant_scope": "active",
    "roles": ["agent"],
    "permissions": ["cases.read"]
  }
}
```

The numeric timestamps above are shape illustrations, not executable token values.

### Target contract versus current runtime

- This document defines the **target post-approval claim contract** only.
- The current `packages/security/src/auth-context.ts` parser does not declare or validate `claims_version`.
- Therefore unknown-version denial is an acceptance requirement, not current runtime evidence.
- No implementation may claim RFC-0008 conformance until a separately authorized parser change enforces the approved version and its negative tests pass.
- `session_version` is currently parsed but not compared with an authoritative current value; it remains compatibility-only and provides no immediate-revocation guarantee.

## 2. Claim contract

| Claim                       | Type                         | Required                             | Source and validation                                                    | Structural limit                                                           | Use                                             |
| --------------------------- | ---------------------------- | ------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------- |
| `sub`                       | UUID string                  | Yes                                  | Supabase Auth `user_id`; must match exactly one `iam.users.auth_subject` | 36 characters                                                              | Identity mapping and frozen RLS                 |
| `paysave.claims_version`    | positive integer             | Yes                                  | Issuer constant                                                          | `1` for this RFC                                                           | Claim schema negotiation                        |
| `paysave.session_version`   | positive integer             | Yes for current parser compatibility | Issuer constant `1` until a governed authority exists                    | 32-bit positive integer                                                    | Compatibility only; **not** proof of revocation |
| `paysave.active_partner_id` | UUID string or null          | Yes                                  | Validated session selector + active membership                           | 36 characters or null                                                      | Partner isolation and write-target resolution   |
| `paysave.tenant_scope`      | enum                         | Yes                                  | Approved authority source                                                | `active` or `all`                                                          | Active-partner versus global RLS path           |
| `paysave.roles`             | unique string array          | Yes                                  | Effective membership roles                                               | Maximum 5; each must match the existing application enum                   | UX/navigation and contextual policy only        |
| `paysave.permissions`       | unique permission-code array | Yes                                  | Effective allowed role permissions                                       | Parser maximum 200; each 3–100 characters and `<resource>.<action>` format | Application authorization guards                |

## 3. Byte limits

These are PAYSAVE policy budgets, not a claim about the provider's absolute platform maximum.

- Entire encoded JWT target: **≤ 4,096 bytes**.
- Serialized `paysave` JSON target: **≤ 2,048 UTF-8 bytes**.
- Hard behavior: reject token issuance when the approved budget is exceeded.
- Never truncate role or permission arrays because truncation creates non-deterministic authorization.
- The structural maximum of 200 permissions preserves compatibility with the current parser; the byte budget is the stricter operational limit.
- Staging must measure actual SSR cookie size, including Supabase cookie chunking behavior, before Beta.

## 4. Resolution semantics

### Active partner

- Null is fail-closed and yields no active-partner data access.
- A non-null value must correspond to an active, non-deleted membership for the current subject.
- Multi-membership users require a server-controlled selector; browser input is never accepted without revalidation.
- Partner switching requires a new token. A token is never rewritten client-side.

### Tenant scope

- `active`: only the validated active partner is eligible.
- `all`: global control-plane authority; issuance is disabled until CTO approves its source and revocation model.
- Role name alone cannot produce `all`.

### Roles

- Derived from currently effective membership-role assignments for the active partner.
- Role must be active, not deleted and supported by the existing application enum.
- Unknown/custom role codes fail issuance; they are not silently dropped.
- Roles do not bypass permission checks.

### Permissions

- Derived from active roles and current role-permission grants.
- Only an explicitly approved allow effect is emitted.
- Unknown effect values, conflicts or missing vocabulary fail closed.
- Codes are normalized only by exact canonical value; no case folding is performed by the token issuer unless governance approves it.
- Permission claims are application-layer snapshots; current frozen RLS does not consume them.

## 5. Versioning

- `claims_version` changes only for a breaking claim shape/semantic revision.
- Additive optional fields may retain version 1 only when all version-1 consumers ignore unknown fields safely.
- Removing, renaming, changing type or changing authorization meaning requires a new version and dual-reader rollout.
- Unknown versions are denied.
- `session_version` remains `1` for compatibility and must not be used as a revocation claim until an authoritative, mutable source and comparison point are separately approved.

## 6. Expiration and refresh

- Supabase standard `iat` and `exp` remain authoritative; no separate PAYSAVE expiry field is introduced.
- Proposed Stage/Beta access-token lifetime: **5 minutes uniformly** to bound stale permission/global-scope exposure.
- Refresh tokens use Supabase rotation and reuse detection policy.
- Every refresh re-resolves PAYSAVE claims.
- Security-sensitive removal triggers session revocation immediately; old access-token exposure remains bounded by `exp` unless the endpoint performs a fresh check.
- Clock skew allowance target: at most 60 seconds, subject to Supabase configuration verification.

## 7. Sensitive-data policy

Allowed:

- opaque UUIDs;
- normalized role codes;
- normalized permission codes;
- contract/version values.

Forbidden:

- names, email duplication, phone numbers, employee codes;
- branch lists, customer/case/resource IDs;
- financial, legal, location or classification payloads;
- secrets, API keys, refresh tokens, ciphertext or hashes usable as identifiers;
- raw IAM query diagnostics.

## 8. Validation behavior

| Condition                            | Result                                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Missing `paysave` object             | Deny/authentication context null                                                                           |
| Unknown claim version                | Target consumer must deny; current parser does not inspect it, so implementation readiness remains blocked |
| Invalid UUID or enum                 | Deny                                                                                                       |
| Unknown role or malformed permission | Deny                                                                                                       |
| Duplicate values                     | Issuer deduplicates before signing; consumer also deduplicates defensively                                 |
| Oversized claim set                  | Deny issuance; no truncation                                                                               |
| No active membership                 | Null partner or deny according to CTO decision; never infer access                                         |
| Resolver unavailable/timeout         | Deny issuance/refresh                                                                                      |

## 9. Open contract decisions

1. Uniform five-minute TTL approval.
2. Exact active/inactive status vocabulary for users, memberships and roles.
3. Exact allow/deny vocabulary and conflict precedence for `iam.role_permissions.effect`.
4. Multi-partner selector location and lifecycle.
5. Authoritative global-admin grant source.
6. Whether null-partner sessions may access any global read-only surface.

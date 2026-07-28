# Root Cause Analysis — Stage 4.0 Phase C.1

## JWT Hook

**Observed:** signed synthetic Staging hook probe returned HTTP 503, `x-paysave-failure-class=permission_denied`, body `claim_resolver_unavailable`.

**Evidence chain**

1. The Edge entrypoint creates a server-only Supabase client with the service-role key.
2. `SupabaseClaimSource` reads `iam.users`, memberships, membership roles and permission relations through PostgREST `.schema("iam")`.
3. Phase B.1 successfully added `iam` to exposed API schemas, removing the earlier schema-not-exposed class.
4. The next signed probe reached the resolver but PostgREST denied the required IAM read, proving exposure alone did not grant object authority.
5. The handler intentionally sanitizes the upstream failure to 503 and does not issue claims.

**Root cause:** authority mismatch. The runtime resolver uses the service-role Data API, while frozen database authority was designed around `iam.custom_access_token_hook(jsonb)` execution by `supabase_auth_admin`. Schema exposure does not grant the Edge service role the minimum IAM reads or EXECUTE authority it needs.

**Least-privilege remediation options requiring separate CTO authorization**

1. Preferred: expose one narrowly scoped, audited claim-resolver function/RPC that returns only the versioned claim contract; grant EXECUTE only to the dedicated server authority; retain deny-by-default table access.
2. Alternative: bind and use the existing native database Custom Access Token Hook under `supabase_auth_admin`, then retire the duplicate Edge resolver path after compatibility verification.
3. Not acceptable: broad IAM table grants, owner/database-password workaround, exposing raw IAM data to browser roles, or suppressing the failure.

Under the current C.1 prohibitions, the blocker is **not remediable** and must stay fail-closed.

## Recovery and Workflow

The mock replacement solves only read-path truthfulness. UI commands require APIs that either are absent or deliberately return 501. Ten lifecycle commands require atomic writes across multiple aggregates. Implementing them without the approved transaction boundary would create partial-commit risk and violate the frozen architecture.

## Configuration rollback

The local configuration drill recorded the candidate and rollback key versions, but its acceptance parser expected a readiness field that the endpoint did not return; both stages were marked FAIL despite HTTP 200. This is not Staging rollback proof. The drill must be corrected and rerun under an approved immutable Staging image/config mechanism before it can satisfy the gate.

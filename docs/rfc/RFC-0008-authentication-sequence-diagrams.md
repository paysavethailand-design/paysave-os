# RFC-0008 — Authentication Sequence Diagrams

- **Status:** FINAL — SEALED FOR CTO DECISION
- **Nature:** Design-only; no deployment or backend change is authorized

## 1. Login

```mermaid
sequenceDiagram
  actor User
  participant Web as Next.js Web
  participant Auth as Supabase Auth
  participant Hook as Claim Resolver Edge Function
  participant IAM as PAYSAVE IAM

  User->>Web: Submit credentials
  Web->>Auth: signInWithPassword
  Auth->>Auth: Verify credentials and AAL
  Auth->>Hook: Signed custom-token hook event
  Hook->>Hook: Verify webhook signature and replay window
  Hook->>IAM: Resolve subject, memberships, partner, roles, permissions
  IAM-->>Hook: Authoritative authorization rows
  alt valid, unambiguous, within size budget
    Hook-->>Auth: Updated claims
    Auth-->>Web: Signed access token + refresh session
    Web->>Web: Verify JWT and parse PAYSAVE claims
    Web-->>User: Authenticated route
  else invalid, ambiguous, oversized or unavailable
    Hook-->>Auth: Deny/error
    Auth-->>Web: Authentication/issuance failure
    Web-->>User: Generic access denied
  end
```

## 2. Refresh

```mermaid
sequenceDiagram
  participant Browser
  participant Web as Next.js SSR Middleware
  participant Auth as Supabase Auth
  participant Hook as Claim Resolver Edge Function
  participant IAM as PAYSAVE IAM

  Browser->>Web: Request with session cookies
  Web->>Auth: getClaims / refresh when required
  Auth->>Auth: Validate and rotate refresh token
  Auth->>Hook: Signed token_refresh event
  Hook->>IAM: Re-resolve current authorization
  alt authority remains valid
    IAM-->>Hook: Current snapshot
    Hook-->>Auth: Updated claims
    Auth-->>Web: New access token and refreshed cookies
    Web-->>Browser: Response with refreshed cookies
  else revoked, invalid or resolver failure
    Hook-->>Auth: Deny/error
    Auth-->>Web: Refresh failure
    Web-->>Browser: Clear/expire session and redirect to sign-in
  end
```

## 3. Logout

```mermaid
sequenceDiagram
  actor User
  participant Web as Next.js Web
  participant Auth as Supabase Auth
  participant Browser

  User->>Web: Logout
  Web->>Auth: Revoke current Supabase session
  Auth-->>Web: Refresh session revoked
  Web->>Browser: Clear SSR auth cookies
  Web-->>User: Redirect to sign-in
  Note over Auth,Browser: Previously issued access token may remain valid until exp
```

## 4. Permission change

```mermaid
sequenceDiagram
  actor Admin
  participant IAMAdmin as IAM Administration
  participant IAM as PAYSAVE IAM
  participant Revoker as Session Revocation Control
  participant Auth as Supabase Auth
  participant UserSession as Affected Session
  participant Hook as Claim Resolver Edge Function

  Admin->>IAMAdmin: Approve role/permission change
  IAMAdmin->>IAM: Persist governed grant/revoke
  IAM-->>Revoker: Authorization-change event or explicit request
  alt removal or urgent reduction
    Revoker->>Auth: Revoke affected refresh sessions
    Auth-->>UserSession: Future refresh denied
    Note over UserSession: Existing access token bounded by exp; sensitive endpoints require fresh check
  else addition or non-urgent change
    Note over UserSession: Effective at next refresh
  end
  UserSession->>Auth: Next permitted refresh
  Auth->>Hook: Signed token_refresh event
  Hook->>IAM: Resolve new authorization
  Hook-->>Auth: New permission snapshot
```

## 5. Cross-tenant request

```mermaid
sequenceDiagram
  actor User
  participant Web as Next.js API
  participant Guard as Auth/Permission Guard
  participant Data as Supabase Data API
  participant RLS as Frozen RLS
  participant IAM as PAYSAVE IAM

  User->>Web: Request target partner B with token for partner A
  Web->>Guard: Verify token and permission
  Guard->>Guard: Resolve requested write partner
  alt active-scope partner mismatch
    Guard-->>Web: Deny before repository access
    Web-->>User: 403 Forbidden
  else request reaches Data API
    Web->>Data: Caller JWT + partner-scoped operation
    Data->>RLS: Evaluate sub, active_partner_id, tenant_scope
    RLS->>IAM: Verify active membership for active scope
    alt partner/membership authorized
      RLS-->>Data: Permit partner-level operation
      Data-->>Web: Result
      Web-->>User: Result
    else unauthorized
      RLS-->>Data: Deny/empty result
      Data-->>Web: Denial
      Web-->>User: 403 or not-found policy
    end
  end
```

## 6. Partner switch

```mermaid
sequenceDiagram
  actor User
  participant Web as Next.js Web
  participant Selector as Server-controlled Partner Selector
  participant IAM as PAYSAVE IAM
  participant Auth as Supabase Auth
  participant Hook as Claim Resolver Edge Function

  User->>Web: Select partner B
  Web->>Selector: Request switch
  Selector->>IAM: Validate active membership in partner B
  alt membership valid
    Selector->>Auth: Update server-controlled selector and revoke/refresh session
    Auth->>Hook: Signed token issue/refresh event
    Hook->>IAM: Revalidate complete authorization for partner B
    Hook-->>Auth: Partner B claims
    Auth-->>Web: New session token
    Web-->>User: Partner B context active
  else invalid
    Selector-->>Web: Deny
    Web-->>User: Partner switch rejected
  end
```

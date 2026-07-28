# PAYSAVE Authentication Setup — SUPERSEDED

- **Status:** SUPERSEDED — DO NOT USE FOR IMPLEMENTATION OR OPERATIONS
- **Superseded on:** 2026-07-23
- **Reason:** This document previously referenced legacy authentication migrations and a database hook outside the approved M001–M016 baseline.

## Prohibition

- Do not apply `database/migrations/0001_paysave_recovery_foundation.sql` from this guide.
- Do not apply `database/migrations/0002_authentication_rbac.sql`.
- Do not configure the legacy database Custom Access Token Hook.
- Do not infer that a PAYSAVE JWT claim issuer currently exists.
- Do not access Production from this guide.

## Authoritative status

- M001–M016 are approved and frozen.
- RFC-0008 is the proposed Supabase JWT claim integration architecture.
- RFC-0008 remains pending CTO decision and does not authorize implementation or deployment.
- Stage 4.0 Phase B remains HOLD.
- Beta Gate remains HOLD.

See:

- `docs/rfc/RFC-0008-supabase-jwt-claim-integration.md`
- `docs/rfc/RFC-0008-implementation-readiness-assessment.md`
- `docs/staging-integration/STAGE_4_0_STATUS.md`

## Existing safe application contract

- Supabase Auth remains the identity provider.
- Protected server paths verify Supabase claims and parse the existing PAYSAVE context.
- Application permission guards supplement, but do not replace, database RLS.
- No service-role credential may be exposed to a browser or used to represent caller authorization.

Any future authentication setup guide must be created only after RFC-0008 approval and separate implementation authorization.

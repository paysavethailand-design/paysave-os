# PAYSAVE Backend Sprint #1 — Test Report v1.0

**Date:** 2026-07-22  
**Scope:** Authentication, Session Management, RBAC, User, Role, Permission, Partner, Customer, and Asset backend APIs  
**Database contracts:** Approved migrations M001–M016; no migration or production database changes were executed

## Result

**Code Backend Gate: PASS**

The complete repository quality chain finished with exit code `0` after correcting two generated-code defects: an accidental block-comment terminator and stale crypto package imports.

## Verified quality gates

| Gate                     | Result | Evidence                                                |
| ------------------------ | ------ | ------------------------------------------------------- |
| Architecture boundaries  | PASS   | `Architecture boundaries: PASS`                         |
| Architecture tests       | PASS   | 9/9                                                     |
| ESLint                   | PASS   | No errors or warnings reported                          |
| Prettier                 | PASS   | All matched files use Prettier code style               |
| TypeScript               | PASS   | All five workspaces completed `tsc --noEmit`            |
| Web tests                | PASS   | 73 files, 203 tests                                     |
| Observability tests      | PASS   | 1 file, 3 tests                                         |
| Security tests           | PASS   | 3 files, 19 tests                                       |
| Testing-package tests    | PASS   | 1 file, 2 tests                                         |
| UI regression tests      | PASS   | 1 file, 7 tests                                         |
| Total verified tests     | PASS   | 243 tests, including architecture tests                 |
| Next.js production build | PASS   | Next.js 15.5.20 compiled and generated all pages/routes |
| Dependency audit         | PASS   | `found 0 vulnerabilities`                               |

## API contract verification

- OpenAPI version: 3.1.0
- Server base path: `/api/v1`
- OpenAPI effective paths: 16
- Next.js `/api/v1` route files: 16
- Missing paths: none
- Extra paths: none

## Test coverage represented

- Authentication and current-session behavior
- Required permission enforcement and unauthorized/forbidden responses
- Tenant scope resolution and cross-partner denial
- UUID validation and Zod request validation
- Standard API success/error envelopes and correlation IDs
- Bounded cursor pagination
- User, Role, Permission, Partner, Customer, and Asset use cases
- Supabase repository mapping and database column contracts
- Customer/User `bytea` codecs and AES-256-GCM field encryption
- Customer normalized-name HMAC lookup hash
- Structured audit sink redaction
- Asset status transitions and history write sequence
- API route handlers using request-scoped dependencies

## Important environment limitation

The passing Repository and Route integration tests use the in-repository `FakeSupabaseClient`. They are deterministic contract/in-process integration tests; they are **not evidence of execution against a live Supabase/PostgreSQL environment**.

Consequently:

- Code Backend Gate: PASS
- Live Staging Database Integration Gate: NOT RUN
- Migration execution on Staging or Production: NOT CLAIMED
- Production deployment: NOT RUN

A separate Staging Gate must apply the approved migrations to an isolated Supabase/PostgreSQL environment and verify JWT claims, RLS, PostgREST schemas, encryption round trips, asset transition behavior, backup/restore, and cross-tenant denial before Production approval.

## Known schema-bound limitations

1. Role-permission revoke returns 501 because M003 has no DELETE RLS policy or soft-delete/validity contract for `iam.role_permissions`.
2. Asset status history insert and asset status update are sequential, not one database transaction. A future approved PostgreSQL RPC is recommended.
3. Audit events use masked structured stdout because the current global audit table contract does not support null-partner control-plane events.
4. Supabase Auth identity provisioning remains out-of-band; User API creates the `iam.users` directory record from an existing `authSubject`.
5. Customer identifier/contact/address child-table APIs are outside Sprint #1.

## Independent review

A read-only `agy` review completed with exit code `0` after inspecting the implementation and migrations. It reported:

- Critical blockers: 0
- Non-blocking/schema-bound limitations: 5
- Schema changes required for Sprint #1: none
- Recommendation: Backend Sprint #1 passes the Code Backend Gate

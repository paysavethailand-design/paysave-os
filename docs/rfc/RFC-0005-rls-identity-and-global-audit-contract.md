# RFC-0005 — Runtime Identity Contract for RLS and Global Audit

- **Status:** OPEN — BLOCKS M019 RLS and complete audit-trigger DDL
- **Logical impact:** None unless the database audit option is selected

## Missing runtime contract

The approved specification requires fail-closed tenant RLS, separately audited global authority, scoped service bypass and actor provenance, but does not freeze:

- authoritative JWT/session claim path for user and active partner
- mapping from authentication subject to `iam.users.auth_subject`
- global-admin authority claim and branch/permission scope representation
- service/worker bypass role and mandatory audit behavior
- request/correlation ID source and malformed/missing-claim behavior

Legacy migration `0002_authentication_rbac.sql` is explicitly frozen as a v1.1 draft and is not authority for v2.1.

## Global audit gap

`audit.audit_events.partner_id` is NOT NULL, but global control-plane mutations have no partner and sentinel tenants are prohibited. Complete global auditing therefore needs either:

1. an approved external immutable security-audit sink, or
2. a Physical Specification amendment allowing null partner only for global control-plane audit events with strict actor/authority checks.

## Required approval

IAM/Security owners must approve the claim contract, database roles, bypass semantics and global-audit destination before M019 and audit triggers are generated.

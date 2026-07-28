# PAYSAVE OS — Phase C Rollback Checklist

Status: BLOCKED / NOT REHEARSED. This document does not authorize rollback, restore or deployment.

## Scope and identity

- [x] Supabase Staging Project Ref recorded: `rptqfhtanjtrxtfbgrkb`
- [x] Production prohibited
- [x] No DB/schema/migration change authorized
- [ ] Exact Staging app release/revision/image digest
- [ ] Previous known-good immutable app/config digest
- [ ] Executor, validator and CTO decision authority

## Current Phase B config state

- [x] Exact inverse API config diff is documented
- [x] Auth pre/post hash is identical
- [ ] Live inverse API rollback executed — NOT EXECUTED; CTO Review required
- [ ] Post-rollback JWT probe passes

## Application/config rollback

- [ ] Approved Staging runtime exists
- [ ] Candidate and previous artifacts retrievable by digest
- [ ] Config references versioned; no secret values in evidence
- [ ] Rollback trigger and write containment approved
- [ ] Rehearsal measures health, identity, elapsed time and reconciliation

## Database restore boundary

- [ ] Provider backup/PITR enabled and fresh
- [ ] Restore procedure is provider-specific and owner-approved
- [ ] Restore to isolated target, never over source
- [ ] Validate migration ledger, schema, RLS, integrity, counts and tenant denial
- [ ] Measure actual RPO/RTO and reconcile synthetic records

## Gate

PASS requires executed managed Staging restore and immutable application/config rollback evidence with independent validation. Current verdict: BLOCKED.

# Secret Rotation Plan

**Status:** PLAN READY / REHEARSAL BLOCKED

## Scope

- `PAYSAVE_FIELD_ENCRYPTION_KEY`
- `PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION`
- Supabase publishable/runtime credentials as applicable
- Observability/error-tracking credentials when a backend is approved

No secret values may be placed in source, reports, command output or evidence bundles.

## Preconditions

1. Approved non-Production Secret Manager and owner.
2. Least-privilege read access for Staging runtime identity.
3. Immutable references and version metadata recorded without values.
4. Previous secret version retained for rollback during the approved window.
5. Field-encryption decryptability with the previous key is demonstrated before rotation.
6. Backup/restore point and rollback authority confirmed.

## Rotation rehearsal

1. Create a new secret version in the approved manager.
2. Validate its format without printing the value.
3. Update only the Staging secret reference/version.
4. Restart/reconcile Staging through the approved operator process; do not deploy from this program.
5. Verify `/readyz`, synthetic encrypt/decrypt and application smoke tests.
6. Confirm logs, metrics and error tracking contain no secret value.
7. Record secret reference, version, owner, timestamps and evidence hashes.
8. Revoke the previous version only after the rollback window and sign-off.

## Rollback

1. Restore the previous Secret Manager reference/version.
2. Reconcile Staging through the approved operator.
3. Re-run readiness and decryptability checks.
4. Preserve incident evidence and keep the new failed version disabled.

## Current blocker

The application accepts one active field-encryption key at runtime. Rotation must not proceed until old-key decryptability, data migration strategy and rollback behavior are proven in isolated Staging. This program does not alter encryption architecture or database schema.

# Disaster Recovery Checklist

## Guardrails

- [x] Production use is forbidden for this rehearsal.
- [x] Deployment is forbidden.
- [x] Database schema source changes are forbidden.
- [x] Local evidence is labeled local-only.

## Ownership and decision authority

- [ ] Incident commander assigned.
- [ ] Database recovery owner assigned.
- [ ] Application rollback owner assigned.
- [ ] Security/Secret Manager owner assigned.
- [ ] CTO decision authority confirmed.

## Backup and restore

- [x] Local PostgreSQL backup completed.
- [x] Local restore verification completed.
- [ ] Managed Staging backup policy verified.
- [ ] Staging restore point identified.
- [ ] Staging restore executed into an isolated target.
- [ ] Restored row/object/integrity checks passed.
- [ ] Measured RPO recorded.
- [ ] Measured RTO recorded.

## Application rollback

- [x] Local-only rollback tooling and tests pass.
- [ ] Candidate immutable image digest recorded.
- [ ] Previous known-good immutable image digest recorded.
- [ ] Candidate health/readiness/version evidence captured.
- [ ] Rollback authority decision captured.
- [ ] Previous image health/readiness/version evidence captured.
- [ ] Post-rollback data integrity verified.

## Observability and communications

- [ ] Metrics visible throughout drill.
- [ ] Alert fired and reached approved receiver.
- [ ] Error tracker captured synthetic event.
- [ ] Incident timeline and actions recorded.
- [ ] Stakeholder communication completed.

## Closure

- [ ] No unresolved critical/high incident findings.
- [ ] Evidence bundle checksum recorded.
- [ ] Owners sign off.
- [ ] CTO reviews Beta Gate proposal.

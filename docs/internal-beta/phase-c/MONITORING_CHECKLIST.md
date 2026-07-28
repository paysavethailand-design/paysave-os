# PAYSAVE OS — Phase C Monitoring Checklist

Status: PARTIAL CODE / BLOCKED OPERATIONALLY

## Observed 2026-07-24

| Signal                    | Evidence                                                                      | Status                                  |
| ------------------------- | ----------------------------------------------------------------------------- | --------------------------------------- |
| Supabase project          | `ACTIVE_HEALTHY`, ap-southeast-1                                              | PASS provider summary                   |
| Storage status            | HTTP 200, 128.3 ms unauthenticated status probe                               | PASS reachability                       |
| REST gateway              | HTTP 401, 97.8 ms without key                                                 | REACHABLE; authenticated API unverified |
| Realtime gateway          | HTTP 401, 105.3 ms without key                                                | REACHABLE; subscription flow unverified |
| Auth health               | HTTP 401, 398.1 ms without key                                                | REACHABLE; login/JWT blocked            |
| Edge Function             | `paysave-claims-hook`, ACTIVE v3, `verify_jwt=false`                          | DEPLOYED; claim resolver blocked        |
| Database                  | Remote stats succeeded; DB size 18 MB                                         | PASS connectivity                       |
| DB connections            | `supabase_admin=5`, `cli_login_postgres=1`, `authenticator=2`; limits 60 each | OBSERVED point-in-time                  |
| App `/healthz` `/metrics` | code/tests/build pass                                                         | LOCAL ONLY                              |
| App `/readyz`             | config-only                                                                   | PARTIAL                                 |
| Error rate / p95/p99      | no backend/dashboard                                                          | BLOCKED                                 |
| CPU / memory              | no approved runtime metrics                                                   | BLOCKED                                 |
| Queue depth/oldest age    | estimated queue rows 0; no worker evidence                                    | BLOCKED                                 |
| Central logs/traces       | no backend/retention/request-trace evidence                                   | BLOCKED                                 |
| Alerts                    | rules exist; receiver fire/ack/recover absent                                 | BLOCKED                                 |

## Required operational checks

- [ ] Scrape app and provider metrics into approved Staging backend.
- [ ] Dashboard availability, error rate, latency, CPU, memory, DB connections, storage/backup freshness, queue depth/age.
- [ ] Dependency-aware readiness checks DB/Auth/Storage with safe timeouts.
- [ ] Central audit/activity/error logs with retention, RBAC, redaction and release/correlation fields.
- [ ] Request trace linking API → dependency → logs without secrets/PII.
- [ ] Alert thresholds, primary/secondary receiver, runbooks and test Fire → Alert → Ack → Recover.
- [ ] Daily review records baseline, anomalies and evidence links.

Monitoring PASS requires live backend, dashboards, thresholds, routing and receiver test evidence. Current gate: BLOCKED.

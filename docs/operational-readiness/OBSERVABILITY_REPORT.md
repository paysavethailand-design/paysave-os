# Observability Report

**Program date:** 2026-07-23  
**Overall status:** **BLOCKED**  
**Code-side controls:** **PASS**

## Implemented and verified

| Control           | Result | Evidence                                                                   |
| ----------------- | ------ | -------------------------------------------------------------------------- |
| Liveness          | PASS   | Dynamic `GET /healthz`; route test                                         |
| Config readiness  | PASS   | Dynamic `GET /readyz`; fail-closed encryption/release checks               |
| Release identity  | PASS   | Dynamic `GET /version`; no-store response                                  |
| Metrics           | PASS   | Dynamic `GET /metrics`; Prometheus text exposition                         |
| Structured errors | PASS   | Correlation, method, path, code and error type; raw error message excluded |
| Metrics tests     | PASS   | Observability package tests pass                                           |
| Route tests       | PASS   | Operational endpoint tests pass 5/5                                        |
| Alert rules       | PASS   | `promtool check rules`: SUCCESS, 4 rules                                   |
| Build integration | PASS   | All four routes emitted as dynamic by Next.js production build             |

## Alert rules supplied

- Staging target down
- Readiness not ready
- Unhandled route error increase
- Metrics missing

Source: `ops/observability/paysave-staging-alerts.yml`

## Limitations and blockers

1. `/readyz` is explicitly **config-only**; it does not prove database or external dependency readiness.
2. No Staging Prometheus-compatible scraper/backend has been provisioned.
3. No alert receiver/on-call route and no alert firing/acknowledgement evidence.
4. Error tracker currently has a structured adapter and console implementation, but no approved external backend.
5. No live dashboard, retention policy or incident-routing evidence.

## Decision

Observability code is buildable and tested. Operational Observability remains **BLOCKED** until backend, routing and live Staging evidence exist.

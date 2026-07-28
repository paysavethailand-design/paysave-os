# PAYSAVE OS — Internal Beta Tester Guide

Status: DRAFT FOR CTO REVIEW — testing is not open.

## Allowed

- Use only the approved Staging URL and synthetic accounts/data.
- Test only assigned scenarios and record correlation IDs.
- Capture screenshots without secrets or real customer PII.
- Report bugs; do not repair permissions, grants, RLS, JWT, schema or migrations.

## Before each session

1. Verify Project Ref `rptqfhtanjtrxtfbgrkb` and visible Staging banner.
2. Record release version/revision/digest.
3. Confirm health/readiness and monitoring are green.
4. Confirm tester role and synthetic tenant.
5. Review Known Issues and stop conditions.

## How to report

Include scenario ID, timestamp with timezone, role, synthetic tenant/case ID, exact steps, expected/actual result, HTTP status, correlation ID, screenshot/log reference and reproducibility. Never paste passwords, tokens, keys, connection strings or raw PII.

## Severity

- Sev-1: Production exposure, secret/PII leak, cross-tenant access, corruption, total outage.
- Sev-2: critical workflow unavailable, incorrect authorization, duplicate financial/business effect, audit loss.
- Sev-3: material function or performance issue with workaround.
- Sev-4: cosmetic/copy/usability issue.

## Mandatory stop

Stop and notify CTO/Security for Sev-1/Sev-2, Production routing, authorization/RLS anomaly, missing audit trail, monitoring outage, or any instruction outside authorized scope.

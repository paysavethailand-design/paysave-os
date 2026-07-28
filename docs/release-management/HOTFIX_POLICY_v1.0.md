# PAYSAVE OS — Hotfix Policy v1.0

- **Owner:** Principal Release Manager
- **Approval authority:** CTO / Emergency Change Authority
- **Status:** Pending CTO Approval

## 1. Purpose

Define an accelerated but controlled path for correcting an urgent Production incident or vulnerability. A hotfix compresses waiting time; it does not remove security, tenant-isolation, data-integrity, artifact-provenance, test, approval, monitoring, or rollback controls.

## 2. Eligible Hotfix

A change is eligible only when delaying to the next planned patch creates greater risk and one of these applies:

- Active Sev-1 or high-impact Sev-2 Production incident
- Confirmed exploitable Critical/High vulnerability
- Cross-tenant, authorization, privacy, or sensitive-data exposure
- Data loss/corruption or material financial/business-integrity defect
- Production outage or severe degradation without safe operational workaround
- Mandatory external/provider compatibility break requiring immediate correction

A minor inconvenience, planned feature, refactor, dependency cleanup, performance tuning without active impact, or documentation-only request is not a hotfix.

## 3. Change Boundaries

A hotfix must:

- Be the smallest change that safely resolves or contains the incident.
- Avoid new feature scope, broad refactor, unrelated cleanup, and opportunistic dependency updates.
- Preserve supported contracts unless emergency risk requires a breaking containment approved by CTO.
- Preserve frozen architecture and follow normal approval for schema/migration changes; urgency does not authorize bypass.
- Include explicit blast radius, data impact, compatibility, and rollback analysis.

## 4. Versioning

- Stable hotfix increments PATCH: `X.Y.Z` → `X.Y.(Z+1)`.
- Candidate uses `X.Y.(Z+1)-rc.1` unless Emergency Change Authority approves a shortened observation period.
- Every modified candidate increments prerelease number.
- Never reuse or overwrite the affected release tag/artifact.
- A breaking emergency containment may require MAJOR and a separate compatibility decision.

## 5. Hotfix Workflow

1. **Declare incident** — assign severity, Incident Commander, affected version, impact, and containment.
2. **Approve hotfix path** — CTO/Emergency Change Authority confirms eligibility and target version.
3. **Freeze scope** — one incident, minimum corrective change, named owner.
4. **Prepare from Production baseline** — base on exact current Production tag/revision; document any divergence from main development line.
5. **Implement and review** — independent reviewer required; author cannot self-approve.
6. **Run mandatory gates** — targeted tests plus full repository architecture, test, typecheck, lint, format, build, secret, dependency, and relevant security/integration gates.
7. **Rehearse in production-like Staging** — exact artifact, configuration, migration, smoke, and rollback.
8. **UAT/Business validation** — focused critical scenario and non-regression around affected workflow.
9. **Emergency GO/NO-GO** — Engineering, QA, Security, Operations, Database if affected, Business, Release Manager, CTO.
10. **Deploy with Hotfix Go-live Runbook** — same immutable-artifact and stop-condition rules.
11. **Hypercare and reconcile** — monitor affected and adjacent signals; reconcile data if incident involved writes.
12. **Merge forward** — apply the fix to all supported future release lines; prevent regression.
13. **Post-incident review** — within five business days for Sev-1/Sev-2/security/data event.

## 6. Mandatory Gates That Cannot Be Skipped

- Artifact/version/source identity and independent review
- Targeted and full relevant regression tests
- Secret and Critical/High vulnerability checks
- Auth/RBAC/RLS/tenant-isolation validation when affected
- Data-integrity and reconciliation validation when affected
- Backup/recovery point and rollback/forward-fix readiness
- Production monitoring, on-call, and decision authority
- Release notes/security advisory/support brief appropriate to audience

If a gate cannot execute, Emergency Change Authority must choose containment/rollback rather than claim the hotfix safe.

## 7. Emergency Evidence Record

```text
Incident ID/severity:
Affected version/artifact:
Impact and affected tenants/workflows/data:
Containment:
Why normal patch timing is unsafe:
Hotfix scope and exclusions:
Target version/artifact digest:
Security/data/database impact:
Tests and review:
Staging rehearsal:
Rollback strategy:
Approvals:
Deployment/validation:
Follow-up and merge-forward:
```

## 8. Database and Data Hotfixes

- No ad hoc Production SQL.
- Database hotfix requires Database Owner and CTO approval, exact script/migration identity, backup/recovery point, Staging rehearsal, integrity/reconciliation queries, and rollback or forward-fix plan.
- If safe database correction cannot be proven, contain writes/feature and invoke incident recovery instead.
- Never disguise a schema/architecture change as a patch to bypass its approval gate.

## 9. Security Hotfix Disclosure

- Coordinate disclosure with Security Owner.
- Do not expose exploit details before remediation and stakeholder approval.
- Rotate credentials/keys if exposure is possible; never place replacement secrets in release evidence.
- Preserve audit and forensic evidence according to retention/legal-hold requirements.

## 10. Completion Criteria

- Incident impact resolved or acceptably contained.
- Hotfix artifact validated and monitored.
- No unresolved Sev-1/Sev-2 symptom related to the change.
- Data reconciliation completed where relevant.
- Support and stakeholders informed.
- Fix merged forward to all supported lines.
- Post-incident actions assigned with deadlines.

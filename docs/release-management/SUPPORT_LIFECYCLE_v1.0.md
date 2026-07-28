# PAYSAVE OS — Support Lifecycle Policy v1.0

- **Owner:** Principal Release Manager with Support and Product Owners
- **Approval:** CTO
- **Status:** Pending CTO Approval

## 1. Purpose

Define which PAYSAVE OS versions receive operational support, defect fixes, security fixes, and upgrade assistance. Support status never converts an Alpha/Beta/RC artifact into Production Ready.

## 2. Lifecycle States

| State                | Meaning                                               | New deployment allowed                  |
| -------------------- | ----------------------------------------------------- | --------------------------------------- |
| Development          | Unreleased internal source baseline                   | No                                      |
| Alpha                | Incomplete internal integration build                 | Isolated Alpha only                     |
| Beta                 | Feature-complete Staging/UAT build                    | Production-like Staging only            |
| RC                   | Production-intent artifact under final gate/bake      | Production-like Staging only until GO   |
| Active               | Current approved Production release line              | Yes                                     |
| Maintenance          | Prior supported minor line receiving restricted fixes | Existing users only unless CTO approves |
| Security-only        | Critical security/data-integrity fixes only           | No new rollout by default               |
| End of Support (EOS) | No routine fix or operational commitment              | No                                      |
| Yanked               | Unsafe/integrity-compromised artifact                 | Prohibited                              |

## 3. Pre-1.0 Support

- Versions below `1.0.0` are development/prerelease unless a specific CTO decision states otherwise.
- Only the latest Alpha/Beta/RC candidate in the active train is supported for test/UAT.
- Older prereleases are superseded immediately when the next candidate is accepted.
- No Production availability, compatibility, or long-term-support commitment exists before Production Ready approval.

## 4. Production Support Window (1.0.0+)

### Current Minor (`N.M.latest`)

- **State:** Active
- Full defect triage, security fixes, patch releases, operational support, and upgrade guidance.
- Only the latest patch of the minor line is the preferred deployment target.

### Previous Minor (`N.(M-1).latest`)

- **State:** Maintenance for 90 calendar days after the next minor enters Production.
- Receives Sev-1/Sev-2, Critical/High security, data-integrity, and regulatory fixes where technically safe.
- Routine enhancements and low-severity fixes move to the current minor.

### Older Minor/Major

- Moves to End of Support unless a CTO-approved Long-Term Support designation exists.
- Emergency assistance may require a separately approved commercial/operational decision and does not imply ongoing support.

## 5. Patch Supersession

- A newer patch supersedes older patches in the same minor line.
- Superseded patches receive a 30-calendar-day transition period for upgrade, unless security/data risk requires immediate yanking.
- Security fixes are not guaranteed to be backported to every old patch; supported target is the latest patch on the supported minor.
- Artifact/history is retained for audit even after supersession or yanking.

## 6. Long-Term Support (LTS)

There is no automatic LTS designation.

An LTS release requires a separate CTO decision defining:

- Exact major/minor line
- Standard and extended support dates
- Backport scope and staffing
- Dependency/runtime/provider support compatibility
- Security response and upgrade path
- Database and API compatibility commitments

If no explicit record exists, normal lifecycle rules apply.

## 7. Severity and Response Objectives

These are internal response objectives and begin when Support/Operations confirms the incident.

| Severity       | Definition                                                                                                                    | Acknowledge target | Action target                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- | -----------------: | ---------------------------------------------------------------- |
| Sev-1 Critical | Widespread outage, confirmed cross-tenant/security event, material data loss/corruption, critical financial-integrity failure |         15 minutes | Immediate incident command; contain/rollback/hotfix continuously |
| Sev-2 High     | Major critical-flow failure, severe degradation, high-impact security risk without confirmed exploitation                     |         30 minutes | Mitigation plan within 2 hours; hotfix/rollback decision         |
| Sev-3 Medium   | Limited impact with workaround; no critical integrity/security failure                                                        |     1 business day | Planned patch/release disposition within 5 business days         |
| Sev-4 Low      | Minor defect, cosmetic/documentation issue, enhancement request                                                               |    2 business days | Backlog/release planning disposition                             |

These targets require an approved staffed on-call model before Production. If staffing cannot meet them, Production Readiness fails.

## 8. Support Channels and Escalation

Each Production release record must identify controlled channels for:

- User/business support intake
- Sev-1/Sev-2 incident declaration
- Security/privacy escalation
- Database/data-integrity escalation
- Provider/dependency escalation
- Release/status communications

Secrets and restricted customer/financial data must not be posted in general support channels. Evidence access follows classification and least privilege.

## 9. End-of-Support Process

1. Release Manager proposes EOS date and affected versions.
2. Engineering/Security/Database assess known risk and upgrade path.
3. Product/Support identify affected users/business owners.
4. Notify at least 60 calendar days before planned EOS where a supported Production version exists.
5. Issue reminders at 30 and 7 days.
6. Confirm supported replacement and migration/rollback guidance.
7. At EOS, block new deployment of unsupported artifact through release governance.
8. Retain artifact identity, release notes, incidents, and approvals for audit.

A version may be yanked immediately without the notice period if continued use creates unacceptable security, data-integrity, or regulatory risk.

## 10. Dependency and Platform End-of-Life

- Runtime/provider/dependency EOL dates are reviewed at least quarterly.
- A PAYSAVE version cannot remain supported beyond a critical unsupported runtime/provider unless CTO accepts a time-bounded plan with compensating controls.
- Upgrade work follows normal SemVer and release gates.
- Dependency support never authorizes an architecture change without the applicable approval.

## 11. Support Handoff Per Release

Before Production GO, Support receives:

- Version, scope, release notes, known issues, workarounds
- Critical workflows and validation steps
- Supported browsers/runtime/environment assumptions
- Monitoring/status and incident channels
- Severity examples and escalation matrix
- Rollback/hotfix decision path
- Support period and superseded/EOS versions

## 12. Current Status

As of 2026-07-22, PAYSAVE OS is not Production Ready; no Production support lifecycle has started. Current `0.1.0` is treated as a development baseline, not an Active Production release.

# PAYSAVE OS — Versioning Policy (Semantic Versioning) v1.0

- **Owner:** Principal Release Manager
- **Approval:** CTO
- **Status:** Pending CTO Approval
- **Applies to:** PAYSAVE OS product releases and private first-party workspaces

## 1. Standard

PAYSAVE OS uses Semantic Versioning 2.0.0:

```text
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]
```

Examples:

- `0.2.0-alpha.1`
- `0.2.0-beta.2`
- `0.2.0-rc.1`
- `1.0.0`
- `1.0.1`
- `1.1.0`
- `2.0.0`

Version precedence follows SemVer. Build metadata does not change precedence.

## 2. Version Source of Truth

- The approved product version is the root PAYSAVE OS release record and root `package.json` version once an authorized release change updates it.
- First-party private workspaces (`apps/*`, `packages/*`) move in lockstep with the product version unless CTO approves independent package versioning later.
- The lockfile, release tag, artifact metadata, release notes, and deployment record must agree.
- Current repository value `0.1.0` is a development baseline and is not proof of a Production release.
- This policy does not itself authorize changing any version file.

## 3. Increment Rules

### MAJOR (`X.0.0`)

Increment MAJOR when an approved Production release introduces an incompatible change to a supported public/partner API, event contract, operational contract, data-export contract, or supported user workflow.

Examples:

- Removing or changing required API fields incompatibly
- Removing a supported permission/role behavior
- Incompatible event schema or webhook behavior
- Requiring a non-backward-compatible client upgrade
- A migration that intentionally prevents rollback to the supported previous application version

MAJOR changes require architecture/contract approval before release planning. This policy does not grant that approval.

### MINOR (`X.Y.0`)

Increment MINOR for backward-compatible functionality:

- New supported feature
- New optional API field or endpoint
- New role/permission capability that preserves prior behavior
- Backward-compatible workflow or reporting capability
- Significant operational capability without breaking supported contracts

### PATCH (`X.Y.Z`)

Increment PATCH for backward-compatible corrections:

- Defect fix
- Security fix without public contract break
- Performance/reliability improvement preserving behavior
- Documentation/configuration correction shipped as part of a deployable artifact
- Backward-compatible dependency update

A patch must not contain a new business feature or intentional breaking change.

## 4. Pre-1.0 Rule

Before `1.0.0`, PAYSAVE OS is not under a stable Production compatibility promise.

- Breaking development change: increment MINOR (`0.2.0` → `0.3.0`)
- Backward-compatible feature: increment MINOR
- Backward-compatible fix: increment PATCH
- Every promoted build uses a prerelease suffix until Production approval.

`1.0.0` is allowed only when the Production Ready definition and Production Readiness Checklist pass.

## 5. Milestone Identifiers

| Milestone  | Format          | Example         | Meaning                                |
| ---------- | --------------- | --------------- | -------------------------------------- |
| Alpha      | `X.Y.Z-alpha.N` | `0.2.0-alpha.1` | Incomplete internal integration build  |
| Beta       | `X.Y.Z-beta.N`  | `0.2.0-beta.1`  | Feature-complete Staging/UAT build     |
| RC         | `X.Y.Z-rc.N`    | `0.2.0-rc.1`    | Immutable production-intent candidate  |
| Production | `X.Y.Z`         | `1.0.0`         | Stable release approved for Production |

`N` starts at 1 and increments for every changed artifact. Prerelease numbers are never reused.

## 6. Candidate Mutation Rule

Any change to code, first-party dependency, lockfile, runtime configuration contract, migration, seed, generated contract, or artifact content after an RC is built:

1. Invalidates the prior candidate for promotion.
2. Requires the next RC number.
3. Requires affected tests plus the full mandatory gate chain.
4. Restarts the applicable RC bake period.

Documentation-only correction may retain the artifact candidate only if it does not change execution, user obligation, support scope, known-risk interpretation, or gate decision; the Release Manager records the rationale.

## 7. Release Tags and Artifact Identity

Recommended immutable release tag:

```text
paysave-os-vX.Y.Z[-prerelease.N]
```

Examples:

- `paysave-os-v0.2.0-alpha.1`
- `paysave-os-v0.2.0-rc.2`
- `paysave-os-v1.0.0`

Required identity tuple:

```text
Product version + source revision + artifact digest + dependency-lock digest + migration manifest digest
```

A moved/reused tag, overwritten artifact, or missing digest invalidates RC/Production provenance.

## 8. Build Metadata

Optional SemVer build metadata may carry non-sensitive provenance:

```text
1.2.3+build.20260722.sha.abcdef0
```

Rules:

- Never place secrets, customer identifiers, tenant identifiers, or environment credentials in version strings.
- Production promotion uses the immutable artifact digest, not build metadata alone.
- Build metadata cannot be used to bypass a PATCH/MINOR/MAJOR increment.

## 9. API and Contract Compatibility

For every release, classify changes to:

- REST/OpenAPI
- Authentication/session behavior
- RBAC/permission codes and RLS expectations
- Events/webhooks
- Data import/export
- Database migrations/seeds
- Operational environment variables
- Support and runbook obligations

If compatibility is ambiguous, choose the higher version increment or obtain Architecture/CTO decision before release labeling.

## 10. Database and Migration Versioning

- Migration filenames remain immutable after approval/execution.
- Product SemVer and migration sequence are related but not identical.
- A backward-compatible schema expansion may ship in MINOR or PATCH according to user-visible behavior and risk.
- A destructive/incompatible migration cannot be hidden in a PATCH.
- Every release record lists exact migrations/seeds and compatibility with the previous supported application version.
- This policy does not authorize new SQL, DDL, migration, or rollback behavior.

## 11. Hotfix and Patch Versioning

- Production hotfix: next PATCH, e.g. `1.4.2` → `1.4.3`.
- Hotfix candidate: `1.4.3-rc.1` unless emergency authority explicitly compresses the candidate duration; mandatory safety gates remain.
- Multiple fixes may share one PATCH only when they are independently low-risk and the combined regression scope is approved.
- A fix requiring breaking behavior uses MAJOR, not a disguised patch.

## 12. Version Reservation and Approval

1. Release Manager proposes the target version at scope entry.
2. Engineering identifies compatibility impact.
3. Product confirms feature classification.
4. Security/Database/Operations identify release-risk impact.
5. Release Manager confirms SemVer.
6. CTO approves RC and Production labels.

A version number may be reserved for planning but must not be represented as released before the gate passes.

## 13. Superseded and Yanked Releases

- Superseded: a newer supported patch/minor exists; lifecycle follows Support Lifecycle policy.
- Yanked: artifact must not be newly deployed because of integrity/security/operational risk.
- A yanked version is never deleted from the audit trail; it is marked withdrawn with reason, timestamp, decision owner, and remediation version.
- Reusing a yanked version number is prohibited.

## 14. Document Versioning

Governance documents use their own document version (for example `v1.0`) and do not automatically change product SemVer. A material policy change requires document MINOR/MAJOR revision and approval according to document governance.

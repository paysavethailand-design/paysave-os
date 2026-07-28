# RFC-0008 — Independent Review and Reconciliation Record

- **Review batch:** `deleg_00f5f0f5`
- **Review completed:** 2026-07-23
- **Reconciled at:** 2026-07-23T11:43:31Z
- **Scope:** Seven RFC-0008 deliverables, frozen architecture, M003 IAM/RLS contract and current application Auth seams
- **Change class:** Documentation only
- **Implementation authority:** None

## 1. Independent verdicts

| Review                   | Verdict                                                    | Meaning                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture Consistency | FAIL for current implementation; Hybrid is conditional     | Direction is compatible in principle, but target/current seams and authority decisions remain unresolved                                          |
| Identity & Security      | Conditional Fail                                           | Malformed-claim handling exists, but revocation, hook binding, fine-grained scope and privileged credential controls are not implementation-ready |
| Governance & Scope       | PASS for document scope; FAIL for implementation readiness | Prohibited actions are not authorized and HOLD is represented correctly; legacy guidance and review closure required remediation                  |

The independent verdicts are preserved. Reconciliation does not relabel an implementation failure as a pass.

## 2. Architecture findings and dispositions

| ID   | Finding                                                                      | Disposition                                                                                                                                                        |
| ---- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A-01 | Target `claims_version` is not enforced by the current parser                | Accepted. Claim spec now distinguishes target contract from current runtime; parser change and negative tests require separate authorization and block conformance |
| A-02 | `tenant_scope=all` has no approved authority source and frozen RLS trusts it | Accepted as Critical. Issuance stays disabled pending CTO/CISO decision and emergency-revocation design                                                            |
| A-03 | Frozen partner authorization does not check IAM user status                  | Accepted. Disable workflow must also disable Auth, revoke sessions and deactivate memberships; runtime proof is required                                           |
| A-04 | IAM role/effect vocabulary does not match the strict application contract    | Accepted. Unknown values fail closed; vocabularies and conflict precedence require IAM/CISO approval                                                               |
| A-05 | Branch/resource scope is not generic RLS enforcement                         | Accepted. Sensitive paths remain application-only. Proposed claim/RLS expansion is rejected from this RFC because it would violate frozen-schema scope             |
| A-06 | Multi-partner selector authority is absent                                   | Accepted. CTO/IAM must define a server-controlled selector; ambiguous sessions cannot receive partner authority                                                    |
| A-07 | Edge Function creates an additional runtime trust boundary                   | Accepted. Enterprise Architecture and CTO approval are mandatory before any implementation                                                                         |

## 3. Identity and security findings and dispositions

| ID   | Finding                                                               | Disposition                                                                                                                                                         |
| ---- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-01 | `session_version` is parsed but not compared with current authority   | Accepted. It remains compatibility-only and cannot be cited as revocation evidence                                                                                  |
| S-02 | HTTP hook registration, issuance and outage behavior are unproven     | Accepted as Critical. Deterministic binding/config, signed-event, issued-token, outage and rollback evidence are Beta blockers                                      |
| S-03 | Branch/resource enforcement is incomplete                             | Accepted as a blocked capability. No branch claim, parser, RLS or schema change is made; a separately approved future decision is required for database enforcement |
| S-04 | Disabled user may retain an authenticated context or unexpired token  | Accepted. User disable acceptance requires Auth disable, session revoke, membership deactivation and measured residual window                                       |
| S-05 | Malformed/missing current claims fail closed in existing parser seams | Accepted as existing positive evidence, but it does not prove target version handling or issuance                                                                   |
| S-06 | Broad service-role capability can bypass RLS                          | Accepted as Critical. User-context request-path use is prohibited; resolver access must be isolated, audited and Security-approved                                  |

## 4. Governance findings and dispositions

| ID   | Finding                                                            | Disposition                                                                                                                   |
| ---- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| G-01 | Legacy authentication guide directed prohibited migration/hook use | Closed as documentation risk: `docs/security/AUTHENTICATION_SETUP.md` is now explicitly superseded and contains no setup path |
| G-02 | Stage 4.0 operational blockers remain open                         | Accepted. Phase B and Beta remain HOLD; no implementation or deployment evidence was inferred                                 |
| G-03 | Independent sign-off/evidence lock was absent                      | Closed for RFC handoff by this review record and the sealed manifest; human approvals remain pending                          |

## 5. Rejected or deferred remediation

The following reviewer suggestions are not implemented because they exceed RFC-0008 constraints:

- adding branch/resource claims;
- changing the application parser or authorization guards;
- extending RLS helpers or policies;
- creating a database revocation source or session-version store;
- applying or adapting the legacy database hook;
- deploying an Edge Function or changing Supabase Auth configuration.

They may be considered only after CTO approval through separately scoped, reviewed and tested change authorization.

## 6. Closure result

- **RFC design package:** ready for CTO decision.
- **Architecture implementation:** not ready.
- **Security implementation:** not ready.
- **Governance scope:** pass after documentation reconciliation.
- **Stage 4.0 Phase B:** HOLD.
- **Beta Gate:** HOLD.
- **Production:** prohibited and not accessed.

No Critical risk is closed by document wording alone. Required runtime evidence remains mandatory after authorization.

# Recovery Transaction Gap Report

**Status:** Open architecture gaps — awaiting CTO Review  
**Sprint:** Backend Sprint #2 — Recovery Core  
**Required response for every item:** HTTP `501 Not Implemented`  
**Error code:** `atomic_transaction_not_supported`  
**Reason:** `Atomic multi-aggregate transaction is not yet supported by the current approved architecture.`

No endpoint below performs a repository write.

## Gap 1 — Close Recovery Case

- **Endpoint:** `POST /api/v1/recovery/cases/{caseId}/close`
- **Business Capability:** Close an active recovery case.
- **Required Transaction Scope:** Update `recovery.cases`; append immutable case timeline event; update workflow instance and append workflow history; create any required outbox/audit linkage atomically.
- **Current Limitation:** Approved request-scoped Supabase repository supports individual table operations but has no approved atomic multi-aggregate transaction boundary.
- **Proposed Future Architecture:** CTO-approved application Unit of Work / transaction boundary that atomically coordinates Recovery, Workflow, Timeline, and Outbox adapters without exposing transaction mechanics to route handlers.
- **Blocking Dependency:** Approved transaction architecture, adapter contract, rollback semantics, idempotency contract, and live integration-test environment.

## Gap 2 — Reopen Recovery Case

- **Endpoint:** `POST /api/v1/recovery/cases/{caseId}/reopen`
- **Business Capability:** Reopen a previously closed recovery case.
- **Required Transaction Scope:** Update `recovery.cases`; restore/transition workflow state; append workflow history and immutable timeline event; create any required outbox record atomically.
- **Current Limitation:** No approved atomic boundary across case, workflow, timeline, and outbox aggregates.
- **Proposed Future Architecture:** Same CTO-approved Unit of Work / transaction boundary used by all Recovery lifecycle commands, with explicit reopen invariants and compensating-failure policy.
- **Blocking Dependency:** Transaction architecture approval, reopen domain rules, adapter implementation, idempotency key policy, and rollback tests.

## Gap 3 — Reassign Agent

- **Endpoint:** `POST /api/v1/recovery/assignments/{assignmentId}/reassign`
- **Business Capability:** Transfer active recovery work from one agent/team to another.
- **Required Transaction Scope:** Update active `workforce.assignments`; append assignment history; append handoff record; append case timeline event; create any required notification/outbox record atomically.
- **Current Limitation:** Current architecture cannot atomically coordinate assignment, handoff, history, timeline, and outbox writes.
- **Proposed Future Architecture:** CTO-approved transactional command handler with assignment/handoff repositories participating in one Unit of Work and an atomic outbox.
- **Blocking Dependency:** Approved transaction boundary, handoff invariant specification, notification/outbox policy, and concurrency tests.

## Gap 4 — Accept Assignment

- **Endpoint:** `POST /api/v1/recovery/assignments/{assignmentId}/accept`
- **Business Capability:** Agent accepts ownership of an assigned recovery task.
- **Required Transaction Scope:** Update assignment status/version; append assignment history; append case timeline event; update any workflow/work-item state and outbox record atomically.
- **Current Limitation:** No approved transaction boundary across assignment, workflow/work item, timeline, and outbox aggregates.
- **Proposed Future Architecture:** Transactional assignment lifecycle command under the shared Recovery Unit of Work with optimistic concurrency and idempotent command processing.
- **Blocking Dependency:** Transaction architecture approval, status-transition matrix, idempotency contract, and rollback/integration tests.

## Gap 5 — Reject Assignment

- **Endpoint:** `POST /api/v1/recovery/assignments/{assignmentId}/reject`
- **Business Capability:** Agent rejects an assignment and returns it for reassignment/escalation.
- **Required Transaction Scope:** Update assignment status/version; append assignment history and rejection reason; append timeline event; create escalation/requeue work item and outbox notification atomically.
- **Current Limitation:** Current approved repositories cannot guarantee all rejection, requeue, timeline, and notification writes commit or roll back together.
- **Proposed Future Architecture:** Transactional assignment rejection command with a Unit of Work and atomic outbox/requeue integration.
- **Blocking Dependency:** Approved transaction adapter, rejection/requeue rules, escalation policy, idempotency, and failure-recovery tests.

## Gap 6 — Complete Assignment

- **Endpoint:** `POST /api/v1/recovery/assignments/{assignmentId}/complete`
- **Business Capability:** Mark assigned recovery work complete.
- **Required Transaction Scope:** Update assignment status/version and completion time; append assignment history; update workflow/work item; append timeline event; create any follow-up/outbox records atomically.
- **Current Limitation:** No approved atomic boundary spans assignment completion, workflow progression, timeline, and outbox effects.
- **Proposed Future Architecture:** Transactional assignment-completion command in the shared Unit of Work with explicit completion invariants and retry-safe outbox dispatch.
- **Blocking Dependency:** Transaction architecture approval, completion rules, downstream work-item behavior, and end-to-end rollback tests.

## Gap 7 — Execute Workflow Transition

- **Endpoint:** `POST /api/v1/recovery/workflow/transitions`
- **Business Capability:** Execute a validated Recovery workflow/status transition.
- **Required Transaction Scope:** Lock/check workflow instance version; update current state; append `workflow.instance_history`; mutate work items when defined; update the Recovery aggregate when required; append timeline and outbox records atomically.
- **Current Limitation:** Validation and transition discovery are supported, but mutation across workflow, Recovery, work-item, timeline, and outbox aggregates has no approved transaction architecture.
- **Proposed Future Architecture:** Versioned workflow command executor inside a CTO-approved Unit of Work, with transition policy evaluation before commit and atomic history/outbox persistence.
- **Blocking Dependency:** Transaction boundary approval, workflow execution contract, transition side-effect catalog, idempotency, and race-condition tests.

## Gap 8 — Fulfill Promise to Pay

- **Endpoint:** `POST /api/v1/recovery/promises-to-pay/{promiseId}/fulfill`
- **Business Capability:** Mark a promise to pay fulfilled after confirmed payment evidence.
- **Required Transaction Scope:** Update `workforce.promises_to_pay`; append promise status history; append case timeline event; update case/workflow status when applicable; create outbox/audit linkage atomically.
- **Current Limitation:** Current architecture cannot atomically coordinate promise, history, case/workflow, timeline, and outbox writes.
- **Proposed Future Architecture:** Transactional Promise-to-Pay lifecycle handler participating in the Recovery Unit of Work, driven only by confirmed payment evidence and idempotency keys.
- **Blocking Dependency:** Transaction architecture approval, fulfillment evidence rules, history contract, workflow side effects, and integration tests.

## Gap 9 — Mark Promise to Pay Broken

- **Endpoint:** `POST /api/v1/recovery/promises-to-pay/{promiseId}/broken`
- **Business Capability:** Mark an overdue/unmet promise as broken and trigger collection follow-up.
- **Required Transaction Scope:** Update promise status/version; append promise status history; update case priority/next action or workflow state; append timeline event; create follow-up work item and outbox record atomically.
- **Current Limitation:** No approved atomic transaction coordinates promise, case/workflow, work-item, timeline, and outbox aggregates.
- **Proposed Future Architecture:** Scheduled or command-driven Promise-to-Pay breach handler within the shared Unit of Work, with deterministic due-time evaluation and atomic follow-up creation.
- **Blocking Dependency:** Transaction architecture approval, due-time/timezone policy, breach rules, scheduler/idempotency design, and rollback tests.

## Gap 10 — Cancel Promise to Pay

- **Endpoint:** `POST /api/v1/recovery/promises-to-pay/{promiseId}/cancel`
- **Business Capability:** Cancel an active promise to pay with a controlled reason.
- **Required Transaction Scope:** Update promise status/version; append promise status history and cancellation reason; append case timeline event; adjust case/workflow/follow-up state and outbox record atomically.
- **Current Limitation:** Current approved architecture cannot guarantee atomic cancellation across promise, history, Recovery/workflow, timeline, and outbox aggregates.
- **Proposed Future Architecture:** Transactional Promise-to-Pay cancellation command under the Recovery Unit of Work with reason policy, optimistic concurrency, idempotency, and atomic outbox.
- **Blocking Dependency:** Transaction architecture approval, cancellation reason/status rules, workflow side-effect policy, and end-to-end integration tests.

## Summary

- **Total blocked endpoints:** 10
- **Implemented behavior:** All return HTTP 501 with the exact code and reason above.
- **Repository writes from blocked endpoints:** 0
- **DB RPC added:** 0
- **Direct PostgreSQL transaction adapters added:** 0
- **Schema or migration changes:** 0
- **Next decision required:** CTO approval of a future atomic multi-aggregate transaction architecture before any endpoint in this report may be implemented.

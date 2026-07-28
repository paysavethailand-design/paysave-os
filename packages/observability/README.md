# @paysave/observability

Boundary สำหรับ structured logger, correlation context, metrics และ tracing contracts

## Backend Sprint #1: audit port

- `AuditSink`/`AuditEvent`: framework-independent audit logging port. `ConsoleAuditSink` writes one masked
  JSON line per event; `RecordingAuditSink` supports assertions in tests; `NoopAuditSink` discards events.
- This package intentionally does **not** write to `audit.audit_events`. RFC-0005 leaves that table's
  null-partner (global control-plane) case unresolved, so no Sprint #1 code depends on it existing.
- Metadata keys matching `password|secret|token|encrypted|ciphertext|email|phone|address` are redacted
  before a value ever reaches a sink; ห้าม log secret/PII โดยไม่มี masking policy ที่อนุมัติ.
- Metrics/tracing vendor selection remains out of scope until approved.

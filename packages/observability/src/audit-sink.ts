import type { AuditEvent, AuditMetadataValue, NewAuditEvent } from "./audit-event";

/**
 * Port for recording audit facts. RFC-0005 leaves `audit.audit_events` unusable for global
 * control-plane rows (partner_id is NOT NULL there with no approved null-partner exception), so
 * Sprint #1 depends on this port instead of a database table. A future approved sink can implement
 * the same interface without call sites changing.
 */
export interface AuditSink {
  record(event: NewAuditEvent): Promise<void>;
}

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY_PATTERN = /password|secret|token|encrypted|ciphertext|email|phone|address/i;

function maskMetadata(
  metadata: Readonly<Record<string, AuditMetadataValue>> | undefined,
): Record<string, AuditMetadataValue> | undefined {
  if (!metadata) return undefined;

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : value,
    ]),
  );
}

function toRecordedEvent(event: NewAuditEvent): AuditEvent {
  const maskedMetadata = maskMetadata(event.metadata);
  return {
    ...event,
    occurredAt: event.occurredAt ?? new Date().toISOString(),
    ...(maskedMetadata !== undefined ? { metadata: maskedMetadata } : {}),
  };
}

/** Writes masked, structured audit events as a single JSON line for log aggregation. */
export class ConsoleAuditSink implements AuditSink {
  async record(event: NewAuditEvent): Promise<void> {
    const recorded = toRecordedEvent(event);
    console.info(JSON.stringify({ type: "audit_event", ...recorded }));
  }
}

/** Discards audit events; intended for unit tests that assert on domain behavior only. */
export class NoopAuditSink implements AuditSink {
  async record(): Promise<void> {
    // Intentionally does nothing.
  }
}

/** In-memory sink that keeps masked events for assertions in application/integration tests. */
export class RecordingAuditSink implements AuditSink {
  private readonly events: AuditEvent[] = [];

  async record(event: NewAuditEvent): Promise<void> {
    this.events.push(toRecordedEvent(event));
  }

  all(): readonly AuditEvent[] {
    return this.events;
  }
}

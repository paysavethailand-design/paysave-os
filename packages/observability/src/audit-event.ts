export type AuditOutcome = "success" | "denied" | "failure";
export type AuditActorType = "user" | "service" | "system";

export type AuditMetadataValue = string | number | boolean | null;

/**
 * Structured audit fact for a single authorization-relevant action. Mirrors the shape of the
 * frozen `audit.audit_events` design (RFC-0005) so a future approved sink can adopt it without a
 * contract change, but this type has no dependency on that table existing.
 */
export interface AuditEvent {
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly actorType: AuditActorType;
  readonly actorUserId: string | null;
  readonly partnerId: string | null;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string | null;
  readonly outcome: AuditOutcome;
  readonly reason?: string;
  readonly metadata?: Readonly<Record<string, AuditMetadataValue>>;
}

export type NewAuditEvent = Omit<AuditEvent, "occurredAt" | "correlationId"> & {
  readonly correlationId: string;
  readonly occurredAt?: string;
};

import type { InfrastructureEnvironment } from "./request";

export type ProviderExecutionAuditOutcome = "succeeded" | "rejected" | "failed";

export const INFRASTRUCTURE_EXECUTION_STAGES = Object.freeze([
  "registry-integrity",
  "capability-negotiation",
  "environment-policy",
  "provider-selection",
  "permit-generation",
  "preflight",
  "execution",
  "postflight",
  "audit",
  "response",
] as const);

export type InfrastructureExecutionStage = (typeof INFRASTRUCTURE_EXECUTION_STAGES)[number];

export interface ProviderExecutionAuditEvent {
  readonly executionId: string;
  readonly correlationId: string;
  readonly capability: string;
  readonly environment: InfrastructureEnvironment;
  readonly providerId?: string;
  readonly outcome: ProviderExecutionAuditOutcome;
  readonly stage: InfrastructureExecutionStage;
  readonly timestamp: string;
  readonly errorCode?: string;
}

export interface ProviderExecutionAudit {
  record(event: ProviderExecutionAuditEvent): Promise<void>;
}

export class InMemoryProviderExecutionAudit implements ProviderExecutionAudit {
  readonly #events: ProviderExecutionAuditEvent[] = [];

  public async record(event: ProviderExecutionAuditEvent): Promise<void> {
    this.#events.push(Object.freeze({ ...event }));
  }

  public events(): readonly ProviderExecutionAuditEvent[] {
    return Object.freeze([...this.#events]);
  }
}

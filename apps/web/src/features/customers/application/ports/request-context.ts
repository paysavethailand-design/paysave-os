import type { AuthContext } from "@paysave/security";

/** Verified caller identity plus request correlation ID, threaded through every use case for audit logging. */
export interface RequestContext {
  readonly actor: AuthContext;
  readonly correlationId: string;
}

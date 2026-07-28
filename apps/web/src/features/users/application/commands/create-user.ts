import type { AuditSink } from "@paysave/observability";
import { ApiError } from "@/shared/lib/api-error";
import type { User } from "../../domain/entities/user";
import { createUserSchema } from "../dto/user-schemas";
import type { Clock } from "../ports/clock";
import type { RequestContext } from "../ports/request-context";
import type { UserRepository } from "../ports/user-repository";

export interface CreateUserDeps {
  readonly repository: UserRepository;
  readonly auditSink: AuditSink;
  readonly clock: Clock;
}

/**
 * Registers an `iam.users` profile for an auth identity that already exists in Supabase Auth.
 * Sprint #1 does not call the Supabase Admin API (that requires the service-role key and network
 * access to Auth, both out of scope), so `authSubject` must be provisioned out of band first.
 */
export async function createUser(
  rawInput: unknown,
  context: RequestContext,
  deps: CreateUserDeps,
): Promise<User> {
  const input = createUserSchema.parse(rawInput);

  const existing = await deps.repository.findByAuthSubject(input.authSubject);
  if (existing) {
    await deps.auditSink.record({
      correlationId: context.correlationId,
      actorType: "user",
      actorUserId: context.actor.userId,
      partnerId: null,
      action: "user.create",
      resourceType: "iam.users",
      resourceId: existing.id,
      outcome: "denied",
      reason: "duplicate_auth_subject",
    });
    throw new ApiError("conflict", "A user already exists for this auth subject");
  }

  const created = await deps.repository.create({
    ...input,
    lastSeenAt: deps.clock.now().toISOString(),
  });
  await deps.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: null,
    action: "user.create",
    resourceType: "iam.users",
    resourceId: created.id,
    outcome: "success",
  });

  return created;
}

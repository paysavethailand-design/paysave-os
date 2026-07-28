import type { AuditSink } from "@paysave/observability";
import { ApiError } from "@/shared/lib/api-error";
import type { User } from "../../domain/entities/user";
import { deactivateUserSchema } from "../dto/user-schemas";
import { USER_STATUS } from "../../domain/user-codes";
import type { RequestContext } from "../ports/request-context";
import type { UserRepository } from "../ports/user-repository";

export interface DeactivateUserDeps {
  readonly repository: UserRepository;
  readonly auditSink: AuditSink;
}

/**
 * Deactivates a user by transitioning `status` to `suspended`. `iam.users` has no `deleted_at`
 * column and RLS has no DELETE policy for it, so a status transition is the only lifecycle
 * "delete" this API can perform.
 */
export async function deactivateUser(
  userId: string,
  rawInput: unknown,
  context: RequestContext,
  deps: DeactivateUserDeps,
): Promise<User> {
  const input = deactivateUserSchema.parse(rawInput ?? {});

  const updated = await deps.repository.update(userId, { status: USER_STATUS.SUSPENDED });
  if (!updated) {
    await deps.auditSink.record({
      correlationId: context.correlationId,
      actorType: "user",
      actorUserId: context.actor.userId,
      partnerId: null,
      action: "user.deactivate",
      resourceType: "iam.users",
      resourceId: userId,
      outcome: "denied",
      reason: "not_found",
    });
    throw new ApiError("not_found", `User not found: ${userId}`);
  }

  await deps.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: null,
    action: "user.deactivate",
    resourceType: "iam.users",
    resourceId: userId,
    outcome: "success",
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
  });

  return updated;
}

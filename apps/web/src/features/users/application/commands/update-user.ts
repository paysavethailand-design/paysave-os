import type { AuditSink } from "@paysave/observability";
import { ApiError } from "@/shared/lib/api-error";
import type { User } from "../../domain/entities/user";
import { updateUserSchema } from "../dto/user-schemas";
import type { RequestContext } from "../ports/request-context";
import type { UserRepository } from "../ports/user-repository";

export interface UpdateUserDeps {
  readonly repository: UserRepository;
  readonly auditSink: AuditSink;
}

/** Updates a user's display name and/or status. */
export async function updateUser(
  userId: string,
  rawInput: unknown,
  context: RequestContext,
  deps: UpdateUserDeps,
): Promise<User> {
  const input = updateUserSchema.parse(rawInput);

  const updated = await deps.repository.update(userId, input);
  if (!updated) {
    await deps.auditSink.record({
      correlationId: context.correlationId,
      actorType: "user",
      actorUserId: context.actor.userId,
      partnerId: null,
      action: "user.update",
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
    action: "user.update",
    resourceType: "iam.users",
    resourceId: userId,
    outcome: "success",
  });

  return updated;
}

import type { AuditSink } from "@paysave/observability";
import { ApiError } from "@/shared/lib/api-error";
import type { Permission } from "../../domain/entities/permission";
import { updatePermissionSchema } from "../dto/permission-schemas";
import type { PermissionRepository } from "../ports/permission-repository";
import type { RequestContext } from "../ports/request-context";

export interface UpdatePermissionDeps {
  readonly repository: PermissionRepository;
  readonly auditSink: AuditSink;
}

/** Updates the `resource`/`action` classification of an existing permission. */
export async function updatePermission(
  permissionId: string,
  rawInput: unknown,
  context: RequestContext,
  deps: UpdatePermissionDeps,
): Promise<Permission> {
  const input = updatePermissionSchema.parse(rawInput);

  const updated = await deps.repository.update(permissionId, input);
  if (!updated) {
    await deps.auditSink.record({
      correlationId: context.correlationId,
      actorType: "user",
      actorUserId: context.actor.userId,
      partnerId: null,
      action: "permission.update",
      resourceType: "iam.permissions",
      resourceId: permissionId,
      outcome: "denied",
      reason: "not_found",
    });
    throw new ApiError("not_found", `Permission not found: ${permissionId}`);
  }

  await deps.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: null,
    action: "permission.update",
    resourceType: "iam.permissions",
    resourceId: permissionId,
    outcome: "success",
  });

  return updated;
}

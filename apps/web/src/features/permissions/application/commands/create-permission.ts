import type { AuditSink } from "@paysave/observability";
import { ApiError } from "@/shared/lib/api-error";
import type { Permission } from "../../domain/entities/permission";
import { createPermissionSchema } from "../dto/permission-schemas";
import type { PermissionRepository } from "../ports/permission-repository";
import type { RequestContext } from "../ports/request-context";

export interface CreatePermissionDeps {
  readonly repository: PermissionRepository;
  readonly auditSink: AuditSink;
}

/** Creates a platform-wide permission. Route-level authorization already required `permissions.manage`. */
export async function createPermission(
  rawInput: unknown,
  context: RequestContext,
  deps: CreatePermissionDeps,
): Promise<Permission> {
  const input = createPermissionSchema.parse(rawInput);

  const existing = await deps.repository.findByCode(input.code);
  if (existing) {
    await deps.auditSink.record({
      correlationId: context.correlationId,
      actorType: "user",
      actorUserId: context.actor.userId,
      partnerId: null,
      action: "permission.create",
      resourceType: "iam.permissions",
      resourceId: existing.id,
      outcome: "denied",
      reason: "duplicate_code",
    });
    throw new ApiError("conflict", `Permission code already exists: ${input.code}`);
  }

  const created = await deps.repository.create(input);
  await deps.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: null,
    action: "permission.create",
    resourceType: "iam.permissions",
    resourceId: created.id,
    outcome: "success",
  });

  return created;
}

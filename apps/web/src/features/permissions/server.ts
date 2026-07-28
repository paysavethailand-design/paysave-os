import { ConsoleAuditSink } from "@paysave/observability";
import { databaseProvider } from "@/shared/providers/database/server";
import type { BoundedPage, BoundedPageRequest } from "@/shared/lib/pagination";
import { createPermission } from "./application/commands/create-permission";
import { updatePermission } from "./application/commands/update-permission";
import type { RequestContext } from "./application/ports/request-context";
import { getPermission } from "./application/queries/get-permission";
import { listPermissions } from "./application/queries/list-permissions";
import type { Permission } from "./domain/entities/permission";
import type { PermissionRepository } from "./application/ports/permission-repository";

const auditSink = new ConsoleAuditSink();

async function repository(): Promise<PermissionRepository> {
  return databaseProvider().repositories.permissions();
}

/** Server-only public API composition root for the permissions feature. */
export async function listPermissionsUseCase(
  pageRequest: BoundedPageRequest,
): Promise<BoundedPage<Permission>> {
  return listPermissions(pageRequest, await repository());
}

export async function getPermissionUseCase(permissionId: string): Promise<Permission> {
  return getPermission(permissionId, await repository());
}

export async function createPermissionUseCase(
  rawInput: unknown,
  context: RequestContext,
): Promise<Permission> {
  return createPermission(rawInput, context, { repository: await repository(), auditSink });
}

export async function updatePermissionUseCase(
  permissionId: string,
  rawInput: unknown,
  context: RequestContext,
): Promise<Permission> {
  return updatePermission(permissionId, rawInput, context, {
    repository: await repository(),
    auditSink,
  });
}

export type { Permission } from "./domain/entities/permission";
export { PERMISSIONS_PERMISSIONS } from "./domain/permission-codes";
export type { RequestContext } from "./application/ports/request-context";

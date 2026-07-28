import { ApiError } from "@/shared/lib/api-error";
import type { Permission } from "../../domain/entities/permission";
import type { PermissionRepository } from "../ports/permission-repository";

/** Returns a single permission or throws a 404 ApiError. */
export async function getPermission(
  permissionId: string,
  repository: PermissionRepository,
): Promise<Permission> {
  const permission = await repository.findById(permissionId);
  if (!permission) {
    throw new ApiError("not_found", `Permission not found: ${permissionId}`);
  }
  return permission;
}

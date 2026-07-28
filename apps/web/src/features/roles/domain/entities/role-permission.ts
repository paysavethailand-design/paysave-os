/** A permission grant attached to a Role (`iam.role_permissions`). */
export interface RolePermission {
  readonly id: string;
  readonly partnerId: string;
  readonly roleId: string;
  readonly permissionId: string;
  readonly effect: "allow" | "deny";
  readonly createdAt: string;
  readonly updatedAt: string;
}

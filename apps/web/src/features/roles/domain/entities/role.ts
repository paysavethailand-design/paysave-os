/** A tenant-scoped role (`iam.roles`); soft-deleted via `deleted_at` since no DELETE RLS policy exists. */
export interface Role {
  readonly id: string;
  readonly partnerId: string;
  readonly templateId: string | null;
  readonly code: string;
  readonly name: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

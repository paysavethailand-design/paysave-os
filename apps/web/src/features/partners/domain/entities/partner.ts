/** The tenant root (`tenant.partners`); soft-deleted via `deleted_at` since no DELETE RLS policy exists. */
export interface Partner {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly status: string;
  readonly timezone: string;
  readonly defaultCurrency: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

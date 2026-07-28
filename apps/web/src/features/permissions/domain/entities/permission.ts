/** A platform-wide permission grantable to a Role (`iam.permissions`; no `partner_id`, global control-plane). */
export interface Permission {
  readonly id: string;
  readonly code: string;
  readonly resource: string;
  readonly action: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

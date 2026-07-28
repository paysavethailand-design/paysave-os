/**
 * Core `crm.customers` lifecycle only. Child PII tables (`customer_identifiers`, `customer_contacts`,
 * `customer_addresses`) are out of scope for Backend Sprint #1 — see the Sprint Report.
 */
export interface Customer {
  readonly id: string;
  readonly partnerId: string;
  readonly customerType: string;
  readonly displayName: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

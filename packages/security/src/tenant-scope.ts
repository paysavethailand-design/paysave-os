import type { AuthContext } from "./auth-context";

export type PartnerScopeDenialReason =
  "partner_id_required" | "no_active_partner" | "partner_mismatch";

export type PartnerScopeResolution =
  | { readonly ok: true; readonly partnerId: string }
  | { readonly ok: false; readonly reason: PartnerScopeDenialReason };

/**
 * Resolves which `partner_id` a tenant-scoped write (Role/Customer/Asset, etc.) may target.
 *
 * Database RLS (`admin.authorized_partner`) is the enforcement boundary of record, but the
 * application must still choose which partner to write into before RLS ever sees the statement.
 * A `tenant_scope: "all"` session (global admin) has no implicit active partner, so it must name
 * one explicitly; any other session may only target its own active partner.
 */
export function resolveWritePartnerId(
  context: AuthContext,
  requestedPartnerId: string | null,
): PartnerScopeResolution {
  if (context.tenantScope === "all") {
    return requestedPartnerId
      ? { ok: true, partnerId: requestedPartnerId }
      : { ok: false, reason: "partner_id_required" };
  }

  if (!context.activePartnerId) {
    return { ok: false, reason: "no_active_partner" };
  }

  if (requestedPartnerId && requestedPartnerId !== context.activePartnerId) {
    return { ok: false, reason: "partner_mismatch" };
  }

  return { ok: true, partnerId: context.activePartnerId };
}

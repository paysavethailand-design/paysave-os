import { z } from "zod";

export const roleCodeSchema = z.enum(["super_admin", "admin", "partner", "supervisor", "agent"]);

export const permissionCodeSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(/^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/);

const paysaveClaimsSchema = z.object({
  sub: z.uuid(),
  paysave: z.object({
    claims_version: z.literal(1),
    active_partner_id: z.uuid().nullable(),
    roles: z.array(roleCodeSchema).max(5),
    permissions: z.array(permissionCodeSchema).max(200),
    tenant_scope: z.enum(["active", "all"]),
    session_version: z.number().int().positive(),
  }),
});

export type RoleCode = z.infer<typeof roleCodeSchema>;
export type PermissionCode = z.infer<typeof permissionCodeSchema>;

export interface AuthContext {
  readonly userId: string;
  readonly activePartnerId: string | null;
  readonly roles: readonly RoleCode[];
  readonly permissions: readonly PermissionCode[];
  readonly tenantScope: "active" | "all";
  readonly sessionVersion: number;
}

/** Converts verified Supabase JWT claims into the application authorization context. */
export function parsePaysaveClaims(input: unknown): AuthContext {
  const claims = paysaveClaimsSchema.parse(input);

  return {
    userId: claims.sub,
    activePartnerId: claims.paysave.active_partner_id,
    roles: [...new Set(claims.paysave.roles)],
    permissions: [...new Set(claims.paysave.permissions)],
    tenantScope: claims.paysave.tenant_scope,
    sessionVersion: claims.paysave.session_version,
  };
}

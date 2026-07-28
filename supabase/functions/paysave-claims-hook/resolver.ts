export const CLAIMS_VERSION = 1 as const;
export const SESSION_VERSION = 1 as const;
export const PAYSAVE_CLAIMS_MAX_BYTES = 2_048;

const supportedRoles = new Set(["super_admin", "admin", "partner", "supervisor", "agent"]);
const permissionPattern = /^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/;

export interface IamUser {
  readonly id: string;
  readonly status: string;
}

export interface ActiveMembership {
  readonly id: string;
  readonly partnerId: string;
}

export interface EffectiveRole {
  readonly id: string;
  readonly code: string;
}

export interface RolePermission {
  readonly permissionId: string;
  readonly code: string;
  readonly effect: string;
}

export interface ClaimSource {
  findUserByAuthSubject(authSubject: string): Promise<IamUser | null>;
  listActiveMemberships(userId: string): Promise<readonly ActiveMembership[]>;
  listEffectiveRoles(
    partnerId: string,
    membershipId: string,
    issuedAt: Date,
  ): Promise<readonly EffectiveRole[]>;
  listRolePermissions(
    partnerId: string,
    roleIds: readonly string[],
  ): Promise<readonly RolePermission[]>;
}

export interface PaysaveClaims {
  readonly claims_version: 1;
  readonly session_version: 1;
  readonly active_partner_id: string | null;
  readonly tenant_scope: "active";
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

export type ClaimResolutionErrorCode =
  | "iam_user_not_found"
  | "iam_user_inactive"
  | "active_partner_ambiguous"
  | "unsupported_role"
  | "too_many_roles"
  | "unsupported_permission_effect"
  | "malformed_permission"
  | "too_many_permissions"
  | "claims_too_large";

export class ClaimResolutionError extends Error {
  constructor(readonly code: ClaimResolutionErrorCode) {
    super(code);
    this.name = "ClaimResolutionError";
  }
}

function assertClaimBudget(claims: PaysaveClaims): void {
  const bytes = new TextEncoder().encode(JSON.stringify(claims)).byteLength;
  if (bytes > PAYSAVE_CLAIMS_MAX_BYTES) {
    throw new ClaimResolutionError("claims_too_large");
  }
}

function resolvePermissions(rows: readonly RolePermission[]): readonly string[] {
  const effects = new Map<string, "allow" | "deny">();
  for (const row of rows) {
    if (row.effect !== "allow" && row.effect !== "deny") {
      throw new ClaimResolutionError("unsupported_permission_effect");
    }
    if (row.code.length < 3 || row.code.length > 100 || !permissionPattern.test(row.code)) {
      throw new ClaimResolutionError("malformed_permission");
    }
    const previous = effects.get(row.code);
    effects.set(row.code, previous === "deny" || row.effect === "deny" ? "deny" : "allow");
  }

  const allowed = [...effects.entries()]
    .filter(([, effect]) => effect === "allow")
    .map(([code]) => code)
    .sort();
  if (allowed.length > 200) throw new ClaimResolutionError("too_many_permissions");
  return allowed;
}

export async function resolvePaysaveClaims(
  authSubject: string,
  source: ClaimSource,
  issuedAt = new Date(),
): Promise<PaysaveClaims> {
  const user = await source.findUserByAuthSubject(authSubject);
  if (!user) throw new ClaimResolutionError("iam_user_not_found");
  if (user.status !== "active") throw new ClaimResolutionError("iam_user_inactive");

  const memberships = await source.listActiveMemberships(user.id);
  if (memberships.length > 1) throw new ClaimResolutionError("active_partner_ambiguous");

  const membership = memberships[0];
  if (!membership) {
    const claims: PaysaveClaims = {
      claims_version: CLAIMS_VERSION,
      session_version: SESSION_VERSION,
      active_partner_id: null,
      tenant_scope: "active",
      roles: [],
      permissions: [],
    };
    assertClaimBudget(claims);
    return claims;
  }

  const roleRows = await source.listEffectiveRoles(membership.partnerId, membership.id, issuedAt);
  const roles = [...new Set(roleRows.map((row) => row.code))].sort();
  if (roles.length > 5) throw new ClaimResolutionError("too_many_roles");
  if (roles.some((role) => !supportedRoles.has(role))) {
    throw new ClaimResolutionError("unsupported_role");
  }

  const permissions = await source.listRolePermissions(
    membership.partnerId,
    roleRows.map((row) => row.id),
  );
  const claims: PaysaveClaims = {
    claims_version: CLAIMS_VERSION,
    session_version: SESSION_VERSION,
    active_partner_id: membership.partnerId,
    tenant_scope: "active",
    roles,
    permissions: resolvePermissions(permissions),
  };
  assertClaimBudget(claims);
  return claims;
}

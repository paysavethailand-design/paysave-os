import { describe, expect, it } from "vitest";
import {
  ClaimResolutionError,
  resolvePaysaveClaims,
  type ClaimSource,
  type EffectiveRole,
  type RolePermission,
} from "./resolver.ts";

const userId = "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111";
const iamUserId = "8f7a1e2b-2222-4d3d-9a1a-1111aaaa1111";
const partnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";
const membershipId = "7f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d42";

function source(overrides: Partial<ClaimSource> = {}): ClaimSource {
  return {
    findUserByAuthSubject: async () => ({ id: iamUserId, status: "active" }),
    listActiveMemberships: async () => [{ id: membershipId, partnerId }],
    listEffectiveRoles: async () => [{ id: "1f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d43", code: "agent" }],
    listRolePermissions: async () => [
      { permissionId: "2f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d44", code: "cases.read", effect: "allow" },
    ],
    ...overrides,
  };
}

describe("resolvePaysaveClaims", () => {
  it("emits the exact version-1 active-partner claim contract", async () => {
    await expect(resolvePaysaveClaims(userId, source())).resolves.toEqual({
      claims_version: 1,
      session_version: 1,
      active_partner_id: partnerId,
      tenant_scope: "active",
      roles: ["agent"],
      permissions: ["cases.read"],
    });
  });

  it("allows login with a null partner but emits no roles or permissions", async () => {
    const claims = await resolvePaysaveClaims(
      userId,
      source({ listActiveMemberships: async () => [] }),
    );
    expect(claims).toEqual({
      claims_version: 1,
      session_version: 1,
      active_partner_id: null,
      tenant_scope: "active",
      roles: [],
      permissions: [],
    });
  });

  it("fails closed for unknown or inactive IAM users", async () => {
    await expect(
      resolvePaysaveClaims(userId, source({ findUserByAuthSubject: async () => null })),
    ).rejects.toMatchObject({ code: "iam_user_not_found" });
    await expect(
      resolvePaysaveClaims(
        userId,
        source({ findUserByAuthSubject: async () => ({ id: iamUserId, status: "disabled" }) }),
      ),
    ).rejects.toMatchObject({ code: "iam_user_inactive" });
  });

  it("fails closed when active-partner selection is ambiguous", async () => {
    await expect(
      resolvePaysaveClaims(
        userId,
        source({
          listActiveMemberships: async () => [
            { id: membershipId, partnerId },
            {
              id: "3f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d45",
              partnerId: "4f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d46",
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: "active_partner_ambiguous" });
  });

  it("rejects unknown roles instead of silently dropping them", async () => {
    const roles: EffectiveRole[] = [{ id: "1f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d43", code: "root" }];
    await expect(
      resolvePaysaveClaims(userId, source({ listEffectiveRoles: async () => roles })),
    ).rejects.toMatchObject({ code: "unsupported_role" });
  });

  it("applies deny-overrides when roles grant conflicting permission effects", async () => {
    const permissions: RolePermission[] = [
      { permissionId: "2f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d44", code: "cases.read", effect: "allow" },
      { permissionId: "2f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d44", code: "cases.read", effect: "deny" },
      {
        permissionId: "5f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d47",
        code: "cases.manage",
        effect: "allow",
      },
    ];
    const claims = await resolvePaysaveClaims(
      userId,
      source({ listRolePermissions: async () => permissions }),
    );
    expect(claims.permissions).toEqual(["cases.manage"]);
  });

  it("fails closed for unknown effect values", async () => {
    await expect(
      resolvePaysaveClaims(
        userId,
        source({
          listRolePermissions: async () => [
            {
              permissionId: "2f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d44",
              code: "cases.read",
              effect: "grant",
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: "unsupported_permission_effect" });
  });

  it("rejects claim sets that exceed the PAYSAVE byte budget", async () => {
    const permissions: RolePermission[] = Array.from({ length: 120 }, (_, index) => ({
      permissionId: `permission-${index}`,
      code: `resource_${index}.${"x".repeat(35)}`,
      effect: "allow",
    }));
    await expect(
      resolvePaysaveClaims(userId, source({ listRolePermissions: async () => permissions })),
    ).rejects.toBeInstanceOf(ClaimResolutionError);
    await expect(
      resolvePaysaveClaims(userId, source({ listRolePermissions: async () => permissions })),
    ).rejects.toMatchObject({ code: "claims_too_large" });
  });
});

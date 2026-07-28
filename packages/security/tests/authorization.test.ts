import { describe, expect, it } from "vitest";
import {
  hasEveryPermission,
  hasPermission,
  parsePaysaveClaims,
  type AuthContext,
} from "../src/index";

const validContext: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  roles: ["supervisor"],
  permissions: ["cases.read", "assignments.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};

describe("parsePaysaveClaims", () => {
  it("creates a type-safe auth context from verified Supabase JWT claims", () => {
    const context = parsePaysaveClaims({
      sub: validContext.userId,
      paysave: {
        claims_version: 1,
        active_partner_id: validContext.activePartnerId,
        roles: validContext.roles,
        permissions: validContext.permissions,
        tenant_scope: validContext.tenantScope,
        session_version: validContext.sessionVersion,
      },
    });

    expect(context).toEqual(validContext);
  });

  it("rejects unknown roles instead of trusting malformed JWT claims", () => {
    expect(() =>
      parsePaysaveClaims({
        sub: validContext.userId,
        paysave: {
          claims_version: 1,
          active_partner_id: validContext.activePartnerId,
          roles: ["root"],
          permissions: [],
          tenant_scope: "active",
          session_version: 1,
        },
      }),
    ).toThrow();
  });

  it("rejects missing or unknown claim contract versions", () => {
    const base = {
      sub: validContext.userId,
      paysave: {
        active_partner_id: validContext.activePartnerId,
        roles: validContext.roles,
        permissions: validContext.permissions,
        tenant_scope: validContext.tenantScope,
        session_version: validContext.sessionVersion,
      },
    };

    expect(() => parsePaysaveClaims(base)).toThrow();
    expect(() =>
      parsePaysaveClaims({
        ...base,
        paysave: { ...base.paysave, claims_version: 2 },
      }),
    ).toThrow();
  });
});

describe("permission guards", () => {
  it("grants only explicit permissions", () => {
    expect(hasPermission(validContext, "cases.read")).toBe(true);
    expect(hasPermission(validContext, "users.manage")).toBe(false);
  });

  it("requires every requested permission", () => {
    expect(hasEveryPermission(validContext, ["cases.read", "assignments.manage"])).toBe(true);
    expect(hasEveryPermission(validContext, ["cases.read", "payments.read"])).toBe(false);
  });
});

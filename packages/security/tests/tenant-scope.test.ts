import { describe, expect, it } from "vitest";
import type { AuthContext } from "../src/auth-context";
import { resolveWritePartnerId } from "../src/tenant-scope";

const activePartnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";
const otherPartnerId = "1a2b3c4d-5e6f-4789-90ab-cdef01234567";

function context(overrides: Partial<AuthContext>): AuthContext {
  return {
    userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
    activePartnerId,
    roles: ["admin"],
    permissions: [],
    tenantScope: "active",
    sessionVersion: 1,
    ...overrides,
  };
}

describe("resolveWritePartnerId", () => {
  it("scopes an active-tenant session to its own active partner by default", () => {
    expect(resolveWritePartnerId(context({}), null)).toEqual({
      ok: true,
      partnerId: activePartnerId,
    });
  });

  it("allows an active-tenant session to repeat its own active partner explicitly", () => {
    expect(resolveWritePartnerId(context({}), activePartnerId)).toEqual({
      ok: true,
      partnerId: activePartnerId,
    });
  });

  it("denies an active-tenant session that names a different partner", () => {
    expect(resolveWritePartnerId(context({}), otherPartnerId)).toEqual({
      ok: false,
      reason: "partner_mismatch",
    });
  });

  it("denies a session with no active partner", () => {
    expect(resolveWritePartnerId(context({ activePartnerId: null }), null)).toEqual({
      ok: false,
      reason: "no_active_partner",
    });
  });

  it("requires an explicit partnerId for a global-admin session", () => {
    expect(
      resolveWritePartnerId(context({ tenantScope: "all", activePartnerId: null }), null),
    ).toEqual({ ok: false, reason: "partner_id_required" });
  });

  it("allows a global-admin session to target any named partner", () => {
    expect(
      resolveWritePartnerId(context({ tenantScope: "all", activePartnerId: null }), otherPartnerId),
    ).toEqual({ ok: true, partnerId: otherPartnerId });
  });
});

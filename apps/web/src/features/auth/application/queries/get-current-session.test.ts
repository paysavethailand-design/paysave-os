import type { AuthContext } from "@paysave/security";
import { describe, expect, it } from "vitest";
import { toSessionView } from "./get-current-session";

const context: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  roles: ["supervisor"],
  permissions: ["cases.read"],
  tenantScope: "active",
  sessionVersion: 3,
};

describe("toSessionView", () => {
  it("maps every field from the verified auth context", () => {
    expect(toSessionView(context)).toEqual({
      userId: context.userId,
      activePartnerId: context.activePartnerId,
      roles: context.roles,
      permissions: context.permissions,
      tenantScope: context.tenantScope,
      sessionVersion: context.sessionVersion,
    });
  });
});

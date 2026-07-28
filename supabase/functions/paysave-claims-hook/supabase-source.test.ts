import { FakeSupabaseClient } from "@paysave/testing";
import { describe, expect, it } from "vitest";
import { IamSourceError, SupabaseClaimSource, type SupabaseClientLike } from "./supabase-source.ts";

const partnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";
const membershipId = "7f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d42";
const roleId = "1f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d43";
const permissionId = "2f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d44";

function source(responses: ConstructorParameters<typeof FakeSupabaseClient>[0]) {
  const client = new FakeSupabaseClient(responses);
  return {
    client,
    source: new SupabaseClaimSource(client as unknown as SupabaseClientLike),
  };
}

describe("SupabaseClaimSource", () => {
  it("maps one IAM user by exact auth subject", async () => {
    const { client, source: adapter } = source([
      { data: { id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa1111", status: "active" }, error: null },
    ]);
    await expect(adapter.findUserByAuthSubject("auth-subject")).resolves.toEqual({
      id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa1111",
      status: "active",
    });
    expect(client.recordedBuilders()[0]?.recordedCalls()).toContainEqual({
      method: "eq",
      args: ["auth_subject", "auth-subject"],
    });
  });

  it("selects only active non-deleted memberships", async () => {
    const { client, source: adapter } = source([
      { data: [{ id: membershipId, partner_id: partnerId }], error: null },
    ]);
    await expect(adapter.listActiveMemberships("iam-user")).resolves.toEqual([
      { id: membershipId, partnerId },
    ]);
    expect(client.recordedBuilders()[0]?.recordedCalls()).toEqual(
      expect.arrayContaining([
        { method: "eq", args: ["user_id", "iam-user"] },
        { method: "eq", args: ["status", "active"] },
        { method: "is", args: ["deleted_at", null] },
      ]),
    );
  });

  it("filters role assignments by effective period and active role state", async () => {
    const expiredRoleId = "3f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d45";
    const { client, source: adapter } = source([
      {
        data: [
          { role_id: roleId, valid_from: "2026-01-01T00:00:00.000Z", valid_to: null },
          {
            role_id: expiredRoleId,
            valid_from: "2025-01-01T00:00:00.000Z",
            valid_to: "2025-12-31T00:00:00.000Z",
          },
        ],
        error: null,
      },
      { data: [{ id: roleId, code: "agent" }], error: null },
    ]);
    await expect(
      adapter.listEffectiveRoles(partnerId, membershipId, new Date("2026-07-23T00:00:00.000Z")),
    ).resolves.toEqual([{ id: roleId, code: "agent" }]);
    expect(client.recordedBuilders()[1]?.recordedCalls()).toEqual(
      expect.arrayContaining([
        { method: "eq", args: ["partner_id", partnerId] },
        { method: "eq", args: ["status", "active"] },
        { method: "is", args: ["deleted_at", null] },
      ]),
    );
  });

  it("joins role effects to canonical permission codes", async () => {
    const { source: adapter } = source([
      { data: [{ role_id: roleId, permission_id: permissionId, effect: "allow" }], error: null },
      { data: [{ id: permissionId, code: "cases.read" }], error: null },
    ]);
    await expect(adapter.listRolePermissions(partnerId, [roleId])).resolves.toEqual([
      { permissionId, code: "cases.read", effect: "allow" },
    ]);
  });

  it("classifies PostgREST boundary failures without exposing raw diagnostics", async () => {
    const { source: adapter } = source([
      {
        data: null,
        error: {
          code: "PGRST106",
          message: "Invalid schema selection",
        },
      },
    ]);
    const error = await adapter
      .findUserByAuthSubject("auth-subject")
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(IamSourceError);
    expect(error).toMatchObject({
      message: "iam_source_unavailable",
      failureClass: "schema_not_exposed",
    });
  });
});

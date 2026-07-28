import { describe, expect, it, vi } from "vitest";
import type { ClaimSource } from "./resolver.ts";
import { IamSourceError } from "./supabase-source.ts";
import { handleClaimsHook, type HookEvent } from "./handler.ts";

const userId = "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111";
const partnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";

function source(): ClaimSource {
  return {
    findUserByAuthSubject: async () => ({
      id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa1111",
      status: "active",
    }),
    listActiveMemberships: async () => [{ id: "7f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d42", partnerId }],
    listEffectiveRoles: async () => [{ id: "1f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d43", code: "agent" }],
    listRolePermissions: async () => [
      { permissionId: "2f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d44", code: "cases.read", effect: "allow" },
    ],
  };
}

const event: HookEvent = {
  user_id: userId,
  authentication_method: "password",
  claims: {
    sub: userId,
    aud: "authenticated",
    exp: 1_800_000_000,
    iat: 1_799_999_700,
    role: "authenticated",
    aal: "aal1",
    session_id: "3f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d45",
    email: "synthetic@example.invalid",
    phone: "",
    is_anonymous: false,
  },
};

function request(method = "POST") {
  return new Request("https://staging.example.invalid/functions/v1/paysave-claims-hook", {
    method,
    headers: {
      "content-type": "application/json",
      "webhook-id": "msg_stage_001",
      "webhook-timestamp": "1799999700",
      "webhook-signature": "v1,synthetic",
    },
    ...(method === "POST" ? { body: JSON.stringify(event) } : {}),
  });
}

describe("handleClaimsHook", () => {
  it("preserves Supabase claims and adds versioned PAYSAVE claims", async () => {
    const audit = vi.fn();
    const response = await handleClaimsHook(request(), {
      verify: async () => event,
      source: source(),
      audit,
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.claims).toMatchObject({
      sub: userId,
      role: "authenticated",
      paysave: {
        claims_version: 1,
        active_partner_id: partnerId,
        tenant_scope: "active",
        roles: ["agent"],
        permissions: ["cases.read"],
      },
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: "msg_stage_001",
        event: "authentication.token_issue",
        outcome: "success",
      }),
    );
  });

  it("records refresh events distinctly", async () => {
    const audit = vi.fn();
    await handleClaimsHook(request(), {
      verify: async () => ({ ...event, authentication_method: "token_refresh" }),
      source: source(),
      audit,
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ event: "authentication.claim_refresh", outcome: "success" }),
    );
  });

  it("rejects non-POST and invalid signatures", async () => {
    const audit = vi.fn();
    expect(
      (
        await handleClaimsHook(request("GET"), {
          verify: async () => event,
          source: source(),
          audit,
        })
      ).status,
    ).toBe(405);
    expect(
      (
        await handleClaimsHook(request(), {
          verify: async () => {
            throw new Error("bad signature");
          },
          source: source(),
          audit,
        })
      ).status,
    ).toBe(401);
  });

  it("rejects a signed event whose user_id and sub differ", async () => {
    const response = await handleClaimsHook(request(), {
      verify: async () => ({
        ...event,
        claims: { ...event.claims, sub: "9f7a1e2b-2222-4d3d-9a1a-1111aaaa9999" },
      }),
      source: source(),
      audit: vi.fn(),
    });
    expect(response.status).toBe(403);
  });

  it("returns only sanitized operational diagnostics with correlation", async () => {
    const response = await handleClaimsHook(request(), {
      verify: async () => event,
      source: {
        ...source(),
        findUserByAuthSubject: async () => {
          throw new IamSourceError("schema_not_exposed");
        },
      },
      audit: vi.fn(),
    });
    expect(response.status).toBe(503);
    expect(response.headers.get("x-correlation-id")).toBe("msg_stage_001");
    expect(response.headers.get("x-paysave-failure-class")).toBe("schema_not_exposed");
    expect(await response.json()).toEqual({ error: "claim_resolver_unavailable" });
  });

  it("fails closed without leaking resolver diagnostics", async () => {
    const audit = vi.fn();
    const response = await handleClaimsHook(request(), {
      verify: async () => event,
      source: {
        ...source(),
        listActiveMemberships: async () => [
          { id: "7f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d42", partnerId },
          {
            id: "3f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d45",
            partnerId: "4f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d46",
          },
        ],
      },
      audit,
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "claim_resolution_denied" });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "failure", reason: "active_partner_ambiguous" }),
    );
  });
});

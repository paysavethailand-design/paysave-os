import { describe, expect, it } from "vitest";
import type { InfrastructureRequest, ProviderExecutionContext } from "../core/index";
import {
  consumeProviderExecutionPermit,
  issueProviderExecutionPermit,
} from "../core/providers/execution-permit";

const request: InfrastructureRequest = {
  capability: "dns.record.read",
  payload: undefined,
  context: {
    environment: "internal-beta",
    tenantId: "tenant",
    actorId: "actor",
    correlationId: "permit",
  },
};

const context: ProviderExecutionContext = {
  executionId: "execution",
  providerId: "hostinger",
  capability: request.capability,
  environment: "internal-beta",
  credentialSource: {
    kind: "secret-manager",
    reference: "paysave/internal-beta/hostinger-provider-credentials",
  },
  startedAt: "2026-07-26T10:00:00.000Z",
};

describe("ProviderExecutionPermit validation", () => {
  it("rejects missing, inactive, and every context mismatch", () => {
    expect(consumeProviderExecutionPermit(undefined, "hostinger", request, context)).toBe(false);

    const inactive = { ...issueProviderExecutionPermit("hostinger", request, context) };
    expect(consumeProviderExecutionPermit(inactive, "hostinger", request, context)).toBe(false);

    const cases = [
      {
        providerId: "supabase",
        request,
        context,
      },
      {
        providerId: "hostinger",
        request: { ...request, capability: "dns.record.write" },
        context,
      },
      {
        providerId: "hostinger",
        request: {
          ...request,
          context: { ...request.context, correlationId: "other" },
        },
        context,
      },
      {
        providerId: "hostinger",
        request,
        context: { ...context, executionId: "other" },
      },
      {
        providerId: "hostinger",
        request,
        context: { ...context, environment: "staging" as const },
      },
    ];

    for (const item of cases) {
      const permit = issueProviderExecutionPermit("hostinger", request, context);
      expect(
        consumeProviderExecutionPermit(permit, item.providerId, item.request, item.context),
      ).toBe(false);
    }
  });

  it("consumes a matching permit exactly once", () => {
    const permit = issueProviderExecutionPermit("hostinger", request, context);

    expect(consumeProviderExecutionPermit(permit, "hostinger", request, context)).toBe(true);
    expect(consumeProviderExecutionPermit(permit, "hostinger", request, context)).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  CAPABILITIES,
  InfrastructureError,
  ProviderContractValidator,
  type InfrastructureProvider,
  type InfrastructureRequest,
  type InfrastructureResult,
  type ProviderExecutionContext,
} from "../core/index";
import { createHostingerProvider } from "../hostinger/index";
import type { ProviderExecutor } from "../shared/provider-executor";

const request: InfrastructureRequest = {
  capability: CAPABILITIES.DNS_RECORD_READ,
  payload: undefined,
  context: {
    environment: "internal-beta",
    tenantId: "tenant-a",
    actorId: "actor-a",
    correlationId: "provider-contract",
  },
};

const executionContext: ProviderExecutionContext = {
  executionId: "execution-a",
  providerId: "hostinger",
  capability: CAPABILITIES.DNS_RECORD_READ,
  environment: "internal-beta",
  credentialSource: {
    kind: "secret-manager",
    reference: "projects/paysave-internal/secrets/hostinger-api-token",
  },
  startedAt: "2026-07-26T10:00:00.000Z",
};

function executor(): ProviderExecutor & { execute: ReturnType<typeof vi.fn> } {
  return {
    execute: vi.fn(
      async (
        providerId: string,
        infrastructureRequest: InfrastructureRequest,
      ): Promise<InfrastructureResult> => ({
        providerId,
        capability: infrastructureRequest.capability,
        correlationId: infrastructureRequest.context.correlationId,
        data: { ok: true },
      }),
    ),
  };
}

describe("mandatory provider contract", () => {
  it("implements every required lifecycle and execution member", async () => {
    const provider = createHostingerProvider(executor());
    const validator = new ProviderContractValidator();

    expect(() => validator.validate(provider)).not.toThrow();
    for (const member of [
      "initialize",
      "shutdown",
      "health",
      "capabilities",
      "supports",
      "execute",
      "validate",
      "preflight",
      "postflight",
    ]) {
      expect(typeof provider[member as keyof InfrastructureProvider]).toBe("function");
    }
    await expect(provider.health()).resolves.toMatchObject({ status: "stopped" });
    await provider.initialize({
      providerId: "hostinger",
      environments: [
        {
          environment: "internal-beta",
          credentialSource: executionContext.credentialSource,
        },
      ],
    });
    await expect(provider.health()).resolves.toMatchObject({ status: "healthy" });
    await provider.shutdown();
    await expect(provider.health()).resolves.toMatchObject({ status: "stopped" });
  });

  it("exposes immutable capabilities and deterministic support checks", () => {
    const provider = createHostingerProvider(executor());

    expect(provider.supports(CAPABILITIES.DNS_RECORD_READ)).toBe(true);
    expect(provider.supports(CAPABILITIES.DATABASE_POSTGRESQL_QUERY)).toBe(false);
    expect(Object.isFrozen(provider.capabilities())).toBe(true);
  });

  it("validates, preflights, and postflights without executing network code", async () => {
    const providerExecutor = executor();
    const provider = createHostingerProvider(providerExecutor);

    expect(provider.validate(request, executionContext)).toEqual({ accepted: true });
    expect(await provider.preflight(request, executionContext)).toEqual({ accepted: true });
    const result: InfrastructureResult = {
      providerId: "hostinger",
      capability: request.capability,
      correlationId: request.context.correlationId,
      data: undefined,
    };
    expect(await provider.postflight(request, result, executionContext)).toEqual({
      accepted: true,
    });
    expect(providerExecutor.execute).not.toHaveBeenCalled();
  });

  it.each([
    ["status", "future"],
    ["plane", "browser"],
    ["access", "admin"],
    ["category", ""],
  ] as const)("rejects malformed runtime capability %s values", (field, value) => {
    const provider = createHostingerProvider(executor());
    const malformed = Object.create(provider) as InfrastructureProvider;
    Object.defineProperty(malformed, "capabilities", {
      value: () => [
        {
          ...provider.capabilities()[0]!,
          [field]: value,
        },
      ],
    });

    expect(() => new ProviderContractValidator().validate(malformed)).toThrowError(
      expect.objectContaining({ code: "PROVIDER_CONTRACT_INVALID" }) as InfrastructureError,
    );
  });

  it("rejects malformed provider contracts at bootstrap", () => {
    const malformed = { id: "malformed" } as InfrastructureProvider;

    expect(() => new ProviderContractValidator().validate(malformed)).toThrowError(
      expect.objectContaining({ code: "PROVIDER_CONTRACT_INVALID" }) as InfrastructureError,
    );
  });
});

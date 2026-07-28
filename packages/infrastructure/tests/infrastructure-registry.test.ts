import { describe, expect, it } from "vitest";
import {
  InMemoryProviderExecutionAudit,
  InfrastructureError,
  type CapabilityDescriptor,
  type EnvironmentConfiguration,
  type InfrastructureRequest,
} from "../core/index";
import { ProviderFactory } from "../shared/provider-factory";
import { MockInfrastructureProvider } from "../shared/testing";

function descriptor(
  id: string,
  status: CapabilityDescriptor["status"] = "supported",
  requiredResourceTypes?: readonly string[],
): CapabilityDescriptor {
  return Object.freeze({
    id,
    category: "test",
    plane: "control",
    status,
    access: "write",
    officialReferences: Object.freeze(["https://developers.hostinger.com/openapi/openapi.json"]),
    ...(requiredResourceTypes ? { requiredResourceTypes } : {}),
  });
}

function profiles(
  capabilityId: string,
  providerId = "hostinger",
): readonly EnvironmentConfiguration[] {
  return (["development", "internal-beta", "staging", "production"] as const).map(
    (environment) => ({
      environment,
      availableProviders: Object.freeze([providerId]),
      allowedCapabilities: Object.freeze([capabilityId]),
      experimentalCapabilities: Object.freeze([]),
      bindings: Object.freeze({ [capabilityId]: providerId }),
      credentialSources: Object.freeze({
        [providerId]: Object.freeze({
          kind: "secret-manager" as const,
          reference: `paysave/${environment}/${providerId}-provider-credentials`,
        }),
      }),
    }),
  );
}

function request(capability: string, payload: unknown = undefined): InfrastructureRequest {
  return {
    capability,
    payload,
    context: {
      environment: "internal-beta",
      tenantId: "tenant-a",
      actorId: "actor-a",
      correlationId: `correlation:${capability}`,
    },
  };
}

describe("InfrastructureRegistry execution policy", () => {
  it("resolves without executing and executes once through a one-time permit", async () => {
    const capability = descriptor("dns.record.read");
    const provider = new MockInfrastructureProvider("hostinger", [capability]);
    const registry = await new ProviderFactory().bootstrap({
      providers: [provider],
      environments: profiles(capability.id),
      audit: new InMemoryProviderExecutionAudit(),
      executionIdFactory: () => "execution-1",
    });

    expect(registry.resolve(request(capability.id))).toMatchObject({
      provider: { id: "hostinger" },
      capability: { id: capability.id },
      context: { environment: "internal-beta" },
    });
    expect(provider.executionCount).toBe(0);
    await expect(registry.execute(request(capability.id))).resolves.toMatchObject({
      providerId: "hostinger",
    });
    expect(provider.executionCount).toBe(1);
  });

  it.each(["unsupported", "unconfirmed", "not_entitled", "unavailable", "deprecated"] as const)(
    "returns NOT_SUPPORTED for %s capability before executor",
    async (status) => {
      const capability = descriptor(`hosting.${status}`, status);
      const provider = new MockInfrastructureProvider("hostinger", [capability]);
      const registry = await new ProviderFactory().bootstrap({
        providers: [provider],
        environments: profiles(capability.id),
        audit: new InMemoryProviderExecutionAudit(),
      });

      await expect(registry.execute(request(capability.id))).rejects.toMatchObject({
        code: "NOT_SUPPORTED",
      });
      expect(provider.executionCount).toBe(0);
    },
  );

  it("keeps experimental operations disabled in every approved environment", async () => {
    const capability = descriptor("deployment.docker.execute", "experimental");
    const provider = new MockInfrastructureProvider("hostinger", [capability]);
    const registry = await new ProviderFactory().bootstrap({
      providers: [provider],
      environments: profiles(capability.id),
      audit: new InMemoryProviderExecutionAudit(),
    });

    await expect(
      registry.execute({ ...request(capability.id), allowExperimental: true }),
    ).rejects.toMatchObject({ code: "EXPERIMENTAL_CAPABILITY_DISABLED" });
    expect(provider.executionCount).toBe(0);
  });

  it("enforces partial capability resource restrictions before executor", async () => {
    const capability = descriptor("ssl.certificate.read", "partial", ["website"]);
    const provider = new MockInfrastructureProvider("hostinger", [capability]);
    const registry = await new ProviderFactory().bootstrap({
      providers: [provider],
      environments: profiles(capability.id),
      audit: new InMemoryProviderExecutionAudit(),
    });

    await expect(
      registry.execute(request(capability.id, { resourceType: "vps" })),
    ).rejects.toMatchObject({ code: "PROVIDER_CAPABILITY_REJECTED" });
    await expect(
      registry.execute(request(capability.id, { resourceType: "website" })),
    ).resolves.toMatchObject({ providerId: "hostinger" });
    expect(provider.executionCount).toBe(1);
  });

  it("rejects unknown capability and never uses payload providerId", async () => {
    const capability = descriptor("dns.record.read");
    const provider = new MockInfrastructureProvider("hostinger", [capability]);
    const audit = new InMemoryProviderExecutionAudit();
    const registry = await new ProviderFactory().bootstrap({
      providers: [provider],
      environments: profiles(capability.id),
      audit,
    });

    await expect(
      registry.execute(request("database.postgresql.query", { providerId: "hostinger" })),
    ).rejects.toMatchObject({ code: "NOT_SUPPORTED" });
    expect(provider.executionCount).toBe(0);
    expect(JSON.stringify(audit.events())).not.toContain("payload");
    expect(JSON.stringify(audit.events())).not.toContain('providerId":"hostinger');
  });

  it("rejects an environment capability allowlist violation", async () => {
    const capability = descriptor("dns.record.read");
    const provider = new MockInfrastructureProvider("hostinger", [capability]);
    const configured = profiles(capability.id).map((profile) =>
      profile.environment === "internal-beta"
        ? { ...profile, allowedCapabilities: Object.freeze([]) }
        : profile,
    );

    await expect(
      new ProviderFactory().bootstrap({
        providers: [provider],
        environments: configured,
        audit: new InMemoryProviderExecutionAudit(),
      }),
    ).rejects.toBeInstanceOf(InfrastructureError);
  });
});

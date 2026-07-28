import { describe, expect, it } from "vitest";
import {
  INFRASTRUCTURE_EXECUTION_STAGES,
  InMemoryProviderExecutionAudit,
  type CapabilityDescriptor,
  type EnvironmentConfiguration,
  type InfrastructureRequest,
} from "../core/index";
import { ManifestInfrastructureProvider } from "../shared/manifest-infrastructure-provider";
import { ProviderFactory } from "../shared/provider-factory";
import { MockInfrastructureProvider } from "../shared/testing";

function descriptor(id: string, category: string): CapabilityDescriptor {
  return Object.freeze({
    id,
    category,
    plane: category === "release" ? "source" : category === "database" ? "data" : "control",
    status: "supported",
    access: "write",
    officialReferences: Object.freeze(["https://docs.github.com/en/rest"]),
  });
}

const dns = descriptor("dns.record.manage", "dns");
const database = descriptor("database.postgresql.query", "database");
const release = descriptor("release.manage", "release");
const bindings = Object.freeze({
  [dns.id]: "hostinger",
  [database.id]: "supabase",
  [release.id]: "github",
});

function environments(): readonly EnvironmentConfiguration[] {
  return (["development", "internal-beta", "staging", "production"] as const).map((environment) =>
    Object.freeze({
      environment,
      availableProviders: Object.freeze(["hostinger", "supabase", "github"]),
      allowedCapabilities: Object.freeze([dns.id, database.id, release.id]),
      experimentalCapabilities: Object.freeze([]),
      bindings,
      credentialSources: Object.freeze({
        hostinger: Object.freeze({
          kind: "secret-manager" as const,
          reference: `paysave/${environment}/hostinger-provider-credentials`,
        }),
        supabase: Object.freeze({
          kind: "secret-manager" as const,
          reference: `paysave/${environment}/supabase-provider-credentials`,
        }),
        github: Object.freeze({
          kind: "workload-identity" as const,
          reference: `paysave/${environment}/github-app-identity`,
        }),
      }),
    }),
  );
}

function request(capability: string, correlationId: string): InfrastructureRequest {
  return {
    capability,
    payload: { providerId: "attacker-controlled" },
    context: {
      environment: "internal-beta",
      tenantId: "tenant-a",
      actorId: "actor-a",
      correlationId,
    },
  };
}

describe("ProviderFactory and InfrastructureRegistry integration", () => {
  it("publishes the exact mandatory execution-stage model", () => {
    expect(INFRASTRUCTURE_EXECUTION_STAGES).toEqual([
      "registry-integrity",
      "capability-negotiation",
      "environment-policy",
      "provider-selection",
      "permit-generation",
      "preflight",
      "execution",
      "postflight",
      "audit",
      "response",
    ]);
  });

  it("routes DNS, database, and release deterministically without client provider selection", async () => {
    const hostinger = new MockInfrastructureProvider("hostinger", [dns]);
    const supabase = new MockInfrastructureProvider("supabase", [database]);
    const github = new MockInfrastructureProvider("github", [release]);
    const audit = new InMemoryProviderExecutionAudit();
    const registry = await new ProviderFactory().bootstrap({
      providers: [github, hostinger, supabase],
      environments: environments(),
      audit,
      clock: () => new Date("2026-07-26T10:00:00.000Z"),
      executionIdFactory: (item) => `execution:${item.context.correlationId}`,
    });

    await expect(registry.execute(request(dns.id, "dns"))).resolves.toMatchObject({
      providerId: "hostinger",
    });
    await expect(registry.execute(request(database.id, "database"))).resolves.toMatchObject({
      providerId: "supabase",
    });
    await expect(registry.execute(request(release.id, "release"))).resolves.toMatchObject({
      providerId: "github",
    });
    expect([hostinger.executionCount, supabase.executionCount, github.executionCount]).toEqual([
      1, 1, 1,
    ]);
    expect(audit.events()).toHaveLength(3);
    expect(audit.events().map((event) => event.outcome)).toEqual([
      "succeeded",
      "succeeded",
      "succeeded",
    ]);
    expect(JSON.stringify(audit.events())).not.toContain("attacker-controlled");
    await registry.shutdown();
    await expect(registry.health()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ status: "stopped" })]),
    );
  });

  it("audits rejected policy requests without executing a provider", async () => {
    const hostinger = new MockInfrastructureProvider("hostinger", [dns]);
    const audit = new InMemoryProviderExecutionAudit();
    const profiles = environments().map((profile) => ({
      ...profile,
      availableProviders: Object.freeze(["hostinger"]),
      allowedCapabilities: Object.freeze([dns.id]),
      bindings: Object.freeze({ [dns.id]: "hostinger" }),
      credentialSources: Object.freeze({ hostinger: profile.credentialSources.hostinger! }),
    }));
    const registry = await new ProviderFactory().bootstrap({
      providers: [hostinger],
      environments: profiles,
      audit,
      executionIdFactory: () => "rejected-execution",
    });

    await expect(registry.execute(request(database.id, "rejected"))).rejects.toMatchObject({
      code: "NOT_SUPPORTED",
    });
    expect(hostinger.executionCount).toBe(0);
    expect(audit.events()).toEqual([
      expect.objectContaining({
        outcome: "rejected",
        stage: "capability-negotiation",
        errorCode: "NOT_SUPPORTED",
      }),
    ]);
  });

  it("rejects postflight result drift and records the failed boundary", async () => {
    const provider = new ManifestInfrastructureProvider("hostinger", [dns], {
      execute: async (_providerId, item) => ({
        providerId: "supabase",
        capability: item.capability,
        correlationId: item.context.correlationId,
        data: { simulated: true },
      }),
    });
    const audit = new InMemoryProviderExecutionAudit();
    const profiles = environments().map((profile) => ({
      ...profile,
      availableProviders: Object.freeze(["hostinger"]),
      allowedCapabilities: Object.freeze([dns.id]),
      bindings: Object.freeze({ [dns.id]: "hostinger" }),
      credentialSources: Object.freeze({ hostinger: profile.credentialSources.hostinger! }),
    }));
    const registry = await new ProviderFactory().bootstrap({
      providers: [provider],
      environments: profiles,
      audit,
      executionIdFactory: () => "postflight-rejection",
    });

    await expect(registry.execute(request(dns.id, "postflight"))).rejects.toMatchObject({
      code: "PROVIDER_POSTFLIGHT_REJECTED",
    });
    expect(audit.events()).toEqual([
      expect.objectContaining({
        outcome: "rejected",
        stage: "postflight",
        errorCode: "PROVIDER_POSTFLIGHT_REJECTED",
      }),
    ]);
  });

  it("audits resolution failures at their exact mandatory pipeline stages", async () => {
    const capabilityNotAllowedAudit = new InMemoryProviderExecutionAudit();
    const hostinger = new MockInfrastructureProvider("hostinger", [dns]);
    const deniedProfiles = environments().map((profile) => ({
      ...profile,
      availableProviders: Object.freeze(["hostinger"]),
      allowedCapabilities: Object.freeze<string[]>([]),
      bindings: Object.freeze({}),
      credentialSources: Object.freeze({ hostinger: profile.credentialSources.hostinger! }),
    }));
    const deniedRegistry = await new ProviderFactory().bootstrap({
      providers: [hostinger],
      environments: deniedProfiles,
      audit: capabilityNotAllowedAudit,
    });
    await expect(
      deniedRegistry.execute(request(dns.id, "environment-stage")),
    ).rejects.toMatchObject({
      code: "CAPABILITY_NOT_ALLOWED_IN_ENVIRONMENT",
    });
    expect(capabilityNotAllowedAudit.events()).toEqual([
      expect.objectContaining({ stage: "environment-policy", outcome: "rejected" }),
    ]);

    const experimentalDns = { ...dns, status: "experimental" as const };
    const supported = new MockInfrastructureProvider("hostinger", [dns]);
    const experimental = new MockInfrastructureProvider("supabase", [experimentalDns]);
    const selectionAudit = new InMemoryProviderExecutionAudit();
    const selectionProfiles = environments().map((profile) => ({
      ...profile,
      availableProviders: Object.freeze(["hostinger", "supabase"]),
      allowedCapabilities: Object.freeze([dns.id]),
      experimentalCapabilities: Object.freeze<string[]>([]),
      bindings: Object.freeze({ [dns.id]: "supabase" }),
      credentialSources: Object.freeze({
        hostinger: profile.credentialSources.hostinger!,
        supabase: profile.credentialSources.supabase!,
      }),
    }));
    const selectionRegistry = await new ProviderFactory().bootstrap({
      providers: [supported, experimental],
      environments: selectionProfiles,
      audit: selectionAudit,
    });
    await expect(
      selectionRegistry.execute(request(dns.id, "selection-stage")),
    ).rejects.toMatchObject({ code: "NOT_SUPPORTED" });
    expect(selectionAudit.events()).toEqual([
      expect.objectContaining({ stage: "provider-selection", outcome: "rejected" }),
    ]);
  });

  it("returns a successful provider result and buffers the audit when the primary sink fails", async () => {
    const hostinger = new MockInfrastructureProvider("hostinger", [dns]);
    const profiles = environments().map((profile) => ({
      ...profile,
      availableProviders: Object.freeze(["hostinger"]),
      allowedCapabilities: Object.freeze([dns.id]),
      bindings: Object.freeze({ [dns.id]: "hostinger" }),
      credentialSources: Object.freeze({ hostinger: profile.credentialSources.hostinger! }),
    }));
    const registry = await new ProviderFactory().bootstrap({
      providers: [hostinger],
      environments: profiles,
      audit: {
        record: async () => {
          throw new Error("audit transport unavailable");
        },
      },
      executionIdFactory: () => "audit-fallback",
    });

    await expect(registry.execute(request(dns.id, "audit-fallback"))).resolves.toMatchObject({
      providerId: "hostinger",
      capability: dns.id,
    });
    expect(hostinger.executionCount).toBe(1);
    expect(registry.emergencyAuditEvents()).toEqual([
      expect.objectContaining({
        executionId: "audit-fallback",
        outcome: "succeeded",
        stage: "audit",
      }),
    ]);
  });
});

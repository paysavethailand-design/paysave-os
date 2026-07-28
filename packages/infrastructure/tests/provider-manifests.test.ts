import { describe, expect, it, vi } from "vitest";
import {
  CAPABILITIES,
  InMemoryProviderExecutionAudit,
  type EnvironmentConfiguration,
  type InfrastructureRequest,
  type InfrastructureResult,
  type ProviderExecutionContext,
} from "../core/index";
import { createGitHubProvider } from "../github/index";
import { createHostingerProvider } from "../hostinger/index";
import { createSupabaseProvider } from "../supabase/index";
import { ProviderFactory } from "../shared/provider-factory";
import type { ProviderExecutor } from "../shared/provider-executor";

const context = {
  environment: "staging" as const,
  tenantId: "tenant-paysave",
  actorId: "actor-test",
  correlationId: "corr-provider-manifest",
};

function executor(): ProviderExecutor & { execute: ReturnType<typeof vi.fn> } {
  return {
    execute: vi.fn(
      async (
        providerId: string,
        request: InfrastructureRequest,
        _capability: unknown,
      ): Promise<InfrastructureResult> => ({
        providerId,
        capability: request.capability,
        correlationId: request.context.correlationId,
        data: request.payload,
      }),
    ),
  };
}

describe("official provider manifests", () => {
  it("declares Hostinger capabilities without promoting partial or experimental features", () => {
    const provider = createHostingerProvider(executor());
    const status = new Map(provider.capabilities().map((item) => [item.id, item.status]));

    expect(status.get(CAPABILITIES.DOMAIN_PORTFOLIO_READ)).toBe("supported");
    expect(status.get(CAPABILITIES.DNS_RECORD_READ)).toBe("supported");
    expect(status.get(CAPABILITIES.VPS_METRICS_READ)).toBe("supported");
    expect(status.get(CAPABILITIES.SSL_CERTIFICATE_EXPIRY_READ)).toBe("partial");
    expect(status.get(CAPABILITIES.SSL_CERTIFICATE_MANAGE)).toBe("unsupported");
    expect(status.get(CAPABILITIES.FILE_OPERATION_MANAGE)).toBe("unsupported");
    expect(status.get(CAPABILITIES.SNAPSHOT_VPS_READ)).toBe("supported");
    expect(status.get(CAPABILITIES.HOSTING_NEXTJS_RUNTIME)).toBe("supported");
    expect(status.get(CAPABILITIES.DEPLOYMENT_ARCHIVE_BUILD)).toBe("supported");
    expect(status.get(CAPABILITIES.LOGS_BUILD_READ)).toBe("supported");
    expect(status.get(CAPABILITIES.HOSTING_RUNTIME_RESTART)).toBe("supported");
    expect(status.get(CAPABILITIES.DEPLOYMENT_DOCKER_COMPOSE_EXECUTE)).toBe("experimental");
    expect(status.has(CAPABILITIES.DATABASE_POSTGRESQL_QUERY)).toBe(false);
    expect(provider.capabilities().every((item) => item.officialReferences.length > 0)).toBe(true);
    expect(
      provider
        .capabilities()
        .flatMap((item) => item.officialReferences)
        .every(
          (url) =>
            url.startsWith("https://developers.hostinger.com") ||
            url.startsWith("https://www.hostinger.com"),
        ),
    ).toBe(true);
  });

  it("declares Supabase PostgreSQL, Auth, Storage, Edge Functions, and Realtime capabilities", () => {
    const provider = createSupabaseProvider(executor());
    const ids = new Set(provider.capabilities().map((item) => item.id));

    expect(ids).toEqual(
      expect.objectContaining({
        has: expect.any(Function),
      }),
    );
    for (const id of [
      CAPABILITIES.DATABASE_POSTGRESQL_QUERY,
      CAPABILITIES.AUTHENTICATION_SESSION_MANAGE,
      CAPABILITIES.STORAGE_OBJECT_MANAGE,
      CAPABILITIES.EDGE_FUNCTION_INVOKE,
      CAPABILITIES.EDGE_FUNCTION_MANAGE,
      CAPABILITIES.REALTIME_CHANNEL_SUBSCRIBE,
      CAPABILITIES.HEALTH_SERVICE_STATUS_READ,
    ]) {
      expect(ids.has(id)).toBe(true);
    }
    expect(provider.capabilities().every((item) => item.officialReferences.length > 0)).toBe(true);
    const byId = new Map(provider.capabilities().map((item) => [item.id, item]));
    expect(byId.get(CAPABILITIES.DATABASE_POSTGRESQL_QUERY)?.plane).toBe("data");
    expect(byId.get(CAPABILITIES.AUTHENTICATION_SESSION_MANAGE)?.plane).toBe("data");
    expect(byId.get(CAPABILITIES.EDGE_FUNCTION_MANAGE)?.plane).toBe("control");
    expect(byId.get(CAPABILITIES.HEALTH_SERVICE_STATUS_READ)?.plane).toBe("control");
    expect(
      provider
        .capabilities()
        .flatMap((item) => item.officialReferences)
        .every((url) => url.startsWith("https://supabase.com/docs")),
    ).toBe(true);
  });

  it("declares GitHub Repository, Release, CI/Actions, and Source Version capabilities", () => {
    const provider = createGitHubProvider(executor());
    const ids = new Set(provider.capabilities().map((item) => item.id));

    for (const id of [
      CAPABILITIES.REPOSITORY_READ,
      CAPABILITIES.RELEASE_READ,
      CAPABILITIES.CI_WORKFLOW_DISPATCH,
      CAPABILITIES.SOURCE_COMMIT_METADATA_READ,
      CAPABILITIES.SOURCE_TAG_READ,
      CAPABILITIES.SOURCE_VERSION_READ,
    ]) {
      expect(ids.has(id)).toBe(true);
    }
    expect(ids.has(CAPABILITIES.DNS_RECORD_READ)).toBe(false);
    expect(provider.capabilities().every((item) => item.officialReferences.length > 0)).toBe(true);
    expect(
      provider
        .capabilities()
        .flatMap((item) => item.officialReferences)
        .every((url) => url.startsWith("https://docs.github.com")),
    ).toBe(true);
  });

  it("rejects direct provider execution without an Infrastructure Registry permit", async () => {
    const directExecutor = executor();
    const provider = createHostingerProvider(directExecutor);
    const request: InfrastructureRequest = {
      capability: CAPABILITIES.DEPLOYMENT_DOCKER_COMPOSE_EXECUTE,
      payload: undefined,
      allowExperimental: true,
      context: {
        environment: "development",
        tenantId: "tenant-a",
        actorId: "actor-a",
        correlationId: "direct-call",
      },
    };
    const executionContext: ProviderExecutionContext = {
      executionId: "direct",
      providerId: "hostinger",
      capability: request.capability,
      environment: "development",
      credentialSource: {
        kind: "secret-manager",
        reference: "paysave/development/hostinger-provider-credentials",
      },
      startedAt: "2026-07-26T10:00:00.000Z",
    };

    await expect(
      provider.execute(request, executionContext, undefined as never),
    ).rejects.toThrowError(/only through InfrastructureRegistry/);
    expect(directExecutor.execute).not.toHaveBeenCalled();
  });

  it("uses an injected executor only after registry capability resolution", async () => {
    const hostingerExecutor = executor();
    const supabaseExecutor = executor();
    const githubExecutor = executor();
    const hostinger = createHostingerProvider(hostingerExecutor);
    const supabase = createSupabaseProvider(supabaseExecutor);
    const github = createGitHubProvider(githubExecutor);
    const allowedCapabilities = Object.freeze([
      CAPABILITIES.DNS_RECORD_READ,
      CAPABILITIES.DATABASE_POSTGRESQL_QUERY,
      CAPABILITIES.RELEASE_READ,
    ]);
    const bindings = Object.freeze({
      [CAPABILITIES.DNS_RECORD_READ]: "hostinger",
      [CAPABILITIES.DATABASE_POSTGRESQL_QUERY]: "supabase",
      [CAPABILITIES.RELEASE_READ]: "github",
    });
    const environments: readonly EnvironmentConfiguration[] = (
      ["development", "internal-beta", "staging", "production"] as const
    ).map((environment) => ({
      environment,
      availableProviders: Object.freeze(["hostinger", "supabase", "github"]),
      allowedCapabilities,
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
    }));
    const infrastructure = await new ProviderFactory().bootstrap({
      providers: [hostinger, supabase, github],
      environments,
      audit: new InMemoryProviderExecutionAudit(),
    });

    await infrastructure.execute({
      capability: CAPABILITIES.DATABASE_POSTGRESQL_QUERY,
      context,
      payload: { statementId: "query-safe-id" },
    });

    expect(supabaseExecutor.execute).toHaveBeenCalledTimes(1);
    expect(supabaseExecutor.execute).toHaveBeenCalledWith(
      "supabase",
      expect.objectContaining({ capability: CAPABILITIES.DATABASE_POSTGRESQL_QUERY }),
      expect.objectContaining({ plane: "data" }),
      expect.objectContaining({
        providerId: "supabase",
        environment: "staging",
      }),
    );
    expect(hostingerExecutor.execute).not.toHaveBeenCalled();
    expect(githubExecutor.execute).not.toHaveBeenCalled();
  });
});

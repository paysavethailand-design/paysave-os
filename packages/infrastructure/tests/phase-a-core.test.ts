import { describe, expect, it } from "vitest";
import {
  CapabilityRegistry,
  CapabilityResolver,
  InfrastructureError,
  ProviderRegistry,
  type CapabilityDescriptor,
} from "../core/index";
import { MockInfrastructureProvider } from "../shared/testing";

const dns: CapabilityDescriptor = Object.freeze({
  id: "dns.record.read",
  category: "dns",
  plane: "control",
  status: "supported",
  access: "read",
  officialReferences: Object.freeze(["https://developers.hostinger.com/openapi/openapi.json"]),
});

describe("immutable bootstrap registries", () => {
  it("bootstraps ProviderRegistry once and exposes no runtime register method", () => {
    const provider = new MockInfrastructureProvider("hostinger", [dns]);
    const registry = new ProviderRegistry([provider]);

    expect(registry.list()).toEqual([provider]);
    expect("register" in registry).toBe(false);
    expect(Object.isFrozen(registry.list())).toBe(true);
    expect(() => new ProviderRegistry([provider, provider])).toThrowError(
      expect.objectContaining({ code: "PROVIDER_ALREADY_REGISTERED" }) as InfrastructureError,
    );
  });

  it("derives immutable capability candidates at bootstrap", () => {
    const hostinger = new MockInfrastructureProvider("hostinger", [dns]);
    const capabilities = new CapabilityRegistry([hostinger]);
    const resolver = new CapabilityResolver(capabilities);

    const candidates = resolver.resolve("dns.record.read");
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.providerId).toBe("hostinger");
    expect(Object.isFrozen(candidates)).toBe(true);
    expect("registerProvider" in capabilities).toBe(false);
  });

  it("fails closed for unknown capabilities", () => {
    const resolver = new CapabilityResolver(new CapabilityRegistry([]));

    expect(() => resolver.resolve("file.operation.write")).toThrowError(
      expect.objectContaining({ code: "NOT_SUPPORTED" }) as InfrastructureError,
    );
  });
});

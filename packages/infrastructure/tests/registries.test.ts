import { describe, expect, it } from "vitest";
import {
  CapabilityRegistry,
  InfrastructureError,
  ProviderRegistry,
  type CapabilityDescriptor,
} from "../core/index";
import { MockInfrastructureProvider } from "../shared/testing";

const descriptor: CapabilityDescriptor = Object.freeze({
  id: "dns.record.read",
  category: "dns",
  plane: "control",
  status: "supported",
  access: "read",
  officialReferences: Object.freeze(["https://developers.hostinger.com/openapi/openapi.json"]),
});

describe("immutable provider and capability registries", () => {
  it("bootstraps providers once and rejects duplicate identifiers", () => {
    const provider = new MockInfrastructureProvider("hostinger", [descriptor]);
    const registry = new ProviderRegistry([provider]);

    expect(registry.get("hostinger")).toBe(provider);
    expect(registry.list()).toEqual([provider]);
    expect(Object.isFrozen(registry.list())).toBe(true);
    expect(() => registry.get("missing")).toThrowError(
      expect.objectContaining({ code: "PROVIDER_NOT_REGISTERED" }) as InfrastructureError,
    );
    expect(() => new ProviderRegistry([provider, provider])).toThrowError(
      expect.objectContaining({ code: "PROVIDER_ALREADY_REGISTERED" }) as InfrastructureError,
    );
  });

  it("creates an immutable deterministic capability snapshot", () => {
    const hostinger = new MockInfrastructureProvider("hostinger", [descriptor]);
    const cloudflare = new MockInfrastructureProvider("cloudflare", [descriptor]);
    const registry = new CapabilityRegistry([hostinger, cloudflare]);

    expect(registry.candidates(descriptor.id).map((item) => item.providerId)).toEqual([
      "cloudflare",
      "hostinger",
    ]);
    expect(registry.get("hostinger", descriptor.id)).toMatchObject({
      status: "supported",
    });
    expect(Object.isFrozen(registry.candidates(descriptor.id))).toBe(true);
    expect(Object.isFrozen(registry.list())).toBe(true);
  });

  it("rejects duplicate provider/capability registrations at bootstrap", () => {
    expect(() =>
      CapabilityRegistry.fromRegistrations([
        { providerId: "hostinger", capabilities: [descriptor, descriptor] },
      ]),
    ).toThrowError(
      expect.objectContaining({
        code: "PROVIDER_CAPABILITY_ALREADY_REGISTERED",
      }) as InfrastructureError,
    );
  });
});

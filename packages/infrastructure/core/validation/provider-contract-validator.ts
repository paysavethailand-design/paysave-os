import type { InfrastructureProvider } from "../interfaces/infrastructure-provider";
import type { CapabilityAccess, CapabilityPlane, CapabilityStatus } from "../models/capability";
import { InfrastructureError } from "../models/error";

const REQUIRED_MEMBERS = Object.freeze([
  "initialize",
  "shutdown",
  "health",
  "capabilities",
  "supports",
  "execute",
  "validate",
  "preflight",
  "postflight",
] as const);

const VALID_STATUSES = new Set<CapabilityStatus>([
  "supported",
  "partial",
  "experimental",
  "unconfirmed",
  "unsupported",
  "not_entitled",
  "unavailable",
  "deprecated",
]);
const VALID_PLANES = new Set<CapabilityPlane>(["control", "data", "source", "shared"]);
const VALID_ACCESS = new Set<CapabilityAccess>(["read", "write", "destructive", "purchase"]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown, allowEmpty = true): value is readonly string[] {
  return Array.isArray(value) && (allowEmpty || value.length > 0) && value.every(isNonEmptyString);
}

export class ProviderContractValidator {
  public validate(provider: InfrastructureProvider): void {
    const missing = REQUIRED_MEMBERS.filter((member) => typeof provider?.[member] !== "function");
    if (!isNonEmptyString(provider?.id) || missing.length > 0) {
      throw new InfrastructureError(
        "PROVIDER_CONTRACT_INVALID",
        `Provider ${provider?.id || "unknown"} has an invalid mandatory contract`,
        { providerId: provider?.id, missing },
      );
    }
    const capabilities = provider.capabilities();
    if (!Array.isArray(capabilities)) {
      throw new InfrastructureError(
        "PROVIDER_CONTRACT_INVALID",
        `Provider ${provider.id} returned an invalid capability manifest`,
        { providerId: provider.id },
      );
    }
    const ids = new Set<string>();
    for (const capability of capabilities) {
      const valid =
        isNonEmptyString(capability?.id) &&
        !ids.has(capability.id) &&
        isNonEmptyString(capability.category) &&
        VALID_STATUSES.has(capability.status) &&
        VALID_PLANES.has(capability.plane) &&
        VALID_ACCESS.has(capability.access) &&
        isStringArray(capability.officialReferences, false) &&
        capability.officialReferences.every((reference: string) =>
          reference.startsWith("https://"),
        ) &&
        (capability.limitations === undefined || isStringArray(capability.limitations)) &&
        (capability.requiredResourceTypes === undefined ||
          isStringArray(capability.requiredResourceTypes));
      if (!valid) {
        throw new InfrastructureError(
          "PROVIDER_CONTRACT_INVALID",
          `Provider ${provider.id} has an invalid capability manifest`,
          { providerId: provider.id, capability: capability?.id },
        );
      }
      ids.add(capability.id);
    }
  }
}

import type { CapabilityCandidate } from "../models/capability";
import { InfrastructureError } from "../models/error";
import type { InfrastructureRequest } from "../models/request";

const NON_EXECUTABLE = new Set([
  "unconfirmed",
  "unsupported",
  "not_entitled",
  "unavailable",
  "deprecated",
]);

export class CapabilityNegotiator {
  public negotiate(
    candidates: readonly CapabilityCandidate[],
    request: InfrastructureRequest,
  ): readonly CapabilityCandidate[] {
    const executable = candidates.filter(
      (candidate) => !NON_EXECUTABLE.has(candidate.capability.status),
    );
    const negotiated = executable.filter(
      (candidate) =>
        candidate.capability.status !== "experimental" || request.allowExperimental === true,
    );
    if (negotiated.length > 0) {
      return Object.freeze([...negotiated]);
    }
    const experimental = executable.find(
      (candidate) => candidate.capability.status === "experimental",
    );
    if (experimental) {
      throw new InfrastructureError(
        "EXPERIMENTAL_CAPABILITY_DISABLED",
        `Experimental capability ${experimental.capability.id} requires request opt-in`,
        {
          providerId: experimental.providerId,
          capability: experimental.capability.id,
        },
      );
    }
    const rejected = candidates[0];
    throw new InfrastructureError(
      "NOT_SUPPORTED",
      `Capability ${request.capability} is not executable by any registered provider`,
      {
        capability: request.capability,
        ...(rejected
          ? {
              providerId: rejected.providerId,
              status: rejected.capability.status,
            }
          : {}),
      },
    );
  }
}

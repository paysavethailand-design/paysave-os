import { describe, expect, it } from "vitest";
import {
  INFRASTRUCTURE_ENVIRONMENT_SUMMARIES,
  INFRASTRUCTURE_PROVIDER_MANIFESTS,
} from "../read-models";

describe("Infrastructure Center read models", () => {
  it("publishes immutable provider manifests without lifecycle or executor surfaces", () => {
    expect(INFRASTRUCTURE_PROVIDER_MANIFESTS.map((provider) => provider.id)).toEqual([
      "github",
      "hostinger",
      "supabase",
    ]);
    expect(Object.isFrozen(INFRASTRUCTURE_PROVIDER_MANIFESTS)).toBe(true);
    expect(
      INFRASTRUCTURE_PROVIDER_MANIFESTS.every(
        (provider) => Object.isFrozen(provider) && Object.isFrozen(provider.capabilities),
      ),
    ).toBe(true);

    expect(
      INFRASTRUCTURE_PROVIDER_MANIFESTS.every(
        (provider) =>
          ["capabilities", "displayName", "id"].every((key) => Object.hasOwn(provider, key)) &&
          Object.keys(provider).length === 3,
      ),
    ).toBe(true);
    expect(JSON.stringify(INFRASTRUCTURE_PROVIDER_MANIFESTS)).not.toMatch(
      /credential|secret|token|password/i,
    );
  });

  it("publishes secret-free immutable environment summaries", () => {
    expect(INFRASTRUCTURE_ENVIRONMENT_SUMMARIES.map((environment) => environment.id)).toEqual([
      "development",
      "internal-beta",
      "production",
      "staging",
    ]);
    expect(Object.isFrozen(INFRASTRUCTURE_ENVIRONMENT_SUMMARIES)).toBe(true);
    expect(JSON.stringify(INFRASTRUCTURE_ENVIRONMENT_SUMMARIES)).not.toMatch(
      /credential|secret-manager|token|password|reference/i,
    );
  });
});

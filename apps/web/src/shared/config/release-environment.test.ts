import { describe, expect, it } from "vitest";
import { applyFrozenReleaseEnvironment } from "./release-environment";

const commitSha = "e00b2eaf9f38ef98f14a70cbd59464e2af99037d";

const frozenReleaseEnvironment = {
  NODE_ENV: "test",
  PAYSAVE_RELEASE_VERSION: "0.1.0",
  PAYSAVE_SOURCE_REVISION: commitSha,
  PAYSAVE_BUILD_TIME: "2026-08-05T06:00:00.000Z",
} as NodeJS.ProcessEnv;

describe("applyFrozenReleaseEnvironment", () => {
  it("keeps the build-frozen commit SHA when runtime configuration contains a branch/ref", () => {
    expect(
      applyFrozenReleaseEnvironment(
        {
          NODE_ENV: "test",
          PAYSAVE_SOURCE_REVISION: "fix/release-identity",
          VERCEL_GIT_COMMIT_REF: "fix/release-identity",
        } as NodeJS.ProcessEnv,
        frozenReleaseEnvironment,
      ).PAYSAVE_SOURCE_REVISION,
    ).toBe(commitSha);
  });

  it("does not copy VERCEL_GIT_COMMIT_REF into PAYSAVE_SOURCE_REVISION", () => {
    expect(
      applyFrozenReleaseEnvironment(
        {
          NODE_ENV: "test",
          VERCEL_GIT_COMMIT_REF: "feature/release-identity",
        } as NodeJS.ProcessEnv,
        frozenReleaseEnvironment,
      ),
    ).toMatchObject({ PAYSAVE_SOURCE_REVISION: commitSha });
  });
});

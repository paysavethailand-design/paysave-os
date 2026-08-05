import { applyFrozenReleaseEnvironment } from "@/shared/config/release-environment";

export interface VersionPayload {
  readonly service: "paysave-web";
  readonly releaseVersion: string;
  readonly sourceRevision: string;
  readonly buildTime: string;
}

export function buildVersionPayload(
  environment: NodeJS.ProcessEnv = applyFrozenReleaseEnvironment(),
): VersionPayload {
  return {
    service: "paysave-web",
    releaseVersion: environment.PAYSAVE_RELEASE_VERSION ?? "unknown",
    sourceRevision: environment.PAYSAVE_SOURCE_REVISION ?? "unknown",
    buildTime: environment.PAYSAVE_BUILD_TIME ?? "unknown",
  };
}

export interface VersionPayload {
  readonly service: "paysave-web";
  readonly releaseVersion: string;
  readonly sourceRevision: string;
  readonly buildTime: string;
}

export function buildVersionPayload(environment: NodeJS.ProcessEnv = process.env): VersionPayload {
  return {
    service: "paysave-web",
    releaseVersion:
      environment.PAYSAVE_RELEASE_VERSION ?? process.env.PAYSAVE_RELEASE_VERSION ?? "unknown",
    sourceRevision:
      environment.PAYSAVE_SOURCE_REVISION ?? process.env.PAYSAVE_SOURCE_REVISION ?? "unknown",
    buildTime: environment.PAYSAVE_BUILD_TIME ?? process.env.PAYSAVE_BUILD_TIME ?? "unknown",
  };
}

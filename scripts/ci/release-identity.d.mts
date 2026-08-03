export interface ReleaseIdentity {
  releaseVersion: string;
  sourceRevision: string;
  buildTime: string;
}

export interface ReleaseIdentityOptions {
  environment?: NodeJS.ProcessEnv;
  packageVersion?: string;
  now?: () => Date;
  fallbackRevision?: string;
}

export function currentGitRevision(cwd?: string): string;
export function resolveReleaseIdentity(options?: ReleaseIdentityOptions): ReleaseIdentity;
export function releaseIdentityEnvironment(identity: ReleaseIdentity): {
  PAYSAVE_RELEASE_VERSION: string;
  PAYSAVE_SOURCE_REVISION: string;
  PAYSAVE_BUILD_TIME: string;
};
export function frozenReleaseIdentity(environment?: NodeJS.ProcessEnv): ReleaseIdentity;

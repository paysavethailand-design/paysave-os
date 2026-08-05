const buildFrozenReleaseEnvironment = {
  NODE_ENV: process.env.NODE_ENV,
  PAYSAVE_RELEASE_VERSION: process.env.PAYSAVE_RELEASE_VERSION,
  PAYSAVE_SOURCE_REVISION: process.env.PAYSAVE_SOURCE_REVISION,
  PAYSAVE_BUILD_TIME: process.env.PAYSAVE_BUILD_TIME,
} as NodeJS.ProcessEnv;

export function applyFrozenReleaseEnvironment(
  runtimeEnvironment: NodeJS.ProcessEnv = process.env,
  frozenEnvironment: NodeJS.ProcessEnv = buildFrozenReleaseEnvironment,
): NodeJS.ProcessEnv {
  return {
    ...runtimeEnvironment,
    PAYSAVE_RELEASE_VERSION: frozenEnvironment.PAYSAVE_RELEASE_VERSION,
    PAYSAVE_SOURCE_REVISION: frozenEnvironment.PAYSAVE_SOURCE_REVISION,
    PAYSAVE_BUILD_TIME: frozenEnvironment.PAYSAVE_BUILD_TIME,
  };
}

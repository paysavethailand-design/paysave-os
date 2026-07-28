import { CAPABILITIES, type CapabilityDescriptor } from "../core/index";
import { ManifestInfrastructureProvider } from "../shared/manifest-infrastructure-provider";
import type { ProviderExecutor } from "../shared/provider-executor";

const DOCS = {
  repositories: "https://docs.github.com/en/rest/repos/repos",
  releases: "https://docs.github.com/en/rest/releases/releases",
  workflows: "https://docs.github.com/en/rest/actions/workflows",
  runs: "https://docs.github.com/en/rest/actions/workflow-runs",
  commits: "https://docs.github.com/en/rest/commits/commits",
  refs: "https://docs.github.com/en/rest/git/refs",
  tags: "https://docs.github.com/en/rest/git/tags",
} as const;

export const GITHUB_CAPABILITIES: readonly CapabilityDescriptor[] = [
  {
    id: CAPABILITIES.REPOSITORY_READ,
    plane: "source",
    category: "repository",
    status: "supported",
    access: "read",
    officialReferences: [DOCS.repositories],
  },
  {
    id: CAPABILITIES.REPOSITORY_WRITE,
    plane: "source",
    category: "repository",
    status: "supported",
    access: "write",
    officialReferences: [DOCS.repositories],
  },
  {
    id: CAPABILITIES.RELEASE_READ,
    plane: "source",
    category: "release",
    status: "supported",
    access: "read",
    officialReferences: [DOCS.releases],
  },
  {
    id: CAPABILITIES.RELEASE_WRITE,
    plane: "source",
    category: "release",
    status: "supported",
    access: "write",
    officialReferences: [DOCS.releases],
  },
  {
    id: CAPABILITIES.CI_WORKFLOW_READ,
    plane: "source",
    category: "ci",
    status: "supported",
    access: "read",
    officialReferences: [DOCS.workflows],
  },
  {
    id: CAPABILITIES.CI_WORKFLOW_DISPATCH,
    plane: "source",
    category: "ci",
    status: "supported",
    access: "write",
    officialReferences: [DOCS.workflows],
  },
  {
    id: CAPABILITIES.CI_RUN_READ,
    plane: "source",
    category: "ci",
    status: "supported",
    access: "read",
    officialReferences: [DOCS.runs],
  },
  {
    id: CAPABILITIES.CI_RUN_CONTROL,
    plane: "source",
    category: "ci",
    status: "supported",
    access: "write",
    officialReferences: [DOCS.runs],
  },
  {
    id: CAPABILITIES.LOGS_CI_READ,
    plane: "source",
    category: "logs",
    status: "supported",
    access: "read",
    officialReferences: [DOCS.runs],
  },
  {
    id: CAPABILITIES.SOURCE_COMMIT_METADATA_READ,
    plane: "source",
    category: "commit-metadata",
    status: "supported",
    access: "read",
    officialReferences: [DOCS.commits],
  },
  {
    id: CAPABILITIES.SOURCE_TAG_READ,
    plane: "source",
    category: "tag",
    status: "supported",
    access: "read",
    officialReferences: [DOCS.tags],
  },
  {
    id: CAPABILITIES.SOURCE_VERSION_READ,
    plane: "source",
    category: "source-version",
    status: "supported",
    access: "read",
    officialReferences: [DOCS.commits, DOCS.refs, DOCS.tags],
  },
];

export function createGitHubProvider(executor: ProviderExecutor): ManifestInfrastructureProvider {
  return new ManifestInfrastructureProvider("github", GITHUB_CAPABILITIES, executor);
}

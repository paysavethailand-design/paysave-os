import {
  INFRASTRUCTURE_ENVIRONMENT_SUMMARIES,
  INFRASTRUCTURE_PROVIDER_MANIFESTS,
} from "@paysave/infrastructure/read-models";
import { readOperationalMetricsState } from "@paysave/observability";
import type {
  DiagnosticsCategory,
  DiagnosticsCheckSnapshot,
  DiagnosticsRepository,
  DiagnosticsSnapshot,
} from "../application/ports/diagnostics-repository";

type MetricsSnapshot = ReturnType<typeof readOperationalMetricsState>;

interface CheckDefinition {
  readonly id: string;
  readonly category: DiagnosticsCategory;
  readonly title: string;
  readonly validCode: string;
  readonly invalidCode: string;
  readonly validDetail: string;
  readonly invalidDetail: string;
  readonly evidence: readonly string[];
}

function validatedCheck(
  definition: CheckDefinition,
  validate: () => void,
): DiagnosticsCheckSnapshot {
  try {
    validate();
    return Object.freeze({
      id: definition.id,
      category: definition.category,
      outcome: "valid" as const,
      code: definition.validCode,
      title: definition.title,
      detail: definition.validDetail,
      evidence: Object.freeze([...definition.evidence]),
    });
  } catch {
    return Object.freeze({
      id: definition.id,
      category: definition.category,
      outcome: "invalid" as const,
      code: definition.invalidCode,
      title: definition.title,
      detail: definition.invalidDetail,
      evidence: Object.freeze([...definition.evidence]),
    });
  }
}

function requireCondition(condition: boolean): void {
  if (!condition) throw new Error("Diagnostics validation failed");
}

function validateMetrics(metrics: MetricsSnapshot): void {
  const counters = [
    metrics.healthzRequests,
    metrics.readyzRequests,
    metrics.versionRequests,
    metrics.metricsRequests,
    metrics.unhandledRouteErrors,
  ];
  requireCondition(counters.every((value) => Number.isSafeInteger(value) && value >= 0));
  requireCondition(metrics.readinessStatus === 0 || metrics.readinessStatus === 1);
}

/** Trusted validator over immutable read models; it has no provider lifecycle surface. */
export class Stage52DiagnosticsRepository implements DiagnosticsRepository {
  public constructor(
    private readonly readMetrics: () => MetricsSnapshot = readOperationalMetricsState,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  public async loadSnapshot(): Promise<DiagnosticsSnapshot> {
    const providers = INFRASTRUCTURE_PROVIDER_MANIFESTS;
    const environments = INFRASTRUCTURE_ENVIRONMENT_SUMMARIES;
    const providerIds = providers.map((provider) => provider.id);
    const registrations = providers.flatMap((provider) =>
      provider.capabilities.map((capability) => ({ providerId: provider.id, capability })),
    );
    const capabilityCount = registrations.length;
    const registrationKeys = registrations.map(
      ({ providerId, capability }) => `${providerId}:${capability.id}`,
    );

    const registryCheck = validatedCheck(
      {
        id: "registry-integrity",
        category: "registry",
        title: "Registry integrity",
        validCode: "REGISTRY_INTEGRITY_VALID",
        invalidCode: "REGISTRY_INTEGRITY_INVALID",
        validDetail: "Immutable provider and capability read models passed integrity validation.",
        invalidDetail: "Immutable provider and capability read models failed integrity validation.",
        evidence: [`providers=${providerIds.length}`, `capabilityRegistrations=${capabilityCount}`],
      },
      () => {
        requireCondition(new Set(providerIds).size === providerIds.length);
        requireCondition(new Set(registrationKeys).size === registrationKeys.length);
        requireCondition(providerIds.length > 0 && capabilityCount > 0);
      },
    );

    const capabilityCheck = validatedCheck(
      {
        id: "capability-contracts",
        category: "capability",
        title: "Provider capability contracts",
        validCode: "CAPABILITY_CONTRACTS_VALID",
        invalidCode: "CAPABILITY_CONTRACTS_INVALID",
        validDetail: "Immutable capability descriptors passed local shape validation.",
        invalidDetail: "One or more immutable capability descriptors failed validation.",
        evidence: [`providers=${providerIds.length}`, `capabilityRegistrations=${capabilityCount}`],
      },
      () => {
        requireCondition(
          registrations.every(
            ({ capability }) =>
              capability.id.length > 0 &&
              capability.category.length > 0 &&
              capability.plane.length > 0 &&
              capability.access.length > 0 &&
              capability.status.length > 0,
          ),
        );
      },
    );

    const requiredProfiles = ["development", "internal-beta", "production", "staging"];
    const profileIds = environments.map((environment) => environment.id);
    const environmentCheck = validatedCheck(
      {
        id: "environment-profiles",
        category: "environment",
        title: "Environment profiles",
        validCode: "ENVIRONMENT_PROFILES_VALID",
        invalidCode: "ENVIRONMENT_PROFILES_INVALID",
        validDetail: "Exactly the required immutable environment summaries are present.",
        invalidDetail: "The required immutable environment summary set is invalid or incomplete.",
        evidence: [`profiles=${profileIds.length}`, "requiredProfiles=4"],
      },
      () => requireCondition(JSON.stringify(profileIds) === JSON.stringify(requiredProfiles)),
    );

    const bindingCount = environments.reduce(
      (total, environment) => total + environment.bindingCount,
      0,
    );
    const configurationCheck = validatedCheck(
      {
        id: "configuration-bindings",
        category: "configuration",
        title: "Configuration bindings",
        validCode: "CONFIGURATION_BINDINGS_VALID",
        invalidCode: "CONFIGURATION_BINDINGS_INVALID",
        validDetail: "Environment summary counts passed local consistency checks.",
        invalidDetail: "One or more environment summary counts are inconsistent.",
        evidence: [`profiles=${environments.length}`, `bindings=${bindingCount}`],
      },
      () => {
        requireCondition(
          environments.every(
            (environment) =>
              environment.providerIds.length === providerIds.length &&
              environment.providerIds.every((providerId) =>
                providerIds.includes(providerId as never),
              ) &&
              environment.allowedCapabilityCount > 0 &&
              environment.bindingCount === environment.allowedCapabilityCount &&
              !environment.experimentalEnabled,
          ),
        );
      },
    );

    let readModelCheck: DiagnosticsCheckSnapshot;
    try {
      const metrics = this.readMetrics();
      readModelCheck = validatedCheck(
        {
          id: "operational-metrics",
          category: "read-model",
          title: "Operational metrics read model",
          validCode: "READ_MODEL_VALID",
          invalidCode: "READ_MODEL_VALIDATION_FAILED",
          validDetail: "The operational metrics read model passed shape and range validation.",
          invalidDetail: "The operational metrics read model contains an invalid shape or value.",
          evidence: ["validatedFields=6", `readinessRecorded=${metrics.readinessStatus === 1}`],
        },
        () => validateMetrics(metrics),
      );
    } catch {
      readModelCheck = Object.freeze({
        id: "operational-metrics",
        category: "read-model",
        outcome: "unknown",
        code: "READ_MODEL_UNAVAILABLE",
        title: "Operational metrics read model",
        detail: "The operational metrics read model is unavailable; validity is not assumed.",
        evidence: Object.freeze([]),
      });
    }

    return Object.freeze({
      generatedAt: this.clock().toISOString(),
      checks: Object.freeze([
        registryCheck,
        capabilityCheck,
        environmentCheck,
        configurationCheck,
        readModelCheck,
      ]),
    });
  }
}

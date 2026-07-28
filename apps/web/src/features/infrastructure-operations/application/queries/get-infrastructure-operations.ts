import type {
  InfrastructureOperationAvailability,
  InfrastructureOperationDomainId,
  InfrastructureOperationDomainModel,
  InfrastructureOperationsModel,
} from "../../domain/infrastructure-operations";
import type { InfrastructureOperationsRepository } from "../ports/infrastructure-operations-repository";

const DOMAIN_DEFINITIONS: readonly {
  readonly id: InfrastructureOperationDomainId;
  readonly label: string;
  readonly description: string;
  readonly matches: (id: string, category: string) => boolean;
}[] = [
  {
    id: "domain",
    label: "Domain Overview",
    description:
      "Domain portfolio and certificate capability coverage published by the registries.",
    matches: (_id, category) => ["domain", "ssl"].includes(category),
  },
  {
    id: "dns",
    label: "DNS Overview",
    description: "DNS record capability coverage; this is not a live DNS zone inventory.",
    matches: (_id, category) => category === "dns",
  },
  {
    id: "hosting",
    label: "Hosting Overview",
    description: "Hosting, website, and deployment capability coverage without runtime control.",
    matches: (_id, category) => ["hosting", "website", "deployment"].includes(category),
  },
  {
    id: "database",
    label: "Database Overview",
    description: "Database and database-backup capability coverage; no query is executed.",
    matches: (id, category) => category === "database" || id.startsWith("backup.database."),
  },
  {
    id: "authentication",
    label: "Authentication Overview",
    description: "Authentication capability coverage without session or identity operations.",
    matches: (_id, category) => category === "authentication",
  },
  {
    id: "storage",
    label: "Storage Overview",
    description:
      "Object, file, snapshot, and VPS-backup capability coverage without resource changes.",
    matches: (id, category) =>
      ["storage", "file-operation", "snapshot"].includes(category) || id.startsWith("backup.vps."),
  },
  {
    id: "environment",
    label: "Environment Overview",
    description: "Operational visibility capability coverage, not live environment state.",
    matches: (_id, category) => ["health", "metrics", "logs", "ci", "release"].includes(category),
  },
];

function availability(status: string): InfrastructureOperationAvailability {
  if (status === "supported") return "SUPPORTED";
  if (status === "partial") return "PARTIAL";
  if (status === "experimental") return "EXPERIMENTAL";
  return "NOT SUPPORTED";
}

export async function getInfrastructureOperations(
  repository: InfrastructureOperationsRepository,
): Promise<InfrastructureOperationsModel> {
  const snapshot = await repository.loadSnapshot();
  const providers = Array.from(new Set(snapshot.providers)).sort();

  const domains: InfrastructureOperationDomainModel[] = DOMAIN_DEFINITIONS.map((definition) => {
    const candidates = snapshot.capabilities.filter((candidate) =>
      definition.matches(candidate.id, candidate.category),
    );
    const capabilityIds = Array.from(new Set(candidates.map((candidate) => candidate.id))).sort();
    const capabilities = capabilityIds.map((id) => {
      const registrations = candidates.filter((candidate) => candidate.id === id);
      const category = registrations[0]?.category ?? "uncategorized";
      return Object.freeze({
        id,
        category,
        providers: Object.freeze(
          providers.map((providerId) => {
            const registration = registrations.find((item) => item.providerId === providerId);
            return Object.freeze({
              providerId,
              availability: registration ? availability(registration.status) : "NOT SUPPORTED",
              plane: registration?.plane ?? null,
              access: registration?.access ?? null,
            });
          }),
        ),
      });
    });
    const cells = capabilities.flatMap((capability) => capability.providers);
    const count = (state: InfrastructureOperationAvailability) =>
      cells.filter((cell) => cell.availability === state).length;
    return Object.freeze({
      id: definition.id,
      label: definition.label,
      description: definition.description,
      capabilities: Object.freeze(capabilities),
      counts: Object.freeze({
        SUPPORTED: count("SUPPORTED"),
        PARTIAL: count("PARTIAL"),
        "NOT SUPPORTED": count("NOT SUPPORTED"),
        EXPERIMENTAL: count("EXPERIMENTAL"),
      }),
    });
  });

  const allCells = domains.flatMap((domain) =>
    domain.capabilities.flatMap((capability) => capability.providers),
  );
  const countCells = (state: InfrastructureOperationAvailability) =>
    allCells.filter((cell) => cell.availability === state).length;

  return Object.freeze({
    generatedAt: snapshot.generatedAt,
    providers: Object.freeze(providers),
    summary: Object.freeze({
      domains: domains.length,
      providers: providers.length,
      publishedCapabilities: domains.reduce((sum, domain) => sum + domain.capabilities.length, 0),
      supportedCells: countCells("SUPPORTED"),
      partialCells: countCells("PARTIAL"),
      unsupportedCells: countCells("NOT SUPPORTED"),
      experimentalCells: countCells("EXPERIMENTAL"),
    }),
    domains: Object.freeze(domains),
  });
}

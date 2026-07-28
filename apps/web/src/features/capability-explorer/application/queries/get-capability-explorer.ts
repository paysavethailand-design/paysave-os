import type { CapabilityExplorerRepository } from "../ports/capability-explorer-repository";
import type {
  CapabilityAvailability,
  CapabilityExplorerItemModel,
  CapabilityExplorerModel,
} from "../../domain/capability-explorer";

function availability(status: string): CapabilityAvailability {
  if (status === "supported") return "SUPPORTED";
  if (status === "partial") return "PARTIAL";
  if (status === "experimental") return "EXPERIMENTAL";
  return "NOT SUPPORTED";
}

export async function getCapabilityExplorer(
  repository: CapabilityExplorerRepository,
): Promise<CapabilityExplorerModel> {
  const snapshot = await repository.loadSnapshot();
  const providers = Array.from(
    new Set(snapshot.candidates.map((candidate) => candidate.providerId)),
  ).sort();
  const capabilityIds = Array.from(
    new Set(snapshot.candidates.map((candidate) => candidate.id)),
  ).sort();

  const capabilities: CapabilityExplorerItemModel[] = capabilityIds.map((id) => {
    const candidates = snapshot.candidates.filter((candidate) => candidate.id === id);
    const category =
      Array.from(new Set(candidates.map((candidate) => candidate.category))).sort()[0] ??
      "uncategorized";
    const providerModels = providers.map((providerId) => {
      const candidate = candidates.find((item) => item.providerId === providerId);
      return Object.freeze({
        providerId,
        availability: candidate ? availability(candidate.status) : "NOT SUPPORTED",
        plane: candidate?.plane ?? null,
        access: candidate?.access ?? null,
      });
    });
    const count = (state: CapabilityAvailability) =>
      providerModels.filter((provider) => provider.availability === state).length;
    return Object.freeze({
      id,
      category,
      providers: Object.freeze(providerModels),
      counts: Object.freeze({
        SUPPORTED: count("SUPPORTED"),
        PARTIAL: count("PARTIAL"),
        "NOT SUPPORTED": count("NOT SUPPORTED"),
        EXPERIMENTAL: count("EXPERIMENTAL"),
      }),
    });
  });

  const categories = Array.from(new Set(capabilities.map((capability) => capability.category)))
    .sort()
    .map((name) =>
      Object.freeze({
        name,
        capabilities: capabilities.filter((capability) => capability.category === name).length,
      }),
    );
  const cells = capabilities.flatMap((capability) => capability.providers);
  const countCells = (state: CapabilityAvailability) =>
    cells.filter((cell) => cell.availability === state).length;

  return Object.freeze({
    generatedAt: snapshot.generatedAt,
    summary: Object.freeze({
      capabilities: capabilities.length,
      categories: categories.length,
      providers: providers.length,
      supportedCells: countCells("SUPPORTED"),
      partialCells: countCells("PARTIAL"),
      unsupportedCells: countCells("NOT SUPPORTED"),
      experimentalCells: countCells("EXPERIMENTAL"),
    }),
    categories: Object.freeze(categories),
    providers: Object.freeze(providers),
    capabilities: Object.freeze(capabilities),
  });
}

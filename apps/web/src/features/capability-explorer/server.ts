import "server-only";
import { getCapabilityExplorer } from "./application/queries/get-capability-explorer";
import { Stage52CapabilityExplorerRepository } from "./infrastructure/stage52-capability-explorer-repository";

export async function loadCapabilityExplorer() {
  return getCapabilityExplorer(new Stage52CapabilityExplorerRepository());
}

export async function loadCapabilityDetails(capabilityId: string) {
  const model = await loadCapabilityExplorer();
  return model.capabilities.find((capability) => capability.id === capabilityId) ?? null;
}

export async function capabilityExplorerStaticParams() {
  const model = await loadCapabilityExplorer();
  return model.capabilities.map((capability) => ({ capabilityId: capability.id }));
}

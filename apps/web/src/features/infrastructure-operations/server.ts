import "server-only";
import { getInfrastructureOperations } from "./application/queries/get-infrastructure-operations";
import { Stage52InfrastructureOperationsRepository } from "./infrastructure/stage52-infrastructure-operations-repository";

export async function loadInfrastructureOperations() {
  return getInfrastructureOperations(new Stage52InfrastructureOperationsRepository());
}

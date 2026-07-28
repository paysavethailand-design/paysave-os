import "server-only";
import { getProviderCenter } from "./application/queries/get-provider-center";
import { Stage52ProviderCenterRepository } from "./infrastructure/stage52-provider-center-repository";

export async function loadProviderCenter() {
  return getProviderCenter(new Stage52ProviderCenterRepository());
}

export async function loadProviderDetails(providerId: string) {
  const model = await loadProviderCenter();
  return model.providers.find((provider) => provider.id === providerId) ?? null;
}

export async function providerCenterStaticParams() {
  const model = await loadProviderCenter();
  return model.providers.map((provider) => ({ providerId: provider.id }));
}

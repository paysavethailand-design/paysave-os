import { BusinessPlatformView } from "@/features/business-platform";
import { loadBusinessPlatformOverview } from "@/features/business-platform/server";

export default async function BusinessPlatformPage() {
  const model = await loadBusinessPlatformOverview();
  return <BusinessPlatformView model={model} />;
}

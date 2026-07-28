import type {
  CapabilityDescriptor,
  InfrastructureRequest,
  InfrastructureResult,
  ProviderExecutionContext,
} from "../core/index";
import { ManifestInfrastructureProvider } from "./manifest-infrastructure-provider";

export class MockInfrastructureProvider extends ManifestInfrastructureProvider {
  readonly #counter: { value: number };

  public constructor(
    id: string,
    capabilities: readonly CapabilityDescriptor[],
    private readonly resultData: unknown = { ok: true },
  ) {
    const counter = { value: 0 };
    super(id, capabilities, {
      execute: async (
        providerId: string,
        request: InfrastructureRequest,
        _capability: CapabilityDescriptor,
        _context: ProviderExecutionContext,
      ): Promise<InfrastructureResult> => {
        counter.value += 1;
        return {
          providerId,
          capability: request.capability,
          correlationId: request.context.correlationId,
          data: resultData,
        };
      },
    });
    this.#counter = counter;
  }

  public get executionCount(): number {
    return this.#counter.value;
  }
}

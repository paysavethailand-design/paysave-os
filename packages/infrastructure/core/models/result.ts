export interface InfrastructureResult<TData = unknown> {
  readonly providerId: string;
  readonly capability: string;
  readonly correlationId: string;
  readonly data: TData;
}

export interface FakePostgrestResult<T = unknown> {
  readonly data: T | null;
  readonly error: { readonly message: string; readonly code?: string } | null;
  readonly count?: number | null;
}

export interface RecordedCall {
  readonly method: string;
  readonly args: readonly unknown[];
}

/**
 * Minimal double for the chainable `supabase-js` PostgREST query builder. Every method records
 * the call and returns `this`; awaiting/`.then()`-ing the builder resolves to the configured
 * result, matching how `@supabase/supabase-js` builders are themselves thenable.
 */
export class FakeQueryBuilder<T = unknown> implements PromiseLike<FakePostgrestResult<T>> {
  private readonly calls: RecordedCall[] = [];

  constructor(private readonly result: FakePostgrestResult<T>) {}

  select(...args: unknown[]): this {
    return this.record("select", args);
  }

  insert(...args: unknown[]): this {
    return this.record("insert", args);
  }

  update(...args: unknown[]): this {
    return this.record("update", args);
  }

  eq(...args: unknown[]): this {
    return this.record("eq", args);
  }

  neq(...args: unknown[]): this {
    return this.record("neq", args);
  }

  is(...args: unknown[]): this {
    return this.record("is", args);
  }

  gt(...args: unknown[]): this {
    return this.record("gt", args);
  }

  lt(...args: unknown[]): this {
    return this.record("lt", args);
  }

  or(...args: unknown[]): this {
    return this.record("or", args);
  }

  order(...args: unknown[]): this {
    return this.record("order", args);
  }

  limit(...args: unknown[]): this {
    return this.record("limit", args);
  }

  range(...args: unknown[]): this {
    return this.record("range", args);
  }

  single(): this {
    return this.record("single", []);
  }

  maybeSingle(): this {
    return this.record("maybeSingle", []);
  }

  recordedCalls(): readonly RecordedCall[] {
    return this.calls;
  }

  private record(method: string, args: unknown[]): this {
    this.calls.push({ method, args });
    return this;
  }

  then<TResult1 = FakePostgrestResult<T>, TResult2 = never>(
    onfulfilled?: ((value: FakePostgrestResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

/**
 * Minimal double for the request-scoped Supabase client used by repositories. Configure one
 * response per expected `.schema(...).from(...)` call, in call order; each returned builder
 * records the chained filter/mutation calls for assertions.
 */
export class FakeSupabaseClient {
  private readonly builders: FakeQueryBuilder[] = [];
  private cursor = 0;

  constructor(private readonly responses: ReadonlyArray<FakePostgrestResult<unknown>>) {}

  schema(_schemaName: string): { from(tableName: string): FakeQueryBuilder } {
    return { from: (_tableName: string) => this.nextBuilder() };
  }

  recordedBuilders(): readonly FakeQueryBuilder[] {
    return this.builders;
  }

  private nextBuilder(): FakeQueryBuilder {
    const response = this.responses[this.cursor] ?? { data: null, error: null };
    this.cursor += 1;
    const builder = new FakeQueryBuilder(response);
    this.builders.push(builder);
    return builder;
  }
}

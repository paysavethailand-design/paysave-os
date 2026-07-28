import { ApiError } from "./api-error";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export interface BoundedPageRequest {
  readonly limit: number;
  readonly cursor: string | null;
}

/**
 * Parses `limit`/`cursor` query params into a bounded keyset-pagination request. Fails closed
 * (422) on an out-of-range limit instead of silently clamping it, so callers notice a broken
 * integration instead of getting a surprising page size.
 */
export function parseBoundedPageRequest(searchParams: URLSearchParams): BoundedPageRequest {
  const rawLimit = searchParams.get("limit");
  let limit = DEFAULT_LIMIT;

  if (rawLimit !== null) {
    const parsed = Number(rawLimit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
      throw new ApiError(
        "validation_failed",
        `limit must be an integer between 1 and ${MAX_LIMIT}`,
        [{ path: "limit", message: `must be an integer between 1 and ${MAX_LIMIT}` }],
      );
    }
    limit = parsed;
  }

  const rawCursor = searchParams.get("cursor");
  return { limit, cursor: rawCursor && rawCursor.length > 0 ? rawCursor : null };
}

export interface BoundedPage<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

/**
 * Builds a keyset page result. Callers must fetch `limit + 1` rows ordered ascending by `id`
 * (matching the approved M001-M016 `(partner_id, ..., id)` indexes) so the extra row reveals
 * whether another page exists without a separate COUNT query.
 */
export function toBoundedPage<T extends { readonly id: string }>(
  rows: readonly T[],
  limit: number,
): BoundedPage<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = items[items.length - 1];

  return { items, nextCursor: hasMore && lastItem ? lastItem.id : null };
}

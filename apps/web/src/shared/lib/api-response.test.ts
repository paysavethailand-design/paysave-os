import { afterEach, describe, expect, it } from "vitest";
import {
  resetRequestTraceSink,
  setRequestTraceSink,
  type RequestTraceEvent,
} from "@paysave/observability";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError } from "./api-error";
import {
  apiErrorFromUnknown,
  readJsonBody,
  readOptionalJsonBody,
  resolveCorrelationId,
  withApiParamsRoute,
  withApiRoute,
} from "./api-response";

class RecordingRequestTraceSink {
  readonly events: RequestTraceEvent[] = [];
  record(event: RequestTraceEvent): void {
    this.events.push(event);
  }
}

afterEach(() => resetRequestTraceSink());

describe("resolveCorrelationId", () => {
  it("reuses an inbound correlation header", () => {
    const request = new NextRequest("https://api.paysave.internal/api/v1/users", {
      headers: { "x-correlation-id": "abc-123" },
    });
    expect(resolveCorrelationId(request)).toBe("abc-123");
  });

  it("generates a correlation ID when the header is absent", () => {
    const request = new NextRequest("https://api.paysave.internal/api/v1/users");
    expect(resolveCorrelationId(request)).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("apiErrorFromUnknown", () => {
  it("passes an ApiError through unchanged", () => {
    const original = new ApiError("forbidden", "nope");
    expect(apiErrorFromUnknown(original)).toBe(original);
  });

  it("maps a ZodError to a validation_failed ApiError with field details", () => {
    const result = z.object({ name: z.string() }).safeParse({});
    const mapped = apiErrorFromUnknown(result.success ? undefined : result.error);
    expect(mapped.code).toBe("validation_failed");
    expect(mapped.status).toBe(422);
    expect(mapped.details?.[0]?.path).toBe("name");
  });

  it("maps an unknown thrown value to an opaque internal_error", () => {
    const mapped = apiErrorFromUnknown(new Error("db connection string leaked"));
    expect(mapped.code).toBe("internal_error");
    expect(mapped.status).toBe(500);
    expect(mapped.message).not.toContain("db connection string");
  });
});

describe("withApiRoute", () => {
  it("returns the handler's response untouched on success", async () => {
    const handler = withApiRoute(async (_request, correlationId) => {
      return NextResponse.json({ data: { ok: true }, meta: { correlationId } });
    });

    const response = await handler(new NextRequest("https://api.paysave.internal/api/v1/users"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { ok: boolean } };
    expect(body.data.ok).toBe(true);
  });

  it("emits a request trace for successful API calls", async () => {
    const sink = new RecordingRequestTraceSink();
    setRequestTraceSink(sink);
    const handler = withApiRoute(async (_request, correlationId) =>
      NextResponse.json({ data: { ok: true }, meta: { correlationId } }),
    );

    await handler(
      new NextRequest("https://api.paysave.internal/api/v1/users?secret=must-not-be-logged", {
        headers: { "x-correlation-id": "trace-1" },
      }),
    );

    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]).toMatchObject({
      correlationId: "trace-1",
      method: "GET",
      path: "/api/v1/users",
      status: 200,
    });
    expect(sink.events[0]?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("maps a thrown ApiError to the standardized error envelope", async () => {
    const handler = withApiRoute(async () => {
      throw new ApiError("not_found", "User not found");
    });

    const response = await handler(new NextRequest("https://api.paysave.internal/api/v1/users/1"));
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(body.error).toEqual({ code: "not_found", message: "User not found" });
  });
});

describe("readJsonBody", () => {
  it("parses a valid JSON body", async () => {
    const request = new NextRequest("https://api.paysave.internal/api/v1/users", {
      method: "POST",
      body: JSON.stringify({ name: "Somchai" }),
      headers: { "content-type": "application/json" },
    });
    await expect(readJsonBody(request)).resolves.toEqual({ name: "Somchai" });
  });

  it("maps malformed JSON to a 422 ApiError instead of crashing", async () => {
    const request = new NextRequest("https://api.paysave.internal/api/v1/users", {
      method: "POST",
      body: "{not-json",
      headers: { "content-type": "application/json" },
    });
    await expect(readJsonBody(request)).rejects.toMatchObject({
      code: "validation_failed",
      status: 422,
    });
  });
});

describe("readOptionalJsonBody", () => {
  it("treats an empty body as an empty object", async () => {
    const request = new NextRequest("https://api.paysave.internal/api/v1/users/1", {
      method: "DELETE",
    });
    await expect(readOptionalJsonBody(request)).resolves.toEqual({});
  });

  it("parses a provided JSON body", async () => {
    const request = new NextRequest("https://api.paysave.internal/api/v1/users/1", {
      method: "DELETE",
      body: JSON.stringify({ reason: "offboarding" }),
    });
    await expect(readOptionalJsonBody(request)).resolves.toEqual({ reason: "offboarding" });
  });

  it("maps malformed JSON to a 422 ApiError", async () => {
    const request = new NextRequest("https://api.paysave.internal/api/v1/users/1", {
      method: "DELETE",
      body: "{not-json",
    });
    await expect(readOptionalJsonBody(request)).rejects.toMatchObject({
      code: "validation_failed",
    });
  });
});

describe("withApiParamsRoute", () => {
  it("resolves the params promise before invoking the handler", async () => {
    const handler = withApiParamsRoute<{ userId: string }>(
      async (_request, params, correlationId) => {
        return NextResponse.json({ data: { userId: params.userId }, meta: { correlationId } });
      },
    );

    const response = await handler(
      new NextRequest("https://api.paysave.internal/api/v1/users/42"),
      {
        params: Promise.resolve({ userId: "42" }),
      },
    );

    const body = (await response.json()) as { data: { userId: string } };
    expect(body.data.userId).toBe("42");
  });
});

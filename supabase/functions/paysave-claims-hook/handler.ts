import { ClaimResolutionError, resolvePaysaveClaims, type ClaimSource } from "./resolver.ts";

export interface HookEvent {
  readonly user_id: string;
  readonly claims: Readonly<Record<string, unknown>> & { readonly sub?: unknown };
  readonly authentication_method: string;
}

export interface HookAuditEvent {
  readonly correlationId: string;
  readonly event: "authentication.token_issue" | "authentication.claim_refresh";
  readonly outcome: "success" | "failure";
  readonly userId: string | null;
  readonly activePartnerId?: string | null;
  readonly reason?: string;
}

export interface HookDependencies {
  readonly verify: (
    payload: string,
    headers: Readonly<Record<string, string>>,
  ) => Promise<HookEvent>;
  readonly source: ClaimSource;
  readonly audit: (event: HookAuditEvent) => void | Promise<void>;
}

function json(status: number, body: unknown, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}

function correlationId(request: Request): string {
  return request.headers.get("webhook-id") ?? crypto.randomUUID();
}

function auditEventName(method: string): HookAuditEvent["event"] {
  return method === "token_refresh" ? "authentication.claim_refresh" : "authentication.token_issue";
}

export async function handleClaimsHook(
  request: Request,
  dependencies: HookDependencies,
): Promise<Response> {
  if (request.method !== "POST") {
    return json(405, { error: "method_not_allowed" }, { allow: "POST" });
  }

  const id = correlationId(request);
  const payload = await request.text();
  if (new TextEncoder().encode(payload).byteLength > 100_000) {
    return json(413, { error: "payload_too_large" });
  }

  let event: HookEvent;
  try {
    event = await dependencies.verify(payload, Object.fromEntries(request.headers.entries()));
  } catch {
    await dependencies.audit({
      correlationId: id,
      event: "authentication.token_issue",
      outcome: "failure",
      userId: null,
      reason: "signature_invalid",
    });
    return json(401, { error: "invalid_hook_signature" });
  }

  const eventName = auditEventName(event.authentication_method);
  if (event.claims.sub !== event.user_id) {
    await dependencies.audit({
      correlationId: id,
      event: eventName,
      outcome: "failure",
      userId: event.user_id,
      reason: "subject_mismatch",
    });
    return json(403, { error: "claim_resolution_denied" });
  }

  try {
    const paysave = await resolvePaysaveClaims(event.user_id, dependencies.source);
    await dependencies.audit({
      correlationId: id,
      event: eventName,
      outcome: "success",
      userId: event.user_id,
      activePartnerId: paysave.active_partner_id,
    });
    return json(200, { claims: { ...event.claims, paysave } });
  } catch (error) {
    const isClaimDenial = error instanceof ClaimResolutionError;
    const failureClass =
      !isClaimDenial &&
      typeof error === "object" &&
      error !== null &&
      "failureClass" in error &&
      typeof error.failureClass === "string"
        ? error.failureClass
        : "upstream_error";
    const reason = isClaimDenial ? error.code : failureClass;
    await dependencies.audit({
      correlationId: id,
      event: eventName,
      outcome: "failure",
      userId: event.user_id,
      reason,
    });
    return json(
      isClaimDenial ? 403 : 503,
      {
        error: isClaimDenial ? "claim_resolution_denied" : "claim_resolver_unavailable",
      },
      {
        "x-correlation-id": id,
        ...(!isClaimDenial ? { "x-paysave-failure-class": failureClass } : {}),
      },
    );
  }
}

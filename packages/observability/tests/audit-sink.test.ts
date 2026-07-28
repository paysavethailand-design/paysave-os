import { describe, expect, it, vi } from "vitest";
import { ConsoleAuditSink, RecordingAuditSink } from "../src/audit-sink";

describe("RecordingAuditSink", () => {
  it("stamps a default occurredAt when the caller omits one", async () => {
    const sink = new RecordingAuditSink();
    await sink.record({
      correlationId: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa2222",
      actorType: "user",
      actorUserId: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa1111",
      partnerId: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa3333",
      action: "user.create",
      resourceType: "iam.users",
      resourceId: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
      outcome: "success",
    });

    const [event] = sink.all();
    expect(event).toBeDefined();
    expect(typeof event?.occurredAt).toBe("string");
  });

  it("redacts metadata keys that look like sensitive fields", async () => {
    const sink = new RecordingAuditSink();
    await sink.record({
      correlationId: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa2222",
      actorType: "user",
      actorUserId: null,
      partnerId: null,
      action: "user.create",
      resourceType: "iam.users",
      resourceId: null,
      outcome: "denied",
      metadata: { displayNameEncrypted: "cafebabe", attempt: 1 },
    });

    const [event] = sink.all();
    expect(event?.metadata).toEqual({ displayNameEncrypted: "[REDACTED]", attempt: 1 });
  });
});

describe("ConsoleAuditSink", () => {
  it("emits a single structured JSON line", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const sink = new ConsoleAuditSink();

    await sink.record({
      correlationId: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa2222",
      actorType: "system",
      actorUserId: null,
      partnerId: null,
      action: "permission.create",
      resourceType: "iam.permissions",
      resourceId: null,
      outcome: "success",
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const [line] = spy.mock.calls[0] as [string];
    const parsed = JSON.parse(line) as { type: string; action: string };
    expect(parsed.type).toBe("audit_event");
    expect(parsed.action).toBe("permission.create");

    spy.mockRestore();
  });
});

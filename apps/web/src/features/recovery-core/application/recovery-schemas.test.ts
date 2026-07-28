import { describe, expect, it } from "vitest";
import {
  createContactAttemptSchema,
  createPromiseToPaySchema,
  timelineFilterSchema,
} from "./recovery-schemas";
describe("Recovery Core validation", () => {
  it.each(["phone", "sms", "line", "visit", "email", "other"])(
    "accepts contact channel %s",
    (channelCode) => {
      expect(
        createContactAttemptSchema.parse({
          customerContactId: "2b3c4d5e-6f78-4901-90ab-cdef01234568",
          channelCode,
          outcomeCode: "connected",
          occurredAt: "2026-07-22T00:00:00.000Z",
          actorMembershipId: "3b3c4d5e-6f78-4901-90ab-cdef01234569",
        }).channelCode,
      ).toBe(channelCode);
    },
  );
  it("rejects unsupported contact channels", () => {
    expect(() =>
      createContactAttemptSchema.parse({
        customerContactId: crypto.randomUUID(),
        channelCode: "fax",
        outcomeCode: "sent",
        occurredAt: new Date().toISOString(),
        actorMembershipId: crypto.randomUUID(),
      }),
    ).toThrow();
  });
  it("requires positive PTP amount and uppercase ISO currency", () => {
    expect(() =>
      createPromiseToPaySchema.parse({
        caseId: crypto.randomUUID(),
        customerId: crypto.randomUUID(),
        promisedAmount: -1,
        currencyCode: "thb",
        dueAt: new Date().toISOString(),
      }),
    ).toThrow();
  });
  it("bounds timeline pagination and filters", () => {
    expect(
      timelineFilterSchema.parse({
        limit: "25",
        eventType: "contact",
        sourceType: "workforce.contact_attempts",
      }),
    ).toMatchObject({ limit: 25, eventType: "contact" });
    expect(() => timelineFilterSchema.parse({ limit: "101" })).toThrow();
  });
});

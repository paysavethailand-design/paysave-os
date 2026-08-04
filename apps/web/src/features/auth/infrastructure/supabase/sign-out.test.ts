import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, signOut } = vi.hoisted(() => ({
  createClient: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("./server-client", () => ({ createClient }));

const { signOutCurrentSession } = await import("./sign-out");

describe("signOutCurrentSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue({ auth: { signOut } });
    signOut.mockResolvedValue({ error: null });
  });

  it("revokes the current Supabase session using required cookie writes", async () => {
    await signOutCurrentSession();

    expect(createClient).toHaveBeenCalledWith({
      correlationId: expect.any(String),
      cookieWriteMode: "required",
    });
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the current session cannot be cleared", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    signOut.mockResolvedValue({ error: new Error("sensitive sign-out failure") });

    await expect(signOutCurrentSession()).rejects.toThrow("AUTH_SIGN_OUT_FAILED");

    expect(consoleError).toHaveBeenCalledWith(
      "AUTH_SIGN_OUT_FAILED",
      expect.objectContaining({
        category: "session_clear_failed",
        correlationId: expect.any(String),
      }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("sensitive sign-out failure");
    consoleError.mockRestore();
  });
});

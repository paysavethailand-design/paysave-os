import { describe, expect, it, vi } from "vitest";

const signOut = vi.fn().mockResolvedValue({ error: null });

vi.mock("./server-client", () => ({
  createClient: async () => ({ auth: { signOut } }),
}));

const { signOutCurrentSession } = await import("./sign-out");

describe("signOutCurrentSession", () => {
  it("revokes the current Supabase session", async () => {
    await signOutCurrentSession();
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientMock,
  getClaimsMock,
  parsePaysaveClaimsMock,
  redirectMock,
  refreshSessionMock,
  signOutMock,
  signInWithPasswordMock,
} = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getClaimsMock: vi.fn(),
  parsePaysaveClaimsMock: vi.fn(),
  redirectMock: vi.fn((path: string): never => {
    throw new Error(`REDIRECT:${path}`);
  }),
  refreshSessionMock: vi.fn(),
  signOutMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@paysave/security", async (importOriginal) => {
  const original = await importOriginal<typeof import("@paysave/security")>();
  return { ...original, parsePaysaveClaims: parsePaysaveClaimsMock };
});
vi.mock("../infrastructure/supabase/server-client", () => ({
  createClient: createClientMock,
}));

import { signInAction, signOutAction } from "./sign-in-actions";

const adminContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "42",
  roles: ["admin"],
  permissions: [],
  tenantScope: "active",
  sessionVersion: 1,
} as const;

function validFormData() {
  const formData = new FormData();
  formData.set("email", "paysave.pilot.admin@example.com");
  formData.set("password", "valid-password-placeholder");
  formData.set("next", "/");
  return formData;
}

describe("signInAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: {
        getClaims: getClaimsMock,
        refreshSession: refreshSessionMock,
        signOut: signOutMock,
        signInWithPassword: signInWithPasswordMock,
      },
    });
    signInWithPasswordMock.mockResolvedValue({ data: { session: {} }, error: null });
    getClaimsMock.mockResolvedValue({ data: { claims: { paysave: {} } }, error: null });
    parsePaysaveClaimsMock.mockReturnValue(adminContext);
  });

  it("redirects a successful admin sign-in directly to the admin dashboard", async () => {
    await expect(signInAction({ error: null }, validFormData())).rejects.toThrow(
      "REDIRECT:/dashboard/admin",
    );

    expect(signInWithPasswordMock).toHaveBeenCalledOnce();
    expect(createClientMock).toHaveBeenCalledWith({
      correlationId: expect.any(String),
      cookieWriteMode: "required",
    });
    expect(getClaimsMock).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledWith("/dashboard/admin");
    expect(redirectMock).not.toHaveBeenCalledWith("/");
  });

  it("refreshes the session once when claims are not immediately available", async () => {
    getClaimsMock
      .mockResolvedValueOnce({ data: { claims: null }, error: new Error("claims_unavailable") })
      .mockResolvedValueOnce({ data: { claims: { paysave: {} } }, error: null });
    refreshSessionMock.mockResolvedValue({ data: { session: {} }, error: null });

    await expect(signInAction({ error: null }, validFormData())).rejects.toThrow(
      "REDIRECT:/dashboard/admin",
    );

    expect(refreshSessionMock).toHaveBeenCalledOnce();
    expect(getClaimsMock).toHaveBeenCalledTimes(2);
    expect(redirectMock).toHaveBeenCalledWith("/dashboard/admin");
  });

  it("keeps a failed credential attempt on sign-in with a visible error", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { session: null },
      error: new Error("invalid_credentials"),
    });

    await expect(signInAction({ error: null }, validFormData())).resolves.toEqual({
      error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    });
    expect(redirectMock).not.toHaveBeenCalled();
    expect(getClaimsMock).not.toHaveBeenCalled();
  });

  it("records a safe category and correlation id for an unexpected exception", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    signInWithPasswordMock.mockRejectedValue(new Error("sensitive provider detail"));

    await expect(signInAction({ error: null }, validFormData())).resolves.toEqual({
      error: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองอีกครั้ง",
    });

    expect(consoleError).toHaveBeenCalledWith(
      "AUTH_SIGN_IN_FAILED",
      expect.objectContaining({
        category: "unexpected_error",
        correlationId: expect.any(String),
      }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("sensitive provider detail");
    consoleError.mockRestore();
  });

  it("revokes the session and returns to canonical sign-in", async () => {
    signOutMock.mockResolvedValue({ error: null });

    await expect(signOutAction()).rejects.toThrow("REDIRECT:/sign-in");
    expect(createClientMock).toHaveBeenCalledWith({ cookieWriteMode: "required" });
    expect(signOutMock).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledWith("/sign-in");
  });

  it("does not report logout success when Supabase fails to clear the session", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    signOutMock.mockResolvedValue({ error: new Error("sensitive sign-out failure") });

    await expect(signOutAction()).rejects.toThrow("AUTH_SIGN_OUT_FAILED");

    expect(redirectMock).not.toHaveBeenCalled();
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

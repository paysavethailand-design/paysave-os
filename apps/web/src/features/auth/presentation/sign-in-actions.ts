"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { parsePaysaveClaims } from "@paysave/security";
import { getAuthenticatedLandingRoute } from "../application/session-navigation";
import { createClient } from "../infrastructure/supabase/server-client";
import { signInSchema } from "./sign-in-schema";

export interface SignInActionState {
  readonly error: string | null;
}

const claimsErrorMessage = "เข้าสู่ระบบสำเร็จ แต่ไม่สามารถโหลดสิทธิ์การใช้งานได้";

/** Authenticates credentials through Supabase and redirects to the verified role dashboard. */
export async function signInAction(
  _previousState: SignInActionState,
  formData: FormData,
): Promise<SignInActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "กรุณาตรวจสอบอีเมลและรหัสผ่าน" };
  }

  const correlationId = globalThis.crypto.randomUUID();
  let landingRoute: string;

  try {
    const supabase = await createClient({ correlationId, cookieWriteMode: "required" });
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    }

    let claimsResult = await supabase.auth.getClaims();
    if (claimsResult.error || !claimsResult.data?.claims) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        return { error: claimsErrorMessage };
      }
      claimsResult = await supabase.auth.getClaims();
    }

    if (claimsResult.error || !claimsResult.data?.claims) {
      return { error: claimsErrorMessage };
    }

    const context = parsePaysaveClaims(claimsResult.data.claims);
    landingRoute = getAuthenticatedLandingRoute(context.roles);
  } catch {
    console.error("AUTH_SIGN_IN_FAILED", {
      category: "unexpected_error",
      correlationId,
    });
    return { error: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองอีกครั้ง" };
  }

  redirect(landingRoute as Route);
}

/** Revokes the Supabase session and returns the user to sign in. */
export async function signOutAction(): Promise<void> {
  const correlationId = globalThis.crypto.randomUUID();

  try {
    const supabase = await createClient({ cookieWriteMode: "required" });
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch {
    console.error("AUTH_SIGN_OUT_FAILED", {
      category: "session_clear_failed",
      correlationId,
    });
    throw new Error("AUTH_SIGN_OUT_FAILED");
  }

  redirect("/sign-in");
}

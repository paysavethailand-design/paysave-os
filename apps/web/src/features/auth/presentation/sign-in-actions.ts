"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { createClient } from "../infrastructure/supabase/server-client";
import { getSafeRedirectPath, signInSchema } from "./sign-in-schema";

export interface SignInActionState {
  readonly error: string | null;
}

/** Authenticates credentials through Supabase and redirects to a validated local path. */
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  redirect(getSafeRedirectPath(formData.get("next")?.toString()) as Route);
}

/** Revokes the Supabase session and returns the user to sign in. */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Input } from "@paysave/ui";
import { signInAction, type SignInActionState } from "./sign-in-actions";

interface SignInFormProps {
  readonly nextPath: string;
}

const initialState: SignInActionState = { error: null };

/** Renders a pending-aware submit button for the authentication form. */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" disabled={pending} size="lg" type="submit">
      {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
    </Button>
  );
}

/** Renders the PAYSAVE credential sign-in form with server-side validation feedback. */
export function SignInForm({ nextPath }: SignInFormProps) {
  const [state, formAction] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input name="next" type="hidden" value={nextPath} />
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground" htmlFor="email">
          อีเมล
        </label>
        <Input autoComplete="email" id="email" name="email" required type="email" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground" htmlFor="password">
          รหัสผ่าน
        </label>
        <Input
          autoComplete="current-password"
          id="password"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </div>
      {state.error ? (
        <p
          aria-live="polite"
          className="rounded-xl bg-danger/8 p-3 text-sm font-medium text-danger"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

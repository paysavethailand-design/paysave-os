import { redirect } from "next/navigation";

/** Keeps /sign-in as the single canonical authentication route. */
export default function LoginPage() {
  redirect("/sign-in");
}

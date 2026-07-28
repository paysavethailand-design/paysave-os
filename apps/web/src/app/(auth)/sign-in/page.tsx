import { getSafeRedirectPath, SignInForm } from "@/features/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@paysave/ui";

interface SignInPageProps {
  readonly searchParams: Promise<{ next?: string }>;
}

/** Renders the secure PAYSAVE OS sign-in screen. */
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const parameters = await searchParams;
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div
        aria-hidden="true"
        className="absolute top-[12%] left-[8%] size-40 rounded-full bg-primary/10 blur-3xl sm:size-72"
      />
      <div
        aria-hidden="true"
        className="absolute right-[6%] bottom-[8%] size-40 rounded-full bg-success/10 blur-3xl sm:size-72"
      />
      <Card className="relative w-full max-w-md" variant="glass">
        <CardHeader className="pb-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-primary text-lg font-bold text-white shadow-button">
              P
            </span>
            <div>
              <p className="text-sm font-semibold tracking-wide text-primary">PAYSAVE</p>
              <p className="text-xs text-muted-foreground">Recovery Operating System</p>
            </div>
          </div>
          <CardTitle className="text-3xl">เข้าสู่ระบบ</CardTitle>
          <CardDescription>ใช้บัญชีที่ได้รับอนุญาตจากผู้ดูแลระบบ</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm nextPath={getSafeRedirectPath(parameters.next)} />
          <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
            ระบบรักษาความปลอดภัยด้วย Supabase Session และ JWT Permission
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

import { requireAuth } from "@/features/auth/server";

/** Renders a safe access-denied page for authenticated users. */
export default async function UnauthorizedPage() {
  await requireAuth("/unauthorized");
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-red-700">403 · Forbidden</p>
        <h1 className="mt-2 text-2xl font-bold">ไม่มีสิทธิ์เข้าถึง</h1>
        <p className="mt-3 text-slate-500">ติดต่อผู้ดูแลระบบหากคุณต้องใช้เมนูนี้</p>
      </section>
    </main>
  );
}

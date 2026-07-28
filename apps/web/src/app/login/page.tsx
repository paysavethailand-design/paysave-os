import { MockLoginForm } from "@/features/frontend-dashboard";
import { Badge, Card, CardContent, CardDescription, CardHeader } from "@paysave/ui";
import { BarChart3, CheckCircle2, Layers3, ShieldCheck, type LucideIcon } from "lucide-react";

export const metadata = { title: "Mock Login | PAYSAVE OS" };

const capabilities: readonly { icon: LucideIcon; label: string }[] = [
  { icon: BarChart3, label: "4 role dashboards" },
  { icon: Layers3, label: "Feature-first UI" },
  { icon: ShieldCheck, label: "No live connection" },
  { icon: CheckCircle2, label: "Accessible & responsive" },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_.9fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="absolute -top-32 -right-32 size-[34rem] rounded-full bg-primary/25 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-primary text-lg font-bold shadow-button">
            P
          </span>
          <div>
            <p className="font-semibold tracking-[.16em]">PAYSAVE</p>
            <p className="text-xs text-slate-400">Business Console</p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <Badge className="border-white/10 bg-white/8 text-slate-200" variant="neutral">
            FRONTEND SPRINT #1
          </Badge>
          <h1 className="mt-6 text-5xl leading-[1.12] font-semibold tracking-tight">
            ตัดสินใจเร็วขึ้น
            <br />
            <span className="text-sky-300">จากภาพรวมที่ชัดเจน</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            Executive-grade dashboards สำหรับผู้บริหาร Partner Admin และทีมภาคสนาม — ทำงานด้วย Mock
            Data 100%
          </p>
          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {capabilities.map(({ icon: Icon, label }) => (
              <div
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                key={label}
              >
                <Icon className="size-5 text-sky-300" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-slate-400">
          Mock environment · No Supabase · No Database
        </p>
      </section>
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <Card className="w-full max-w-md" variant="glass">
          <CardHeader>
            <div className="mb-3 flex items-center gap-3 lg:hidden">
              <span className="grid size-10 place-items-center rounded-xl bg-primary font-bold text-white">
                P
              </span>
              <b>PAYSAVE</b>
            </div>
            <Badge className="w-fit" variant="neutral">
              MOCK WORKSPACE
            </Badge>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">ยินดีต้อนรับ</h2>
            <CardDescription>เข้าสู่ระบบจำลองเพื่อดู Dashboard ทั้ง 4 บทบาท</CardDescription>
          </CardHeader>
          <CardContent>
            <MockLoginForm />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

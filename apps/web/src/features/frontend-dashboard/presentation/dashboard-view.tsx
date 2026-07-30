import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  KpiCard,
  Modal,
} from "@paysave/ui";
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  CircleDollarSign,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import type { DashboardModel } from "../domain/dashboard";
import { ActivityTable } from "./activity-table";
import { LazyDashboardCharts } from "./lazy-dashboard-charts";
import { DashboardShell } from "./dashboard-shell";
const icons = [CircleDollarSign, Gauge, Activity, ShieldCheck] as const;
export function DashboardView({ model }: { readonly model: DashboardModel }) {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="neutral">{model.eyebrow}</Badge>
            <h1 className="mt-3 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl lg:text-[2.15rem]">
              {model.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {model.description}
            </p>
          </div>
          <Modal
            title="Live Data Source"
            description="ข้อมูลจาก Supabase จริง"
            trigger={
              <Button variant="secondary">
                ดู Data Source <ArrowRight className="size-4" />
              </Button>
            }
          >
            <div className="rounded-xl bg-muted p-4 text-sm leading-6">
              <b>Source:</b> SupabaseDashboardRepository<br />
              <b>Supabase:</b> Connected (recovery.cases, asset.assets, etc.)<br />
              <b>Auth:</b> Real Supabase Auth
            </div>
          </Modal>
        </section>
        <section
          aria-label="Key performance indicators"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {model.kpis.map((item, index) => {
            const Icon = icons[index] ?? Activity;
            return (
              <KpiCard
                helper={item.helper}
                icon={<Icon className="size-5" />}
                key={item.label}
                label={item.label}
                trend={item.trend}
                trendDirection={item.direction}
                value={item.value}
              />
            );
          })}
        </section>
        <LazyDashboardCharts distribution={model.distribution} trend={model.trend} />
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>รายการล่าสุด</CardTitle>
              <CardDescription>ตารางจากข้อมูลจริง Supabase</CardDescription>
            </div>
            <Badge variant="default">{model.activity.length} รายการ</Badge>
          </CardHeader>
          <CardContent>
            <ActivityTable rows={model.activity} />
          </CardContent>
        </Card>
        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-success/10 text-success">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <b className="block">Accessibility ready</b>
                <small className="text-muted-foreground">Keyboard, labels และ contrast</small>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <BriefcaseBusiness className="size-5" />
              </span>
              <div>
                <b className="block">Feature-first</b>
                <small className="text-muted-foreground">Domain, port, mock adapter, UI</small>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-warning/10 text-warning">
                <Activity className="size-5" />
              </span>
              <div>
                <b className="block">Live data disabled</b>
                <small className="text-muted-foreground">Safe frontend prototype</small>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardShell>
  );
}

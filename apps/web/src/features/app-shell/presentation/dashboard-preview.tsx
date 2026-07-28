import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@paysave/ui";
import { ArrowUpRight, BriefcaseBusiness, CheckCircle2, Clock3, UsersRound } from "lucide-react";

const summaryCards = [
  {
    label: "เคสทั้งหมด",
    value: "12,480",
    detail: "+8.4% จากเดือนก่อน",
    icon: BriefcaseBusiness,
    tone: "primary",
  },
  {
    label: "กำลังดำเนินการ",
    value: "3,126",
    detail: "25.0% ของเคสทั้งหมด",
    icon: Clock3,
    tone: "warning",
  },
  {
    label: "ปิดเคสสำเร็จ",
    value: "8,742",
    detail: "อัตราสำเร็จ 70.0%",
    icon: CheckCircle2,
    tone: "success",
  },
  {
    label: "เจ้าหน้าที่ออนไลน์",
    value: "286",
    detail: "จากทั้งหมด 320 คน",
    icon: UsersRound,
    tone: "primary",
  },
] as const;

const recentCases = [
  {
    id: "PS-2026-10482",
    partner: "Partner Alpha",
    agent: "กิตติพงษ์",
    status: "กำลังติดตาม",
    updated: "5 นาทีที่แล้ว",
  },
  {
    id: "PS-2026-10481",
    partner: "Partner Green",
    agent: "สุภาวดี",
    status: "ตรวจสอบแล้ว",
    updated: "12 นาทีที่แล้ว",
  },
  {
    id: "PS-2026-10480",
    partner: "Partner Blue",
    agent: "ธนกร",
    status: "รอมอบหมาย",
    updated: "18 นาทีที่แล้ว",
  },
  {
    id: "PS-2026-10479",
    partner: "Partner Alpha",
    agent: "อัญชลี",
    status: "ปิดเคส",
    updated: "24 นาทีที่แล้ว",
  },
] as const;

/** Renders a static, database-free dashboard used to validate the application layout. */
export function DashboardPreview() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">วันจันทร์ · ภาพรวมการดำเนินงาน</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            สวัสดี, ทีม PAYSAVE
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            ข้อมูลหน้านี้เป็น Mock Data สำหรับตรวจ Layout และยังไม่เชื่อมฐานข้อมูล
          </p>
        </div>
        <Badge className="w-fit" variant="neutral">
          อัปเดตตัวอย่างล่าสุด
        </Badge>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card className="overflow-hidden" key={item.label}>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
                <CardDescription>{item.label}</CardDescription>
                <span
                  className={
                    item.tone === "success"
                      ? "grid size-10 place-items-center rounded-xl bg-success/10 text-success"
                      : item.tone === "warning"
                        ? "grid size-10 place-items-center rounded-xl bg-warning/10 text-warning"
                        : "grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"
                  }
                >
                  <Icon className="size-5" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tracking-tight">{item.value}</p>
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowUpRight className="size-3.5" />
                  {item.detail}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>เคสล่าสุด</CardTitle>
            <CardDescription>ตารางตัวอย่างสำหรับตรวจ Responsive Layout</CardDescription>
          </div>
          <Badge variant="default">4 รายการ</Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เลขที่เคส</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>เจ้าหน้าที่</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">อัปเดต</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentCases.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold text-primary">{item.id}</TableCell>
                  <TableCell>{item.partner}</TableCell>
                  <TableCell>{item.agent}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.status === "ปิดเคส" || item.status === "ตรวจสอบแล้ว"
                          ? "success"
                          : item.status === "รอมอบหมาย"
                            ? "warning"
                            : "default"
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{item.updated}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  KpiCard,
} from "@paysave/ui";
import { AlertTriangle, ClipboardList, Search, UsersRound, WalletCards } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatBaht, type RecoveryStage } from "../domain/recovery-case";
import { CaseTable } from "./case-table";
import { RecoverySkeleton } from "./recovery-skeleton";
import { RecoveryErrorState } from "./recovery-error-state";
import { useCases } from "./use-recovery";

const selectClass =
  "min-h-11 rounded-xl border border-input bg-surface px-3 text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15";

export function CaseListView() {
  const query = useCases();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<RecoveryStage | "all">("all");
  const filtered = useMemo(
    () =>
      query.data?.filter(
        (item) =>
          (stage === "all" || item.stage === stage) &&
          `${item.id} ${item.customerName} ${item.assignedAgentName}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ) ?? [],
    [query.data, search, stage],
  );

  if (query.isLoading) return <RecoverySkeleton />;
  if (query.isError)
    return (
      <RecoveryErrorState
        error={query.error}
        onRetry={() => void query.refetch()}
        title="โหลด Recovery Cases ไม่สำเร็จ"
      />
    );

  const cases = query.data ?? [];
  const unassigned = cases.filter((item) => !item.assignedAgentId).length;
  const critical = cases.filter(
    (item) => item.priority === "critical" || item.priority === "high",
  ).length;
  const total = cases.reduce((sum, item) => sum + item.outstanding, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">RECOVERY MANAGEMENT</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Case List</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            จัดลำดับ ติดตาม และมอบหมายเคสด้วยข้อมูลจำลองทั้งหมด
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-md border border-border bg-surface px-4 text-sm font-semibold shadow-xs transition hover:bg-muted"
          href={"/recovery/assignments" as Route}
        >
          <UsersRound className="size-4" /> เปิด Assignment Screen
        </Link>
      </header>

      <section aria-label="Recovery overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          helper="Mock cases ในระบบ"
          icon={<ClipboardList className="size-5" />}
          label="เคสทั้งหมด"
          value={String(cases.length)}
        />
        <KpiCard
          helper="Critical + High"
          icon={<AlertTriangle className="size-5" />}
          label="เคสเร่งด่วน"
          value={String(critical)}
        />
        <KpiCard
          helper="รอหัวหน้าจัดสรร"
          icon={<UsersRound className="size-5" />}
          label="ยังไม่มอบหมาย"
          value={String(unassigned)}
        />
        <KpiCard
          helper="รวมทุก Recovery Case"
          icon={<WalletCards className="size-5" />}
          label="ยอดคงค้าง"
          value={formatBaht(total)}
        />
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Recovery Cases</CardTitle>
              <CardDescription>TanStack Table · เลือก Case ID เพื่อดูรายละเอียด</CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative">
                <span className="sr-only">ค้นหาเคส</span>
                <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
                <Input
                  className="pl-9 sm:w-72"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ค้นหา Case ID, ลูกค้า, ผู้รับผิดชอบ"
                  value={search}
                />
              </label>
              <label>
                <span className="sr-only">กรองตามสถานะ</span>
                <select
                  className={selectClass}
                  onChange={(event) => setStage(event.target.value as RecoveryStage | "all")}
                  value={stage}
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="new">เคสใหม่</option>
                  <option value="contacting">กำลังติดต่อ</option>
                  <option value="field_visit">ลงพื้นที่</option>
                  <option value="promise_to_pay">สัญญาชำระ</option>
                  <option value="approval">รออนุมัติ</option>
                  <option value="resolved">เสร็จสิ้น</option>
                </select>
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <p className="border-y border-border bg-muted/60 px-5 py-2 text-xs text-muted-foreground sm:hidden">
            เลื่อนตารางแนวนอนเพื่อดูข้อมูลเพิ่มเติม
          </p>
          {filtered.length ? (
            <CaseTable cases={filtered} />
          ) : (
            <EmptyState
              description="ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ"
              title="ไม่พบ Recovery Case"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

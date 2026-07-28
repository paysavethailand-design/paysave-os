"use client";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Status,
} from "@paysave/ui";
import { ArrowRight, CheckCircle2, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { formatBaht } from "../domain/recovery-case";
import { CasePriority } from "./case-status";
import { RecoverySkeleton } from "./recovery-skeleton";
import { useAgents, useAssignCase, useCases } from "./use-recovery";
export function AssignmentView() {
  const casesQuery = useCases();
  const agentsQuery = useAgents();
  const mutation = useAssignCase();
  const available = useMemo(
    () => casesQuery.data?.filter((item) => item.stage !== "resolved") ?? [],
    [casesQuery.data],
  );
  const [caseId, setCaseId] = useState("RC-2026-0015");
  const [agentId, setAgentId] = useState("agent-03");
  if (casesQuery.isLoading || agentsQuery.isLoading) return <RecoverySkeleton />;
  if (casesQuery.isError || agentsQuery.isError)
    return <ErrorState title="โหลด Assignment Screen ไม่สำเร็จ" description="กรุณาลองใหม่" />;
  const selected = available.find((item) => item.id === caseId);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-primary">RECOVERY MANAGEMENT</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Assignment Screen</h1>
        <p className="mt-2 text-muted-foreground">
          มอบหมายเคสแบบ Optimistic UI — หน้าจออัปเดตทันทีก่อน Mock API ตอบกลับ
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>เลือก Recovery Case</CardTitle>
            <CardDescription>{available.length} เคสที่กำลังดำเนินการ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {available.map((item) => (
              <button
                aria-pressed={caseId === item.id}
                className={`flex min-h-20 w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${caseId === item.id ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-border hover:bg-muted"}`}
                key={item.id}
                onClick={() => setCaseId(item.id)}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <b>{item.id}</b>
                    <CasePriority priority={item.priority} />
                  </span>
                  <span className="mt-1 block truncate text-sm">
                    {item.customerName} · {formatBaht(item.outstanding)}
                  </span>
                  <small className="text-muted-foreground">
                    ปัจจุบัน: {item.assignedAgentName}
                  </small>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>เลือกผู้รับผิดชอบ</CardTitle>
              <CardDescription>แสดง capacity จาก Mock Repository</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {agentsQuery.data?.map((agent) => (
                <button
                  aria-pressed={agentId === agent.id}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${agentId === agent.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                  key={agent.id}
                  onClick={() => setAgentId(agent.id)}
                >
                  <Avatar>
                    <AvatarFallback>{agent.initials}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <b className="block">{agent.name}</b>
                    <small className="text-muted-foreground">{agent.zone}</small>
                  </span>
                  <Badge variant={agent.activeCases / agent.capacity > 0.8 ? "warning" : "success"}>
                    {agent.activeCases}/{agent.capacity}
                  </Badge>
                </button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>ยืนยันการมอบหมาย</CardTitle>
              <CardDescription>
                {selected ? `${selected.id} · ${selected.customerName}` : "เลือกเคสก่อน"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selected ? (
                <>
                  <div className="rounded-2xl bg-muted p-4">
                    <small className="text-muted-foreground">ผู้รับผิดชอบปัจจุบัน</small>
                    <b className="mt-1 block">{selected.assignedAgentName}</b>
                    {selected.updatedAt === "กำลังบันทึก..." ? (
                      <Status label="Optimistic update" tone="info" />
                    ) : null}
                  </div>
                  <Button
                    className="w-full"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ caseId, agentId })}
                  >
                    <UsersRound className="size-4" />
                    {mutation.isPending ? "Mock API กำลังยืนยัน..." : "มอบหมายทันที"}
                  </Button>
                  <p
                    aria-live="polite"
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <CheckCircle2 className="size-4 text-success" />
                    ระบบ rollback อัตโนมัติหาก Mock API ล้มเหลว
                  </p>
                </>
              ) : (
                <EmptyState
                  title="ยังไม่ได้เลือกเคส"
                  description="เลือก Recovery Case จากรายการด้านซ้าย"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

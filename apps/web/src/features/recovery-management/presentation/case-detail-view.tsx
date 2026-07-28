"use client";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  KpiCard,
  Separator,
  Status,
} from "@paysave/ui";
import {
  ArrowLeft,
  CalendarCheck,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  IdCard,
  Mail,
  MapPinned,
  Phone,
  UserRound,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { formatBaht } from "../domain/recovery-case";
import {
  ApprovalDialog,
  ContactAttemptDialog,
  FieldVisitDialog,
  PromiseToPayDialog,
} from "./action-dialogs";
import { AssetCard } from "./asset-card";
import { CasePriority, CaseStage } from "./case-status";
import { DocumentViewer } from "./document-viewer";
import { GpsMap } from "./gps-map";
import { RecoverySkeleton } from "./recovery-skeleton";
import { CaseTimeline } from "./timeline";
import { useCaseDetail } from "./use-recovery";

export function CaseDetailView({ caseId }: { readonly caseId: string }) {
  const query = useCaseDetail(caseId);
  if (query.isLoading) return <RecoverySkeleton />;
  if (query.isError)
    return (
      <ErrorState
        title="โหลด Case Detail ไม่สำเร็จ"
        description="Mock Repository ไม่ตอบกลับ"
        actionLabel="ลองอีกครั้ง"
        onAction={() => query.refetch()}
      />
    );
  if (!query.data)
    return (
      <ErrorState
        title="ไม่พบ Recovery Case"
        description={`ไม่มี ${caseId} ใน Mock Repository`}
        actionLabel="กลับ"
        onAction={() => history.back()}
      />
    );
  const item = query.data;
  const customerRows = [
    { Icon: IdCard, label: "เลขบัตร", value: item.nationalIdMasked },
    { Icon: Phone, label: "โทรศัพท์", value: item.phoneMasked },
    { Icon: Mail, label: "อีเมล", value: item.emailMasked },
    { Icon: MapPinned, label: "ที่อยู่", value: item.address },
  ] as const;
  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
          href={"/recovery/cases" as Route}
        >
          <ArrowLeft className="size-4" />
          กลับ Case List
        </Link>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-primary">{item.id}</p>
              <CasePriority priority={item.priority} />
              <CaseStage stage={item.stage} />
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {item.customerName}
            </h1>
            <p className="mt-2 text-muted-foreground">
              สัญญา {item.contractNumber} · สาขา {item.branch} · อัปเดต {item.updatedAt}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ContactAttemptDialog caseId={caseId} />
            <PromiseToPayDialog caseId={caseId} />
            <FieldVisitDialog caseId={caseId} />
            {item.approval.status === "pending" ? <ApprovalDialog caseId={caseId} /> : null}
          </div>
        </div>
      </header>
      <section aria-label="Case overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="ยอดคงค้าง"
          value={formatBaht(item.outstanding)}
          helper={`เงินต้น ${formatBaht(item.originalPrincipal)}`}
          icon={<CircleDollarSign className="size-5" />}
        />
        <KpiCard
          label="Days Past Due"
          value={`${item.daysPastDue} วัน`}
          helper="นับจากวันครบกำหนด"
          icon={<Clock3 className="size-5" />}
        />
        <KpiCard
          label="ชำระแล้ว"
          value={formatBaht(item.paidAmount)}
          helper="ยอดสะสมตาม Mock Contract"
          icon={<FileCheck2 className="size-5" />}
        />
        <KpiCard
          label="ผู้รับผิดชอบ"
          value={item.assignedAgentName}
          helper={item.nextAction}
          icon={<UserRound className="size-5" />}
        />
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-6">
          <CaseTimeline events={item.timeline} />
          <GpsMap visit={item.fieldVisits[0]} />
          <Card>
            <CardHeader>
              <CardTitle>Contact Attempts</CardTitle>
              <CardDescription>ประวัติการติดต่อจาก Mock Repository</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {item.contacts.map((contact) => (
                <div
                  className="flex flex-col gap-2 rounded-2xl border border-border p-4 sm:flex-row sm:items-start"
                  key={contact.id}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Phone className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <b>{contact.channel.toUpperCase()}</b>
                      <Status
                        label={contact.outcome.replaceAll("_", " ")}
                        tone={contact.outcome === "connected" ? "success" : "warning"}
                      />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{contact.note}</p>
                  </div>
                  <small className="text-muted-foreground">{contact.occurredAt}</small>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>ข้อมูลถูก mask เพื่อใช้ใน Demo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {customerRows.map(({ Icon, label, value }, index) => (
                <div key={label}>
                  {index ? <Separator className="mb-3" /> : null}
                  <div className="flex gap-3">
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm">
                      <small className="block text-muted-foreground">{label}</small>
                      <b className="mt-0.5 block">{value}</b>
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Promise To Pay</CardTitle>
                  <CardDescription>ข้อตกลงนัดชำระล่าสุด</CardDescription>
                </div>
                {item.promiseToPay ? (
                  <Badge variant="success">ACTIVE</Badge>
                ) : (
                  <Badge variant="neutral">NONE</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {item.promiseToPay ? (
                <div className="space-y-4">
                  <p className="text-3xl font-bold">{formatBaht(item.promiseToPay.amount)}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarCheck className="size-4 text-success" />
                    <span>
                      ครบกำหนด <b>{item.promiseToPay.dueDate}</b>
                    </span>
                  </div>
                  <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                    {item.promiseToPay.note}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  ยังไม่มี Promise to Pay สำหรับเคสนี้
                </p>
              )}
            </CardContent>
          </Card>
          {item.approval.status !== "pending" ? (
            <Card>
              <CardHeader>
                <CardTitle>Approval Result</CardTitle>
              </CardHeader>
              <CardContent>
                <Status
                  label={item.approval.status === "approved" ? "อนุมัติแล้ว" : "ไม่อนุมัติ"}
                  tone={item.approval.status === "approved" ? "success" : "danger"}
                />
                <p className="mt-3 text-sm text-muted-foreground">{item.approval.note}</p>
              </CardContent>
            </Card>
          ) : null}
          <AssetCard asset={item.asset} />
          <DocumentViewer documents={item.documents} />
        </div>
      </div>
    </div>
  );
}

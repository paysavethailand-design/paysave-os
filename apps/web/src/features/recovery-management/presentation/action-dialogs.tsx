"use client";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
} from "@paysave/ui";
import { CheckCircle2, ClipboardCheck, MapPin, MessageCircle, WalletCards } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { ApprovalInput, ContactAttempt, FieldVisit } from "../domain/recovery-case";
import { useAddContact, useApproval, useFieldVisit, usePromiseToPay } from "./use-recovery";

const controlClass =
  "min-h-11 w-full rounded-xl border border-input bg-surface px-3 text-sm text-foreground outline-none transition focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15";
const textareaClass = `${controlClass} min-h-24 py-3`;

export function ContactAttemptDialog({ caseId }: { readonly caseId: string }) {
  const mutation = useAddContact();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<ContactAttempt["channel"]>("phone");
  const [outcome, setOutcome] = useState<ContactAttempt["outcome"]>("connected");
  const [note, setNote] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    await mutation.mutateAsync({ caseId, input: { channel, outcome, note } });
    setNote("");
    setOpen(false);
  }
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <MessageCircle className="size-4" />
          บันทึกการติดต่อ
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form className="space-y-5" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Contact Attempt</DialogTitle>
            <DialogDescription>บันทึกผลการติดต่อลูกค้าลง Mock Timeline</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              ช่องทาง
              <select
                className={controlClass}
                onChange={(event) => setChannel(event.target.value as ContactAttempt["channel"])}
                value={channel}
              >
                <option value="phone">โทรศัพท์</option>
                <option value="line">LINE</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              ผลการติดต่อ
              <select
                className={controlClass}
                onChange={(event) => setOutcome(event.target.value as ContactAttempt["outcome"])}
                value={outcome}
              >
                <option value="connected">ติดต่อได้</option>
                <option value="no_answer">ไม่รับสาย</option>
                <option value="wrong_number">หมายเลขไม่ถูกต้อง</option>
                <option value="callback">ขอให้โทรกลับ</option>
              </select>
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium">
            รายละเอียด
            <textarea
              className={textareaClass}
              onChange={(event) => setNote(event.target.value)}
              placeholder="สรุปการสนทนาและขั้นตอนถัดไป"
              required
              value={note}
            />
          </label>
          {mutation.isError ? (
            <p role="alert" className="text-sm text-danger">
              บันทึกไม่สำเร็จ กรุณาลองใหม่
            </p>
          ) : null}
          <DialogFooter>
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "กำลังบันทึก..." : "บันทึก Contact Attempt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PromiseToPayDialog({ caseId }: { readonly caseId: string }) {
  const mutation = usePromiseToPay();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("8500");
  const [dueDate, setDueDate] = useState("2026-07-30");
  const [note, setNote] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    await mutation.mutateAsync({ caseId, input: { amount: Number(amount), dueDate, note } });
    setOpen(false);
  }
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <WalletCards className="size-4" />
          Promise to Pay
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form className="space-y-5" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Promise To Pay</DialogTitle>
            <DialogDescription>กำหนดยอดและวันนัดชำระ ระบบจะอัปเดตสถานะแบบ Mock</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              ยอดนัดชำระ (บาท)
              <Input
                inputMode="decimal"
                min="1"
                onChange={(event) => setAmount(event.target.value)}
                required
                type="number"
                value={amount}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              วันที่นัดชำระ
              <Input
                onChange={(event) => setDueDate(event.target.value)}
                required
                type="date"
                value={dueDate}
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium">
            หมายเหตุ
            <textarea
              className={textareaClass}
              onChange={(event) => setNote(event.target.value)}
              placeholder="เงื่อนไขการนัดชำระ"
              required
              value={note}
            />
          </label>
          <DialogFooter>
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "กำลังสร้าง..." : "ยืนยัน Promise to Pay"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FieldVisitDialog({ caseId }: { readonly caseId: string }) {
  const mutation = useFieldVisit();
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<FieldVisit["outcome"]>("met_customer");
  const [note, setNote] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    await mutation.mutateAsync({ caseId, input: { outcome, note } });
    setOpen(false);
  }
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <MapPin className="size-4" />
          Field Visit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form className="space-y-5" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Field Visit</DialogTitle>
            <DialogDescription>บันทึกผลลงพื้นที่พร้อม Mock GPS coordinate</DialogDescription>
          </DialogHeader>
          <label className="grid gap-2 text-sm font-medium">
            ผลการลงพื้นที่
            <select
              className={controlClass}
              onChange={(event) => setOutcome(event.target.value as FieldVisit["outcome"])}
              value={outcome}
            >
              <option value="met_customer">พบลูกค้า</option>
              <option value="not_home">ไม่พบที่บ้าน</option>
              <option value="moved">ย้ายที่อยู่</option>
              <option value="refused">ปฏิเสธการติดต่อ</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            รายละเอียด
            <textarea
              className={textareaClass}
              onChange={(event) => setNote(event.target.value)}
              placeholder="รายละเอียดการลงพื้นที่"
              required
              value={note}
            />
          </label>
          <DialogFooter>
            <Button disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "กำลังบันทึก..." : "บันทึก Field Visit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ApprovalDialog({ caseId }: { readonly caseId: string }) {
  const mutation = useApproval();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  async function decide(decision: ApprovalInput["decision"]) {
    if (!note.trim()) return;
    await mutation.mutateAsync({ caseId, input: { decision, note } });
    setOpen(false);
  }
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>
          <ClipboardCheck className="size-4" />
          พิจารณาคำขอ
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approval Dialog</DialogTitle>
          <DialogDescription>พิจารณาคำขอปรับแผนชำระของเคส {caseId}</DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm leading-6">
          <b className="block">คำขอ: แบ่งชำระ 2 งวด</b>
          <span className="text-muted-foreground">การตัดสินใจนี้อัปเดตเฉพาะ Mock Repository</span>
        </div>
        <label className="grid gap-2 text-sm font-medium">
          เหตุผลประกอบการพิจารณา
          <textarea
            className={textareaClass}
            onChange={(event) => setNote(event.target.value)}
            placeholder="ระบุเหตุผลก่อนอนุมัติหรือไม่อนุมัติ"
            required
            value={note}
          />
        </label>
        {!note.trim() ? (
          <p className="text-xs text-muted-foreground">กรุณาระบุเหตุผลเพื่อเปิดใช้ปุ่มตัดสินใจ</p>
        ) : null}
        <DialogFooter>
          <Button
            disabled={!note.trim() || mutation.isPending}
            onClick={() => decide("rejected")}
            variant="destructive"
          >
            ไม่อนุมัติ
          </Button>
          <Button disabled={!note.trim() || mutation.isPending} onClick={() => decide("approved")}>
            <CheckCircle2 className="size-4" />
            อนุมัติ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

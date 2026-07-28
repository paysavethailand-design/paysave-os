"use client";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@paysave/ui";
import { ChevronLeft, ChevronRight, Eye, FileImage, FileText } from "lucide-react";
import { useState } from "react";
import type { RecoveryDocument } from "../domain/recovery-case";
function Viewer({ document }: { readonly document: RecoveryDocument }) {
  const [page, setPage] = useState(1);
  return (
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle>{document.name}</DialogTitle>
        <DialogDescription>Document Viewer แบบจำลอง · ไม่มีการดาวน์โหลดไฟล์จริง</DialogDescription>
      </DialogHeader>
      <div className="grid min-h-[52vh] place-items-center rounded-2xl bg-slate-200 p-5 dark:bg-slate-950">
        <div className="flex aspect-[.72] h-[48vh] max-w-full flex-col bg-white p-8 text-slate-800 shadow-elevated">
          <div className="h-2 w-32 rounded bg-slate-900" />
          <div className="mt-3 h-1.5 w-52 rounded bg-slate-300" />
          <div className="mt-9 space-y-3">
            {Array.from({ length: 10 }, (_, i) => (
              <div
                className="h-1.5 rounded bg-slate-200"
                key={i}
                style={{ width: `${96 - (i % 3) * 12}%` }}
              />
            ))}
          </div>
          <div className="mt-auto border-t pt-3 text-center text-xs">
            MOCK DOCUMENT · หน้า {page}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-3">
        <Button
          aria-label="หน้าก่อนหน้า"
          disabled={page === 1}
          onClick={() => setPage((v) => v - 1)}
          size="icon"
          variant="secondary"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Badge variant="neutral">
          หน้า {page} / {document.pages}
        </Badge>
        <Button
          aria-label="หน้าถัดไป"
          disabled={page === document.pages}
          onClick={() => setPage((v) => v + 1)}
          size="icon"
          variant="secondary"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </DialogContent>
  );
}
export function DocumentViewer({ documents }: { readonly documents: readonly RecoveryDocument[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Viewer</CardTitle>
        <CardDescription>เอกสารประกอบเคส · Mock files</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.map((document) => {
          const Icon = document.type === "PDF" ? FileText : FileImage;
          return (
            <div
              className="flex items-center gap-3 rounded-xl border border-border p-3"
              key={document.id}
            >
              <span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <b className="block truncate text-sm">{document.name}</b>
                <small className="text-muted-foreground">
                  {document.type} · {document.size} · {document.pages} หน้า
                </small>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button aria-label={`เปิด ${document.name}`} size="icon" variant="ghost">
                    <Eye className="size-4" />
                  </Button>
                </DialogTrigger>
                <Viewer document={document} />
              </Dialog>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

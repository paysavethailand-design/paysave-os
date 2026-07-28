"use client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@paysave/ui";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { Route } from "next";
import Link from "next/link";
import { formatBaht, type CaseSummary } from "../domain/recovery-case";
import { CasePriority, CaseStage } from "./case-status";
const h = createColumnHelper<CaseSummary>();
const columns = [
  h.accessor("id", {
    header: "Case",
    cell: (i) => (
      <Link
        className="font-semibold whitespace-nowrap text-primary hover:underline"
        href={`/recovery/cases/${i.getValue()}` as Route}
      >
        {i.getValue()}
      </Link>
    ),
  }),
  h.accessor("customerName", {
    header: "ลูกค้า",
    cell: (i) => (
      <div>
        <b className="block">{i.getValue()}</b>
        <small className="text-muted-foreground">{i.row.original.phoneMasked}</small>
      </div>
    ),
  }),
  h.accessor("priority", {
    header: "ความสำคัญ",
    cell: (i) => <CasePriority priority={i.getValue()} />,
  }),
  h.accessor("stage", { header: "สถานะ", cell: (i) => <CaseStage stage={i.getValue()} /> }),
  h.accessor("daysPastDue", { header: "ค้าง", cell: (i) => <b>{i.getValue()} วัน</b> }),
  h.accessor("outstanding", {
    header: "ยอดคงค้าง",
    cell: (i) => <b>{formatBaht(i.getValue())}</b>,
  }),
  h.accessor("assignedAgentName", { header: "ผู้รับผิดชอบ" }),
  h.accessor("nextAction", {
    header: "Next action",
    cell: (i) => <span className="text-muted-foreground">{i.getValue()}</span>,
  }),
];
export function CaseTable({ cases }: { readonly cases: readonly CaseSummary[] }) {
  const table = useReactTable({ data: [...cases], columns, getCoreRowModel: getCoreRowModel() });
  return (
    <Table aria-label="รายการ Recovery Cases" className="min-w-[1050px]">
      <TableHeader>
        {table.getHeaderGroups().map((g) => (
          <TableRow key={g.id}>
            {g.headers.map((header) => (
              <TableHead key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

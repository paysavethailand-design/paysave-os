"use client";
import { Status, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@paysave/ui";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ActivityRow } from "../domain/dashboard";
const helper = createColumnHelper<ActivityRow>();
const columns = [
  helper.accessor("id", {
    header: "Reference",
    cell: (i) => <span className="font-semibold text-primary">{i.getValue()}</span>,
  }),
  helper.accessor("title", { header: "รายการ" }),
  helper.accessor("category", { header: "ประเภท" }),
  helper.accessor("owner", { header: "ผู้รับผิดชอบ" }),
  helper.accessor("status", {
    header: "สถานะ",
    cell: (i) => <Status label={i.getValue()} tone={i.row.original.statusTone} />,
  }),
  helper.accessor("value", {
    header: "มูลค่า / เวลา",
    cell: (i) => <span className="font-semibold">{i.getValue()}</span>,
  }),
  helper.accessor("updatedAt", {
    header: "อัปเดต",
    cell: (i) => <span className="text-muted-foreground">{i.getValue()}</span>,
  }),
];
export function ActivityTable({ rows }: { readonly rows: readonly ActivityRow[] }) {
  const table = useReactTable({ columns, data: [...rows], getCoreRowModel: getCoreRowModel() });
  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
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

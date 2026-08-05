"use client";

import { Badge, Button, Card, CardContent, CardHeader, Input } from "@paysave/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { Asset } from "../domain/entities/asset";
import type { InventoryDashboardModel } from "../application/queries/project-inventory-dashboard";
import { InventoryDashboardView } from "./inventory-dashboard-view";

export type InventorySaveResult =
  | {
      readonly ok: true;
      readonly asset: Asset;
      readonly message: string;
      readonly correlationId: string;
    }
  | {
      readonly ok: false;
      readonly message: string;
      readonly correlationId: string;
    };

export type InventorySaveAction = (input: {
  readonly assetId: string;
  readonly displayRef: string;
  readonly expectedVersionNo: number;
}) => Promise<InventorySaveResult>;

interface InventorySaveNotice {
  readonly assetId: string;
  readonly kind: "success" | "error";
  readonly text: string;
}

/** Reconciles the list title from the row returned by the database-backed Server Action. */
export function applyInventorySaveResult(
  rows: readonly Asset[],
  assetId: string,
  result: InventorySaveResult,
): { readonly rows: readonly Asset[]; readonly notice: InventorySaveNotice } {
  const text = `${result.message} (รหัสอ้างอิง: ${result.correlationId})`;
  if (!result.ok) {
    return { rows, notice: { assetId, kind: "error", text } };
  }
  return {
    rows: rows.map((row) => (row.id === assetId ? result.asset : row)),
    notice: { assetId, kind: "success", text },
  };
}

export function InventoryManagementView({
  assets,
  canManage,
  model,
  saveAction,
  nextCursor = null,
}: {
  readonly assets: readonly Asset[];
  readonly canManage: boolean;
  readonly model: InventoryDashboardModel;
  readonly saveAction: InventorySaveAction;
  readonly nextCursor?: string | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(assets);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<InventorySaveNotice | null>(null);

  useEffect(() => setRows(assets), [assets]);

  function beginEdit(asset: Asset) {
    setEditingId(asset.id);
    setDraft(asset.displayRef);
    setNotice(null);
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>, assetId: string) {
    event.preventDefault();
    const currentAsset = rows.find((row) => row.id === assetId);
    if (!currentAsset) {
      setNotice({
        assetId,
        kind: "error",
        text: "ไม่สามารถระบุรายการ Inventory ที่ต้องการบันทึกได้",
      });
      return;
    }
    setSavingId(assetId);
    setNotice(null);
    try {
      const result = await saveAction({
        assetId,
        displayRef: draft,
        expectedVersionNo: currentAsset.versionNo,
      });
      const nextNotice = applyInventorySaveResult(rows, assetId, result).notice;
      if (result.ok) {
        setRows((current) => applyInventorySaveResult(current, assetId, result).rows);
        setEditingId(null);
      }
      if (!result.ok) {
        router.refresh();
      }
      setNotice(nextNotice);
    } catch {
      setNotice({
        assetId,
        kind: "error",
        text: "ไม่สามารถติดต่อ Server Action ได้ กรุณาลองอีกครั้ง",
      });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <InventoryDashboardView model={model} />

      <section aria-labelledby="inventory-list-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold" id="inventory-list-heading">
            รายการ Inventory
          </h2>
          <Badge variant="neutral">{rows.length.toLocaleString()} รายการ</Badge>
        </div>

        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              ไม่พบรายการ Inventory ใน Tenant นี้
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((asset) => (
              <Card key={asset.id}>
                <CardHeader className="flex-row items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{asset.displayRef}</p>
                    <p className="text-sm text-muted-foreground">{asset.currentStatusCode}</p>
                  </div>
                  <Badge variant="neutral">v{asset.versionNo}</Badge>
                </CardHeader>
                <CardContent>
                  {notice?.assetId === asset.id ? (
                    <p
                      aria-live={notice.kind === "error" ? "assertive" : "polite"}
                      className={
                        notice.kind === "error"
                          ? "mb-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
                          : "mb-4 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success"
                      }
                      role={notice.kind === "error" ? "alert" : "status"}
                    >
                      {notice.text}
                    </p>
                  ) : null}
                  <details>
                    <summary className="cursor-pointer font-medium">
                      เปิดรายละเอียด Inventory
                    </summary>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">Asset ID</dt>
                        <dd className="break-all">{asset.id}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">สถานะ</dt>
                        <dd>{asset.currentStatusCode}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">เจ้าของปัจจุบัน</dt>
                        <dd>{asset.currentOwnerCustomerId ?? "ไม่มี"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">อัปเดตล่าสุด</dt>
                        <dd>{asset.updatedAt}</dd>
                      </div>
                    </dl>

                    {canManage ? (
                      editingId === asset.id ? (
                        <form
                          className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
                          onSubmit={(event) => submitEdit(event, asset.id)}
                        >
                          <label className="flex-1 text-sm font-medium">
                            ชื่ออ้างอิง Inventory
                            <Input
                              className="mt-2"
                              disabled={savingId === asset.id}
                              maxLength={2000}
                              minLength={1}
                              name="displayRef"
                              onChange={(event) => setDraft(event.target.value)}
                              required
                              value={draft}
                            />
                          </label>
                          <Button disabled={savingId === asset.id} type="submit">
                            {savingId === asset.id ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
                          </Button>
                          <Button
                            disabled={savingId === asset.id}
                            onClick={() => setEditingId(null)}
                            type="button"
                            variant="secondary"
                          >
                            ยกเลิก
                          </Button>
                        </form>
                      ) : (
                        <Button className="mt-5" onClick={() => beginEdit(asset)} type="button">
                          แก้ไข Inventory
                        </Button>
                      )
                    ) : null}
                  </details>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {nextCursor ? (
          <div className="flex justify-end">
            <Link
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors"
              href={`/inventory?cursor=${encodeURIComponent(nextCursor)}`}
            >
              ดูรายการถัดไป
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}

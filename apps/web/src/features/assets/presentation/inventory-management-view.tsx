"use client";

import { Badge, Button, Card, CardContent, CardHeader, Input } from "@paysave/ui";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { Asset } from "../domain/entities/asset";
import type { InventoryDashboardModel } from "../application/queries/project-inventory-dashboard";
import { InventoryDashboardView } from "./inventory-dashboard-view";

interface InventoryApiResponse {
  readonly data?: Asset;
  readonly error?: { readonly message?: string };
}

export type InventoryFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<{ readonly ok: boolean; json(): Promise<InventoryApiResponse> }>;

/** Persists one Inventory edit through the existing `assets.manage` API gate. */
export async function saveInventoryAsset(
  assetId: string,
  displayRef: string,
  fetcher: InventoryFetcher = fetch,
): Promise<Asset> {
  const response = await fetcher(`/api/v1/assets/${encodeURIComponent(assetId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayRef }),
  });
  const body = await response.json();
  if (!response.ok || !body.data) {
    throw new Error(body.error?.message ?? "บันทึก Inventory ไม่สำเร็จ");
  }
  return body.data;
}

export function InventoryManagementView({
  assets,
  canManage,
  model,
  nextCursor = null,
}: {
  readonly assets: readonly Asset[];
  readonly canManage: boolean;
  readonly model: InventoryDashboardModel;
  readonly nextCursor?: string | null;
}) {
  const [rows, setRows] = useState(assets);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function beginEdit(asset: Asset) {
    setEditingId(asset.id);
    setDraft(asset.displayRef);
    setMessage(null);
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>, assetId: string) {
    event.preventDefault();
    setSavingId(assetId);
    setMessage(null);
    try {
      const updated = await saveInventoryAsset(assetId, draft.trim());
      setRows((current) => current.map((row) => (row.id === assetId ? updated : row)));
      setEditingId(null);
      setMessage("บันทึก Inventory เรียบร้อย");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "บันทึก Inventory ไม่สำเร็จ");
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

        {message ? <p aria-live="polite">{message}</p> : null}

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
                              maxLength={2000}
                              onChange={(event) => setDraft(event.target.value)}
                              required
                              value={draft}
                            />
                          </label>
                          <Button disabled={savingId === asset.id} type="submit">
                            {savingId === asset.id ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
                          </Button>
                          <Button
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

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from "@paysave/ui";
import { Bike, ScanLine } from "lucide-react";
import { formatBaht, type AssetInformation } from "../domain/recovery-case";
export function AssetCard({ asset }: { readonly asset: AssetInformation }) {
  const rows = [
    ["ยี่ห้อ / รุ่น", `${asset.brand} ${asset.model}`],
    ["ทะเบียน", asset.registration],
    ["เลขตัวถัง", asset.serialMasked],
    ["สภาพ", asset.condition],
    ["มูลค่าประเมิน", formatBaht(asset.estimatedValue)],
  ];
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Bike className="size-5" />
          </span>
          <Badge variant="success">{asset.status}</Badge>
        </div>
        <CardTitle className="mt-3">Asset Information</CardTitle>
        <CardDescription>{asset.category}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(([label, value], i) => (
          <div key={label}>
            {i ? <Separator className="mb-3" /> : null}
            <div className="flex items-start justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <b className="text-right">{value}</b>
            </div>
          </div>
        ))}
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
          <ScanLine className="size-4" />
          ข้อมูลทั้งหมดเป็น Mock Data
        </div>
      </CardContent>
    </Card>
  );
}

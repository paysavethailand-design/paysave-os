import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@paysave/ui";
import { MapPin, Navigation } from "lucide-react";
import type { FieldVisit } from "../domain/recovery-case";
export function GpsMap({ visit }: { readonly visit: FieldVisit | undefined }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>GPS Map</CardTitle>
            <CardDescription>ตำแหน่ง Field Visit จากพิกัดจำลอง</CardDescription>
          </div>
          <Badge variant="success">Mock GPS</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <figure>
          <svg
            aria-labelledby="gps-map-title"
            className="h-56 w-full rounded-2xl border border-border bg-muted"
            role="img"
            viewBox="0 0 560 260"
          >
            <title id="gps-map-title">แผนที่จำลองแสดงจุดลงพื้นที่กรุงเทพมหานคร</title>
            <defs>
              <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M 28 0 L 0 0 0 28" fill="none" stroke="currentColor" strokeOpacity=".08" />
              </pattern>
            </defs>
            <rect fill="url(#grid)" height="260" width="560" />
            <path
              d="M-20 205 C95 145 160 238 290 160 S465 70 590 115"
              fill="none"
              stroke="#60a5fa"
              strokeLinecap="round"
              strokeWidth="16"
            />
            <path
              d="M40 20 C135 85 200 54 265 118 S400 205 520 235"
              fill="none"
              stroke="#94a3b8"
              strokeDasharray="12 9"
              strokeLinecap="round"
              strokeWidth="9"
            />
            <circle cx="345" cy="133" fill="#ef4444" r="17" />
            <circle cx="345" cy="133" fill="white" r="6" />
            <circle
              cx="345"
              cy="133"
              fill="none"
              r="29"
              stroke="#ef4444"
              strokeOpacity=".25"
              strokeWidth="10"
            />
          </svg>
          <figcaption className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2">
              <MapPin className="size-4 text-danger" />
              <span>
                <b>
                  {visit
                    ? `${visit.latitude.toFixed(4)}, ${visit.longitude.toFixed(4)}`
                    : "ยังไม่มีพิกัด"}
                </b>
                <small className="block text-muted-foreground">
                  Accuracy {visit?.accuracyMeters ?? "—"} เมตร
                </small>
              </span>
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <Navigation className="size-4" />
              ไม่มีการเรียก Map API ภายนอก
            </span>
          </figcaption>
        </figure>
      </CardContent>
    </Card>
  );
}

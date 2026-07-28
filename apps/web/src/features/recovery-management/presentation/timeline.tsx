import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@paysave/ui";
import { CheckCircle2, Clock3, FileText, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import type { TimelineEvent } from "../domain/recovery-case";
const icons = {
  status: Clock3,
  contact: MessageCircle,
  visit: MapPin,
  promise: CheckCircle2,
  approval: ShieldCheck,
  document: FileText,
};
const tones = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-primary/10 text-primary",
  neutral: "bg-muted text-muted-foreground",
};
export function CaseTimeline({ events }: { readonly events: readonly TimelineEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
        <CardDescription>ประวัติการดำเนินงานล่าสุด เรียงจากใหม่ไปเก่า</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-0 before:absolute before:top-3 before:bottom-3 before:left-5 before:w-px before:bg-border">
          {events.map((event) => {
            const Icon = icons[event.type];
            return (
              <li className="relative flex gap-4 pb-7 last:pb-0" key={event.id}>
                <span
                  className={`relative z-10 grid size-10 shrink-0 place-items-center rounded-xl ${tones[event.tone]}`}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <b>{event.title}</b>
                    <time className="text-xs text-muted-foreground">{event.occurredAt}</time>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {event.description}
                  </p>
                  <small className="mt-1 block text-muted-foreground">โดย {event.actor}</small>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

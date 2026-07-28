import { Card, CardContent, Skeleton } from "@paysave/ui";
import { DashboardShell } from "./dashboard-shell";
export function DashboardLoading() {
  return (
    <DashboardShell>
      <div aria-label="กำลังโหลด Dashboard" className="space-y-6" role="status">
        <div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-3 h-10 w-full max-w-2xl" />
          <Skeleton className="mt-3 h-5 w-full max-w-xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-4 h-9 w-32" />
                <Skeleton className="mt-4 h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.65fr_.85fr]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    </DashboardShell>
  );
}

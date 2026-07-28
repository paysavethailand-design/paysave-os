import { Card, CardContent, Skeleton } from "@paysave/ui";
export function RecoverySkeleton() {
  return (
    <div aria-busy="true" aria-label="กำลังโหลด Recovery Management" className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-80 max-w-full" />
        <Skeleton className="h-4 w-[30rem] max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-4 p-5">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton className="h-14 w-full" key={i} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";
import { DashboardError } from "@/features/frontend-dashboard";
export default function ErrorPage({
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  return <DashboardError reset={reset} />;
}

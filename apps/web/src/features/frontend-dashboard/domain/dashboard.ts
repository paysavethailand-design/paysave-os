export const dashboardPersonas = ["executive", "partner", "admin", "field"] as const;
export type DashboardPersona = (typeof dashboardPersonas)[number];
export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";
export interface DashboardKpi {
  readonly label: string;
  readonly value: string;
  readonly trend: string;
  readonly direction: "up" | "down" | "neutral";
  readonly helper: string;
}
export interface TrendPoint {
  readonly label: string;
  readonly primary: number;
  readonly secondary: number;
}
export interface DistributionPoint {
  readonly name: string;
  readonly value: number;
  readonly color: string;
}
export interface ActivityRow {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly owner: string;
  readonly status: string;
  readonly statusTone: StatusTone;
  readonly value: string;
  readonly updatedAt: string;
}
export interface DashboardModel {
  readonly source: "mock";
  readonly persona: DashboardPersona;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly kpis: readonly DashboardKpi[];
  readonly trend: readonly TrendPoint[];
  readonly distribution: readonly DistributionPoint[];
  readonly activity: readonly ActivityRow[];
}
export function isDashboardPersona(value: string): value is DashboardPersona {
  return dashboardPersonas.includes(value as DashboardPersona);
}

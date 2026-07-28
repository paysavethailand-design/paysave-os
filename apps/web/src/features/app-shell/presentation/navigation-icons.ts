import {
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  FileChartColumn,
  Gauge,
  HandCoins,
  Landmark,
  Settings2,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { NavigationIconKey } from "../domain/navigation";

export const navigationIcons: Readonly<Record<NavigationIconKey, LucideIcon>> = {
  dashboard: Gauge,
  business: Building2,
  cases: BriefcaseBusiness,
  assignments: ClipboardList,
  customers: UsersRound,
  reports: FileChartColumn,
  payments: Landmark,
  commission: HandCoins,
  admin: Settings2,
};

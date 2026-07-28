import { Badge, Status } from "@paysave/ui";
import {
  priorityLabels,
  stageLabels,
  type RecoveryPriority,
  type RecoveryStage,
} from "../domain/recovery-case";
const stageTone: Record<RecoveryStage, "success" | "warning" | "danger" | "info" | "neutral"> = {
  new: "neutral",
  contacting: "info",
  field_visit: "warning",
  promise_to_pay: "success",
  approval: "warning",
  resolved: "success",
};
const priorityVariant: Record<RecoveryPriority, "danger" | "warning" | "neutral"> = {
  critical: "danger",
  high: "warning",
  medium: "neutral",
  low: "neutral",
};
export function CaseStage({ stage }: { readonly stage: RecoveryStage }) {
  return <Status label={stageLabels[stage]} tone={stageTone[stage]} />;
}
export function CasePriority({ priority }: { readonly priority: RecoveryPriority }) {
  return <Badge variant={priorityVariant[priority]}>{priorityLabels[priority]}</Badge>;
}

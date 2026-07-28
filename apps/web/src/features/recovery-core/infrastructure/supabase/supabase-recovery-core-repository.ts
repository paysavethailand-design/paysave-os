import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CaseListParams,
  FieldVisitCheckpointRecord,
  NewAssignmentRecord,
  NewCaseRecord,
  NewContactAttemptRecord,
  NewFieldVisitRecord,
  NewPromiseRecord,
  NewTimelineRecord,
  NewVisitResultRecord,
  RecoveryCoreRepository,
  TimelineListParams,
  UpdateCaseRecord,
  UpdatePromiseRecord,
} from "../../application/ports/recovery-core-repository";
import type { MutationResult, PromiseToPay, RecoveryCase, FieldVisit } from "../../domain/entities";
import {
  assignmentRowSchema,
  caseRowSchema,
  contactAttemptRowSchema,
  fieldVisitRowSchema,
  promiseRowSchema,
  timelineRowSchema,
  toAssignment,
  toCase,
  toContact,
  toFieldVisit,
  toPromise,
  toTimeline,
  toTransition,
  toVisitResult,
  transitionRowSchema,
  visitResultRowSchema,
} from "./recovery-rows";

const CASE_COLUMNS =
  "id, partner_id, branch_id, customer_id, contract_id, status_id, priority, opened_at, next_action_at, closed_at, version_no, business_object_id, created_at, updated_at";
const TIMELINE_COLUMNS =
  "id, partner_id, case_id, event_type, occurred_at, actor_user_id, source_type, source_id, summary, payload_json, schema_version, event_version_id, correlation_id, causation_id, visibility_code, created_at";
const ASSIGNMENT_COLUMNS =
  "id, partner_id, case_id, agent_id, team_id, status_id, assigned_at, due_at, completed_at, version_no, business_object_id, created_at, updated_at";
const VISIT_COLUMNS =
  "id, partner_id, assignment_id, scheduled_at, started_at, completed_at, outcome_code, version_no, business_object_id, created_at, updated_at";
const RESULT_COLUMNS =
  "id, partner_id, visit_id, outcome_type, payload_json, schema_version, created_at";
const CONTACT_COLUMNS =
  "id, partner_id, visit_id, customer_contact_id, channel_code, outcome_code, occurred_at, actor_membership_id, created_at";
const PROMISE_COLUMNS =
  "id, partner_id, case_id, visit_id, customer_id, promised_amount, currency_code, due_at, status_code, version_no, created_at, updated_at";
function assertOk(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

/** Request-scoped RLS-bound PostgREST adapter. Every exposed mutation is one SQL statement. */
export class SupabaseRecoveryCoreRepository implements RecoveryCoreRepository {
  constructor(private readonly client: SupabaseClient) {}
  async listCases(p: CaseListParams) {
    let q = this.client
      .schema("recovery")
      .from("cases")
      .select(CASE_COLUMNS)
      .eq("partner_id", p.partnerId)
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .limit(p.limit + 1);
    if (p.cursor) q = q.gt("id", p.cursor);
    if (p.statusId) q = q.eq("status_id", p.statusId);
    if (p.priority) q = q.eq("priority", p.priority);
    if (p.customerId) q = q.eq("customer_id", p.customerId);
    if (p.branchId) q = q.eq("branch_id", p.branchId);
    const { data, error } = await q;
    assertOk(error, "Failed to search cases");
    return (data ?? []).map((r) => toCase(caseRowSchema.parse(r)));
  }
  async findCaseById(id: string) {
    const { data, error } = await this.client
      .schema("recovery")
      .from("cases")
      .select(CASE_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    assertOk(error, "Failed to load case");
    return data ? toCase(caseRowSchema.parse(data)) : null;
  }
  async createCase(i: NewCaseRecord) {
    const { data, error } = await this.client
      .schema("recovery")
      .from("cases")
      .insert({
        partner_id: i.partnerId,
        branch_id: i.branchId,
        customer_id: i.customerId,
        contract_id: i.contractId ?? null,
        status_id: i.statusId,
        priority: i.priority,
        opened_at: i.openedAt,
        next_action_at: i.nextActionAt,
        business_object_id: i.businessObjectId,
        created_by: i.createdBy,
      })
      .select(CASE_COLUMNS)
      .single();
    assertOk(error, "Failed to create case");
    return toCase(caseRowSchema.parse(data));
  }
  async updateCase(id: string, i: UpdateCaseRecord): Promise<MutationResult<RecoveryCase>> {
    const payload: Record<string, unknown> = {
      version_no: i.expectedVersionNo + 1,
      updated_by: i.updatedBy,
    };
    if (i.priority !== undefined) payload.priority = i.priority;
    if (i.nextActionAt !== undefined) payload.next_action_at = i.nextActionAt;
    if (i.contractId !== undefined) payload.contract_id = i.contractId;
    const { data, error } = await this.client
      .schema("recovery")
      .from("cases")
      .update(payload)
      .eq("id", id)
      .eq("partner_id", i.partnerId)
      .eq("version_no", i.expectedVersionNo)
      .is("deleted_at", null)
      .select(CASE_COLUMNS)
      .maybeSingle();
    assertOk(error, "Failed to update case");
    if (data) return { outcome: "updated", value: toCase(caseRowSchema.parse(data)) };
    return (await this.exists("recovery", "cases", id, i.partnerId))
      ? { outcome: "version_conflict" }
      : { outcome: "not_found" };
  }
  async listTimeline(p: TimelineListParams) {
    let q = this.client
      .schema("recovery")
      .from("case_timeline_events")
      .select(TIMELINE_COLUMNS)
      .eq("partner_id", p.partnerId)
      .eq("case_id", p.caseId)
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(p.limit + 1);
    if (p.before)
      q = q.or(
        `occurred_at.lt.${p.before.occurredAt},and(occurred_at.eq.${p.before.occurredAt},id.lt.${p.before.id})`,
      );
    if (p.eventType) q = q.eq("event_type", p.eventType);
    if (p.sourceType) q = q.eq("source_type", p.sourceType);
    const { data, error } = await q;
    assertOk(error, "Failed to list timeline");
    return (data ?? []).map((r) => toTimeline(timelineRowSchema.parse(r)));
  }
  async appendTimelineEvent(i: NewTimelineRecord) {
    const { data, error } = await this.client
      .schema("recovery")
      .from("case_timeline_events")
      .insert({
        partner_id: i.partnerId,
        case_id: i.caseId,
        event_type: i.eventType,
        occurred_at: i.occurredAt,
        actor_user_id: i.actorUserId,
        source_type: i.sourceType,
        source_id: i.sourceId,
        summary: i.summary,
        payload_json: i.payloadJson,
        schema_version: i.schemaVersion,
        event_version_id: i.eventVersionId,
        correlation_id: i.correlationId,
        causation_id: i.causationId,
        visibility_code: i.visibilityCode,
        created_by: i.createdBy,
      })
      .select(TIMELINE_COLUMNS)
      .single();
    assertOk(error, "Failed to append timeline event");
    return toTimeline(timelineRowSchema.parse(data));
  }
  async createAssignment(i: NewAssignmentRecord) {
    const { data, error } = await this.client
      .schema("workforce")
      .from("assignments")
      .insert({
        partner_id: i.partnerId,
        case_id: i.caseId,
        agent_id: i.agentId,
        team_id: i.teamId ?? null,
        status_id: i.statusId,
        assigned_at: i.assignedAt,
        due_at: i.dueAt,
        business_object_id: i.businessObjectId,
        created_by: i.createdBy,
      })
      .select(ASSIGNMENT_COLUMNS)
      .single();
    assertOk(error, "Failed to create assignment");
    return toAssignment(assignmentRowSchema.parse(data));
  }
  async createFieldVisit(i: NewFieldVisitRecord) {
    const { data, error } = await this.client
      .schema("workforce")
      .from("field_visits")
      .insert({
        partner_id: i.partnerId,
        assignment_id: i.assignmentId,
        scheduled_at: i.scheduledAt,
        outcome_code: i.outcomeCode,
        business_object_id: i.businessObjectId,
        created_by: i.createdBy,
      })
      .select(VISIT_COLUMNS)
      .single();
    assertOk(error, "Failed to create field visit");
    return toFieldVisit(fieldVisitRowSchema.parse(data));
  }
  async updateFieldVisitCheckpoint(
    id: string,
    i: FieldVisitCheckpointRecord,
  ): Promise<MutationResult<FieldVisit>> {
    const payload =
      i.checkpoint === "check_in"
        ? { started_at: i.occurredAt, version_no: i.expectedVersionNo + 1, updated_by: i.updatedBy }
        : {
            completed_at: i.occurredAt,
            version_no: i.expectedVersionNo + 1,
            updated_by: i.updatedBy,
          };
    const { data, error } = await this.client
      .schema("workforce")
      .from("field_visits")
      .update(payload)
      .eq("id", id)
      .eq("partner_id", i.partnerId)
      .eq("version_no", i.expectedVersionNo)
      .is("deleted_at", null)
      .select(VISIT_COLUMNS)
      .maybeSingle();
    assertOk(error, "Failed to update field visit checkpoint");
    if (data) return { outcome: "updated", value: toFieldVisit(fieldVisitRowSchema.parse(data)) };
    return (await this.exists("workforce", "field_visits", id, i.partnerId))
      ? { outcome: "version_conflict" }
      : { outcome: "not_found" };
  }
  async appendVisitResult(i: NewVisitResultRecord) {
    const { data, error } = await this.client
      .schema("workforce")
      .from("field_visit_outcomes")
      .insert({
        partner_id: i.partnerId,
        visit_id: i.visitId,
        outcome_type: i.outcomeType,
        payload_json: i.payloadJson,
        schema_version: i.schemaVersion,
        created_by: i.createdBy,
      })
      .select(RESULT_COLUMNS)
      .single();
    assertOk(error, "Failed to append field visit result");
    return toVisitResult(visitResultRowSchema.parse(data));
  }
  async createContactAttempt(i: NewContactAttemptRecord) {
    const { data, error } = await this.client
      .schema("workforce")
      .from("contact_attempts")
      .insert({
        partner_id: i.partnerId,
        visit_id: i.visitId ?? null,
        customer_contact_id: i.customerContactId,
        channel_code: i.channelCode,
        outcome_code: i.outcomeCode,
        occurred_at: i.occurredAt,
        actor_membership_id: i.actorMembershipId,
        created_by: i.createdBy,
      })
      .select(CONTACT_COLUMNS)
      .single();
    assertOk(error, "Failed to create contact attempt");
    return toContact(contactAttemptRowSchema.parse(data));
  }
  async createPromiseToPay(i: NewPromiseRecord) {
    const { data, error } = await this.client
      .schema("workforce")
      .from("promises_to_pay")
      .insert({
        partner_id: i.partnerId,
        case_id: i.caseId,
        visit_id: i.visitId ?? null,
        customer_id: i.customerId,
        promised_amount: i.promisedAmount,
        currency_code: i.currencyCode,
        due_at: i.dueAt,
        status_code: i.statusCode,
        created_by: i.createdBy,
      })
      .select(PROMISE_COLUMNS)
      .single();
    assertOk(error, "Failed to create promise to pay");
    return toPromise(promiseRowSchema.parse(data));
  }
  async updatePromiseToPay(
    id: string,
    i: UpdatePromiseRecord,
  ): Promise<MutationResult<PromiseToPay>> {
    const payload: Record<string, unknown> = {
      version_no: i.expectedVersionNo + 1,
      updated_by: i.updatedBy,
    };
    if (i.promisedAmount !== undefined) payload.promised_amount = i.promisedAmount;
    if (i.dueAt !== undefined) payload.due_at = i.dueAt;
    const { data, error } = await this.client
      .schema("workforce")
      .from("promises_to_pay")
      .update(payload)
      .eq("id", id)
      .eq("partner_id", i.partnerId)
      .eq("version_no", i.expectedVersionNo)
      .select(PROMISE_COLUMNS)
      .maybeSingle();
    assertOk(error, "Failed to update promise to pay");
    if (data) return { outcome: "updated", value: toPromise(promiseRowSchema.parse(data)) };
    return (await this.exists("workforce", "promises_to_pay", id, i.partnerId))
      ? { outcome: "version_conflict" }
      : { outcome: "not_found" };
  }
  async listWorkflowTransitions(partnerId: string, instanceId: string) {
    const { data: instance, error: instanceError } = await this.client
      .schema("workflow")
      .from("instances")
      .select("definition_version_id, current_state_id")
      .eq("partner_id", partnerId)
      .eq("id", instanceId)
      .maybeSingle();
    assertOk(instanceError, "Failed to load workflow instance");
    if (!instance) return [];
    const parsed = instance as { definition_version_id: string; current_state_id: string };
    const { data, error } = await this.client
      .schema("workflow")
      .from("transitions")
      .select("id, from_state_id, to_state_id, action_code, permission_code")
      .eq("partner_id", partnerId)
      .eq("definition_version_id", parsed.definition_version_id)
      .eq("from_state_id", parsed.current_state_id)
      .order("action_code", { ascending: true });
    assertOk(error, "Failed to list workflow transitions");
    return (data ?? []).map((r) => toTransition(transitionRowSchema.parse(r)));
  }
  private async exists(schema: string, table: string, id: string, partnerId: string) {
    const { data, error } = await this.client
      .schema(schema)
      .from(table)
      .select("id")
      .eq("id", id)
      .eq("partner_id", partnerId)
      .maybeSingle();
    assertOk(error, `Failed to check ${table}`);
    return data !== null;
  }
}

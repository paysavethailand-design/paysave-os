"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { recoveryKeys } from "../application/query-keys";
import type {
  AddContactInput,
  ApprovalInput,
  CaseDetail,
  CaseSummary,
  FieldVisitInput,
  PromiseInput,
  RecoveryAgent,
} from "../domain/recovery-case";
import { recoveryRepository } from "../infrastructure/runtime/staging-recovery-repository";
export const useCases = () =>
  useQuery({ queryKey: recoveryKeys.cases(), queryFn: () => recoveryRepository.listCases() });
export const useCaseDetail = (caseId: string) =>
  useQuery({
    queryKey: recoveryKeys.case(caseId),
    queryFn: () => recoveryRepository.getCase(caseId),
  });
export const useAgents = () =>
  useQuery({ queryKey: recoveryKeys.agents(), queryFn: () => recoveryRepository.listAgents() });
function replaceSummary(items: readonly CaseSummary[] | undefined, detail: CaseDetail) {
  if (!items) return items;
  return items.map((item) =>
    item.id === detail.id
      ? {
          ...item,
          assignedAgentId: detail.assignedAgentId,
          assignedAgentName: detail.assignedAgentName,
          stage: detail.stage,
          updatedAt: detail.updatedAt,
        }
      : item,
  );
}
export function useAssignCase() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, agentId }: { caseId: string; agentId: string }) =>
      recoveryRepository.assignCase(caseId, agentId),
    onMutate: async ({ caseId, agentId }) => {
      await client.cancelQueries({ queryKey: recoveryKeys.all });
      const previousCase = client.getQueryData<CaseDetail | null>(recoveryKeys.case(caseId));
      const previousCases = client.getQueryData<readonly CaseSummary[]>(recoveryKeys.cases());
      const agent = client
        .getQueryData<readonly RecoveryAgent[]>(recoveryKeys.agents())
        ?.find((item) => item.id === agentId);
      if (agent) {
        client.setQueryData<readonly CaseSummary[]>(recoveryKeys.cases(), (items) =>
          items?.map((item) =>
            item.id === caseId
              ? {
                  ...item,
                  assignedAgentId: agent.id,
                  assignedAgentName: agent.name,
                  updatedAt: "กำลังบันทึก...",
                }
              : item,
          ),
        );
        if (previousCase) {
          client.setQueryData(recoveryKeys.case(caseId), {
            ...previousCase,
            assignedAgentId: agent.id,
            assignedAgentName: agent.name,
            updatedAt: "กำลังบันทึก...",
          });
        }
      }
      return { previousCase, previousCases };
    },
    onError: (_error, variables, context) => {
      client.setQueryData(recoveryKeys.case(variables.caseId), context?.previousCase);
      client.setQueryData(recoveryKeys.cases(), context?.previousCases);
    },
    onSuccess: (detail) => {
      client.setQueryData(recoveryKeys.case(detail.id), detail);
      client.setQueryData<readonly CaseSummary[]>(recoveryKeys.cases(), (items) =>
        replaceSummary(items, detail),
      );
    },
  });
}
function useDetailMutation<T>(mutationFn: (caseId: string, input: T) => Promise<CaseDetail>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, input }: { caseId: string; input: T }) => mutationFn(caseId, input),
    onSuccess: (detail) => {
      client.setQueryData(recoveryKeys.case(detail.id), detail);
      client.setQueryData<readonly CaseSummary[]>(recoveryKeys.cases(), (items) =>
        replaceSummary(items, detail),
      );
    },
  });
}
export const useAddContact = () =>
  useDetailMutation<AddContactInput>((id, input) =>
    recoveryRepository.addContactAttempt(id, input),
  );
export const usePromiseToPay = () =>
  useDetailMutation<PromiseInput>((id, input) => recoveryRepository.createPromiseToPay(id, input));
export const useFieldVisit = () =>
  useDetailMutation<FieldVisitInput>((id, input) => recoveryRepository.recordFieldVisit(id, input));
export const useApproval = () =>
  useDetailMutation<ApprovalInput>((id, input) => recoveryRepository.resolveApproval(id, input));

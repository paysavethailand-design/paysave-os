import { ConsoleAuditSink } from "@paysave/observability";
import { databaseProvider } from "@/shared/providers/database/server";
import type { BoundedPage, BoundedPageRequest } from "@/shared/lib/pagination";
import { createPartner } from "./application/commands/create-partner";
import { deletePartner } from "./application/commands/delete-partner";
import { updatePartner } from "./application/commands/update-partner";
import type { RequestContext } from "./application/ports/request-context";
import { getPartner } from "./application/queries/get-partner";
import { listPartners } from "./application/queries/list-partners";
import type { Partner } from "./domain/entities/partner";
import type { PartnerRepository } from "./application/ports/partner-repository";

const auditSink = new ConsoleAuditSink();
const clock = { now: () => new Date() };

async function repository(): Promise<PartnerRepository> {
  return databaseProvider().repositories.partners();
}

/** Server-only public API composition root for the partners feature. */
export async function listPartnersUseCase(
  pageRequest: BoundedPageRequest,
): Promise<BoundedPage<Partner>> {
  return listPartners(pageRequest, await repository());
}

export async function getPartnerUseCase(partnerId: string): Promise<Partner> {
  return getPartner(partnerId, await repository());
}

export async function createPartnerUseCase(
  rawInput: unknown,
  context: RequestContext,
): Promise<Partner> {
  return createPartner(rawInput, context, { repository: await repository(), auditSink });
}

export async function updatePartnerUseCase(
  partnerId: string,
  rawInput: unknown,
  context: RequestContext,
): Promise<Partner> {
  return updatePartner(partnerId, rawInput, context, { repository: await repository(), auditSink });
}

export async function deletePartnerUseCase(
  partnerId: string,
  rawInput: unknown,
  context: RequestContext,
): Promise<Partner> {
  return deletePartner(partnerId, rawInput, context, {
    repository: await repository(),
    auditSink,
    clock,
  });
}

export type { Partner } from "./domain/entities/partner";
export { PARTNERS_PERMISSIONS } from "./domain/partner-codes";
export type { RequestContext } from "./application/ports/request-context";

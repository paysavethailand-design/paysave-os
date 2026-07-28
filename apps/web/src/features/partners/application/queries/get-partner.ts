import { ApiError } from "@/shared/lib/api-error";
import type { Partner } from "../../domain/entities/partner";
import type { PartnerRepository } from "../ports/partner-repository";

/** Returns a single partner or throws a 404 ApiError. RLS already restricts visibility. */
export async function getPartner(
  partnerId: string,
  repository: PartnerRepository,
): Promise<Partner> {
  const partner = await repository.findById(partnerId);
  if (!partner) {
    throw new ApiError("not_found", `Partner not found: ${partnerId}`);
  }
  return partner;
}

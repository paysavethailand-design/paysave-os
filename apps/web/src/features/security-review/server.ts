import "server-only";
import { getSecurityReview } from "./application/queries/get-security-review";
import { SecurityControlReviewRepository } from "./infrastructure/security-control-review-repository";

export async function loadSecurityReview() {
  return getSecurityReview(new SecurityControlReviewRepository());
}

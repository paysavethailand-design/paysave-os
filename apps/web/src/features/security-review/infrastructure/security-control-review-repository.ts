import {
  SecurityComplianceValidator,
  createSecurityReviewReadModel,
  type SecurityReviewReadModel,
} from "@paysave/security";
import type {
  SecurityReviewCheckSnapshot,
  SecurityReviewRepository,
  SecurityReviewSnapshot,
} from "../application/ports/security-review-repository";

type Validator = Pick<SecurityComplianceValidator, "validate">;

/** Trusted Security Validator + Read Model adapter. It has no provider or execution dependency. */
export class SecurityControlReviewRepository implements SecurityReviewRepository {
  public constructor(
    private readonly readModel: () => SecurityReviewReadModel = createSecurityReviewReadModel,
    private readonly validator: Validator = new SecurityComplianceValidator(),
    private readonly clock: () => Date = () => new Date(),
  ) {}

  public async loadSnapshot(): Promise<SecurityReviewSnapshot> {
    const validation = this.validator.validate(this.readModel());
    const checks: readonly SecurityReviewCheckSnapshot[] = validation.checks.map((check) =>
      Object.freeze({
        id: check.category,
        category: check.category,
        outcome: check.outcome,
        code: check.code,
        title: check.title,
        detail: check.detail,
        evidence: Object.freeze([...check.evidence]),
        findings: Object.freeze(check.findings.map((finding) => Object.freeze({ ...finding }))),
      }),
    );

    return Object.freeze({
      generatedAt: this.clock().toISOString(),
      checks: Object.freeze(checks),
    });
  }
}

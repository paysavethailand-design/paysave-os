import { Badge } from "@paysave/ui";
import type { SecurityReviewModel } from "../domain/security-review";
import { ComplianceDashboard } from "./compliance-dashboard";
import { SecurityFindingsView } from "./security-findings-view";
import { SecurityReviewSection } from "./security-review-section";

export function SecurityReviewView({ model }: { readonly model: SecurityReviewModel }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1600px] space-y-12 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">READ ONLY</Badge>
          <Badge variant="success">SECURITY VALIDATORS + READ MODELS</Badge>
        </div>
        <div>
          <p className="text-sm font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Infrastructure Center
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Security Review</h1>
        </div>
        <p className="max-w-4xl text-sm leading-6 text-muted-foreground sm:text-base">
          Read-only review of declarative build-time controls and Security Read Model evidence. PASS
          does not prove live provider reachability, runtime attack resistance, or external-system
          authorization state.
        </p>
        <p className="text-xs text-muted-foreground">
          Snapshot generated {new Date(model.generatedAt).toLocaleString("en-GB")}
        </p>
      </header>

      <ComplianceDashboard summary={model.complianceStatus} />
      <SecurityFindingsView findings={model.securityFindings} />
      <SecurityReviewSection
        id="architecture-boundary-status"
        title="Architecture Boundary Status"
        description="Declarative architecture control coverage verified by the Security Validator; this is not a live source scan."
        checks={model.architectureBoundaryStatus}
      />
      <SecurityReviewSection
        id="layer-isolation-review"
        title="Layer Isolation Review"
        description="Application dependency-direction and layer-isolation controls from the Security Control Read Model."
        checks={model.layerIsolationReview}
      />
      <SecurityReviewSection
        id="provider-isolation-review"
        title="Provider Isolation Review"
        description="Declarative controls exclude direct provider access and execution from domain, application, presentation, and route layers."
        checks={model.providerIsolationReview}
      />
      <SecurityReviewSection
        id="secret-exposure-review"
        title="Secret Exposure Review"
        description="Only projection-control counts are reviewed; sensitive values are neither loaded nor displayed."
        checks={model.secretExposureReview}
      />
      <SecurityReviewSection
        id="permission-boundary-review"
        title="Permission Boundary Review"
        description="Permission-denial and tenant-scope control assertions only; no current user permissions are exposed."
        checks={model.permissionBoundaryReview}
      />

      <footer className="rounded-xl border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
        Missing, unavailable, or unconfirmed Security Validator and Read Model outcomes fail closed
        as UNKNOWN. No action controls are available in this center.
      </footer>
    </main>
  );
}

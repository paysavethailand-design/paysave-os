import { Badge } from "@paysave/ui";
import type { DiagnosticsModel } from "../domain/diagnostics";
import { IntegritySection } from "./integrity-section";
import { ValidationSummary } from "./validation-summary";

export function DiagnosticsView({ model }: { readonly model: DiagnosticsModel }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1600px] space-y-12 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">READ ONLY</Badge>
          <Badge variant="success">VALIDATORS + READ MODELS</Badge>
        </div>
        <div>
          <p className="text-sm font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Infrastructure Center
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Diagnostics</h1>
        </div>
        <p className="max-w-4xl text-sm leading-6 text-muted-foreground sm:text-base">
          Read-only Validator and Read Model results. This page does not initialize, probe, execute,
          or control providers and does not display sensitive connection data.
        </p>
        <p className="text-xs text-muted-foreground">
          Snapshot generated {new Date(model.generatedAt).toLocaleString("en-GB")}
        </p>
      </header>

      <ValidationSummary summary={model.systemIntegrity} />
      <IntegritySection
        id="registry-diagnostics"
        title="Registry Diagnostics"
        description="Local Provider and Capability Registry integrity only; no external provider state is inferred."
        checks={model.registryDiagnostics}
      />
      <IntegritySection
        id="capability-validation"
        title="Capability Validation"
        description="Provider contracts and immutable capability descriptors are validated without executing capabilities."
        checks={model.capabilityValidation}
      />
      <IntegritySection
        id="environment-validation"
        title="Environment Validation"
        description="Required environment profile structure is validated from configuration read models only."
        checks={model.environmentValidation}
      />
      <IntegritySection
        id="configuration-validation"
        title="Configuration Validation"
        description="Provider and capability bindings are checked for local consistency; configured does not mean reachable."
        checks={model.configurationValidation}
      />
      <IntegritySection
        id="read-model-validation"
        title="Read Model Validation"
        description="Operational read-model shape and ranges are validated without contacting external systems."
        checks={model.readModelValidation}
      />

      <footer className="rounded-xl border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
        Missing, unavailable, or unconfirmed Validator and Read Model outcomes fail closed as
        UNKNOWN. PASS confirms only the local validation described by each check.
      </footer>
    </main>
  );
}

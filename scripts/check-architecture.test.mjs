import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { findArchitectureViolations } from "./check-architecture.mjs";

const fixtures = [];

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function createFixture(files) {
  const root = await mkdtemp(join(tmpdir(), "paysave-architecture-"));
  fixtures.push(root);

  await Promise.all(
    Object.entries(files).map(async ([relativePath, content]) => {
      const absolutePath = join(root, relativePath);
      await mkdir(join(absolutePath, ".."), { recursive: true });
      await writeFile(absolutePath, content, "utf8");
    }),
  );

  return root;
}

test("accepts imports through feature and package public APIs", async () => {
  const root = await createFixture({
    "apps/web/src/app/page.tsx": 'import { requireAuth } from "@/features/auth/server";\n',
    "apps/web/src/features/auth/server.ts":
      'export { requireAuth } from "./presentation/server/require-auth";\n',
    "apps/web/src/features/auth/index.ts":
      'export { SignInForm } from "./presentation/sign-in-form";\n',
    "apps/web/src/features/app-shell/presentation/header.tsx":
      'import { signOutAction } from "@/features/auth/actions";\n',
    "apps/web/src/features/app-shell/index.ts": 'export { Header } from "./presentation/header";\n',
    "packages/ui/src/index.ts": 'export { Button } from "./components/button";\n',
  });

  assert.deepEqual(await findArchitectureViolations(root), []);
});

test("requires the approved shared folders in a real project root", async () => {
  const root = await createFixture({
    "package.json": '{"name":"fixture"}\n',
    "apps/web/src/shared/config/index.ts": "export {};\n",
  });

  const violations = await findArchitectureViolations(root);
  assert.ok(violations.some((item) => item.rule === "shared-folder-missing"));
});

test("rejects unowned horizontal root packages", async () => {
  const root = await createFixture({
    "package.json": '{"name":"fixture"}\n',
    "packages/domain/README.md": "# Unowned package\n",
  });

  const violations = await findArchitectureViolations(root);
  assert.ok(violations.some((item) => item.rule === "unowned-horizontal-package"));
});

test("rejects features without a public index", async () => {
  const root = await createFixture({
    "apps/web/src/features/auth/application/policy.ts": "export const policy = {};\n",
  });

  const violations = await findArchitectureViolations(root);
  assert.equal(violations[0]?.rule, "feature-public-api-missing");
});

test("rejects app routes that deep-import private feature layers", async () => {
  const root = await createFixture({
    "apps/web/src/app/page.tsx":
      'import { requireAuth } from "@/features/auth/application/require-auth";\n',
  });

  const violations = await findArchitectureViolations(root);
  assert.equal(violations[0]?.rule, "app-route-feature-public-api");
});

test("rejects cross-feature deep imports", async () => {
  const root = await createFixture({
    "apps/web/src/features/app-shell/presentation/profile.tsx":
      'import { action } from "@/features/auth/presentation/action";\n',
    "apps/web/src/features/app-shell/index.ts":
      'export { Profile } from "./presentation/profile";\n',
  });

  const violations = await findArchitectureViolations(root);
  assert.equal(violations[0]?.rule, "cross-feature-public-api");
});

test("rejects application dependencies on infrastructure", async () => {
  const root = await createFixture({
    "apps/web/src/features/auth/application/get-session.ts":
      'import { client } from "../infrastructure/client";\n',
    "apps/web/src/features/auth/index.ts":
      'export { getSession } from "./application/get-session";\n',
  });

  const violations = await findArchitectureViolations(root);
  assert.equal(violations[0]?.rule, "application-dependency-direction");
});

test("rejects direct provider SDK imports from domain, application, and presentation layers", async () => {
  const root = await createFixture({
    "apps/web/src/features/customers/application/list-customers.ts":
      'import { createClient } from "@supabase/supabase-js";\n',
    "apps/web/src/features/customers/domain/customer.ts":
      'import type { SupabaseClient } from "@supabase/supabase-js";\n',
    "apps/web/src/features/customers/presentation/release-button.tsx":
      'import { Octokit } from "@octokit/rest";\n',
    "apps/web/src/features/customers/index.ts": "export {};\n",
  });

  const violations = await findArchitectureViolations(root);
  assert.deepEqual(
    violations.map((item) => item.rule),
    ["provider-sdk-boundary", "provider-sdk-boundary", "provider-sdk-boundary"],
  );
});

test("rejects direct Infrastructure server calls from Business layers", async () => {
  const root = await createFixture({
    "apps/web/src/features/infrastructure/application/run-dns.ts":
      'import { createHostingerProvider } from "@paysave/infrastructure/server";\n',
    "apps/web/src/features/infrastructure/index.ts": "export {};\n",
  });

  const violations = await findArchitectureViolations(root);
  assert.deepEqual(
    violations.map((item) => item.rule),
    ["infrastructure-business-direct-call"],
  );
});

test("rejects direct Infrastructure server calls from UI layers", async () => {
  const root = await createFixture({
    "apps/web/src/features/infrastructure/presentation/panel.tsx":
      'import { createHostingerProvider } from "@paysave/infrastructure/server";\n',
    "apps/web/src/features/infrastructure/index.ts": "export {};\n",
  });

  const violations = await findArchitectureViolations(root);
  assert.deepEqual(
    violations.map((item) => item.rule),
    ["infrastructure-ui-direct-call"],
  );
});

test("rejects direct Infrastructure package access outside feature infrastructure adapters", async () => {
  const root = await createFixture({
    "apps/web/src/features/infrastructure-dashboard/index.ts": "export {};\n",
    "apps/web/src/features/infrastructure-dashboard/application/load.ts":
      'import { ProviderRegistry } from "@paysave/infrastructure";\n',
    "apps/web/src/features/infrastructure-dashboard/presentation/panel.tsx":
      'import type { CapabilityDescriptor } from "@paysave/infrastructure";\n',
  });

  const violations = await findArchitectureViolations(root);
  assert.deepEqual(
    violations.map((item) => item.rule),
    ["infrastructure-layer-bypass", "infrastructure-layer-bypass"],
  );
});

test("enforces Provider Center registry access through its infrastructure adapter", async () => {
  const root = await createFixture({
    "apps/web/src/features/provider-center/index.ts": "export {};\n",
    "apps/web/src/features/provider-center/application/load.ts":
      'import { ProviderRegistry } from "@paysave/infrastructure";\n',
    "apps/web/src/features/provider-center/presentation/provider-list.tsx":
      'import type { CapabilityDescriptor } from "@paysave/infrastructure";\n',
    "apps/web/src/app/infrastructure/providers/page.tsx":
      'import { ProviderRegistry } from "@paysave/infrastructure";\n',
    "apps/web/src/features/provider-center/infrastructure/registry-adapter.ts":
      'import { ProviderFactory } from "@paysave/infrastructure/server";\n',
  });

  const violations = await findArchitectureViolations(root);
  assert.deepEqual(
    violations.map((item) => item.rule),
    ["infrastructure-layer-bypass", "infrastructure-layer-bypass", "infrastructure-layer-bypass"],
  );
});

test("enforces Capability Explorer registry access through its infrastructure adapter", async () => {
  const root = await createFixture({
    "apps/web/src/features/capability-explorer/index.ts": "export {};\n",
    "apps/web/src/features/capability-explorer/application/load.ts":
      'import { CapabilityRegistry } from "@paysave/infrastructure";\n',
    "apps/web/src/features/capability-explorer/presentation/capability-matrix.tsx":
      'import type { CapabilityDescriptor } from "@paysave/infrastructure";\n',
    "apps/web/src/app/infrastructure/capabilities/page.tsx":
      'import { CapabilityRegistry } from "@paysave/infrastructure";\n',
    "apps/web/src/features/capability-explorer/infrastructure/registry-adapter.ts":
      'import { CapabilityRegistry } from "@paysave/infrastructure";\n',
  });

  const violations = await findArchitectureViolations(root);
  assert.deepEqual(
    violations.map((item) => item.rule),
    ["infrastructure-layer-bypass", "infrastructure-layer-bypass", "infrastructure-layer-bypass"],
  );
});

test("enforces Infrastructure Operations registry access through its infrastructure adapter", async () => {
  const root = await createFixture({
    "apps/web/src/features/infrastructure-operations/index.ts": "export {};\n",
    "apps/web/src/features/infrastructure-operations/application/load.ts":
      'import { ProviderRegistry } from "@paysave/infrastructure";\n',
    "apps/web/src/features/infrastructure-operations/presentation/resource-overview.tsx":
      'import type { CapabilityDescriptor } from "@paysave/infrastructure";\n',
    "apps/web/src/app/infrastructure/operations/page.tsx":
      'import { CapabilityRegistry } from "@paysave/infrastructure";\n',
    "apps/web/src/features/infrastructure-operations/infrastructure/registry-adapter.ts":
      'import { CapabilityRegistry } from "@paysave/infrastructure";\n',
  });

  const violations = await findArchitectureViolations(root);
  assert.deepEqual(
    violations.map((item) => item.rule),
    ["infrastructure-layer-bypass", "infrastructure-layer-bypass", "infrastructure-layer-bypass"],
  );
});

test("enforces Monitoring Center Registry and Monitoring access through its infrastructure adapter", async () => {
  const root = await createFixture({
    "apps/web/src/features/monitoring-center/index.ts": "export {};\n",
    "apps/web/src/features/monitoring-center/application/load.ts":
      'import { readOperationalMetricsState } from "@paysave/observability";\n',
    "apps/web/src/features/monitoring-center/presentation/health.tsx":
      'import { ProviderRegistry } from "@paysave/infrastructure";\n',
    "apps/web/src/app/infrastructure/monitoring/page.tsx":
      'import { readOperationalMetricsState } from "@paysave/observability";\n',
    "apps/web/src/features/monitoring-center/infrastructure/read-model-adapter.ts":
      'import { ProviderRegistry } from "@paysave/infrastructure";\nimport { readOperationalMetricsState } from "@paysave/observability";\n',
  });

  const violations = await findArchitectureViolations(root);
  assert.equal(violations.filter((item) => item.rule === "monitoring-read-model-bypass").length, 2);
  assert.equal(violations.filter((item) => item.rule === "infrastructure-layer-bypass").length, 1);
});

test("enforces Diagnostics Validator and Read Model access through its infrastructure adapter", async () => {
  const root = await createFixture({
    "apps/web/src/features/diagnostics/index.ts": "export {};\n",
    "apps/web/src/features/diagnostics/application/load.ts":
      'import { readOperationalMetricsState } from "@paysave/observability";\n',
    "apps/web/src/features/diagnostics/presentation/integrity.tsx":
      'import { RegistryIntegrityValidator } from "@paysave/infrastructure";\n',
    "apps/web/src/app/infrastructure/diagnostics/page.tsx":
      'import { readOperationalMetricsState } from "@paysave/observability";\n',
    "apps/web/src/features/diagnostics/infrastructure/validator-adapter.ts":
      'import { RegistryIntegrityValidator } from "@paysave/infrastructure";\nimport { readOperationalMetricsState } from "@paysave/observability";\n',
  });

  const violations = await findArchitectureViolations(root);
  assert.equal(
    violations.filter((item) => item.rule === "diagnostics-read-model-bypass").length,
    2,
  );
  assert.equal(violations.filter((item) => item.rule === "infrastructure-layer-bypass").length, 1);
});

test("enforces Security Review Validator access and forbids platform/provider bypasses", async () => {
  const root = await createFixture({
    "apps/web/src/features/security-review/index.ts": "export {};\n",
    "apps/web/src/features/security-review/application/load.ts":
      'import { SecurityComplianceValidator } from "@paysave/security";\n',
    "apps/web/src/features/security-review/presentation/review.tsx":
      'import { ProviderRegistry } from "@paysave/infrastructure";\n',
    "apps/web/src/app/infrastructure/security-review/page.tsx":
      'import { readOperationalMetricsState } from "@paysave/observability";\n',
    "apps/web/src/features/security-review/infrastructure/security-adapter.ts":
      'import { SecurityComplianceValidator } from "@paysave/security";\nimport { Octokit } from "@octokit/rest";\n',
  });

  const violations = await findArchitectureViolations(root);
  assert.equal(
    violations.filter((item) => item.rule === "security-review-validator-bypass").length,
    1,
  );
  assert.equal(
    violations.filter((item) => item.rule === "security-review-platform-bypass").length,
    3,
  );
});

test("rejects provider selection fields in InfrastructureRequest", async () => {
  const root = await createFixture({
    "packages/infrastructure/core/models/request.ts":
      "export interface InfrastructureRequest { providerId?: string; capability: string }\n",
  });

  const violations = await findArchitectureViolations(root);
  assert.deepEqual(
    violations.map((item) => item.rule),
    ["infrastructure-client-provider-selection"],
  );
});

test("rejects Business Platform server bypasses around repository ports", async () => {
  const root = await createFixture({
    "apps/web/src/features/business-platform/index.ts": "export {};\n",
    "apps/web/src/features/business-platform/server.ts":
      'import { databaseProvider } from "@/shared/providers/database/server";\n',
  });

  const violations = await findArchitectureViolations(root);
  assert.deepEqual(
    violations.map((item) => item.rule),
    ["business-platform-boundary-bypass"],
  );
});

test("rejects Business Platform direct external runtime calls outside trusted adapters", async () => {
  const root = await createFixture({
    "apps/web/src/features/business-platform/index.ts": "export {};\n",
    "apps/web/src/features/business-platform/presentation/view.tsx":
      'export async function View() { return fetch("https://example.invalid"); }\n',
  });

  const violations = await findArchitectureViolations(root);
  assert.deepEqual(
    violations.map((item) => item.rule),
    ["business-platform-direct-runtime-access"],
  );
});

test("rejects infrastructure core dependencies on concrete provider adapters", async () => {
  const root = await createFixture({
    "packages/infrastructure/core/registry/bad.ts":
      'import { createSupabaseProvider } from "../../supabase/index";\n',
  });

  const violations = await findArchitectureViolations(root);
  assert.deepEqual(
    violations.map((item) => item.rule),
    ["infrastructure-core-provider-coupling"],
  );
});

test("rejects concrete Supabase data adapters in non-auth feature server composition roots", async () => {
  const root = await createFixture({
    "apps/web/src/features/customers/server.ts":
      'import { customerDataSource } from "./infrastructure/supabase/customer-data-source";\n',
    "apps/web/src/features/customers/index.ts": "export {};\n",
    "apps/web/src/features/auth/server.ts":
      'export { createClient } from "./infrastructure/supabase/server-client";\n',
    "apps/web/src/features/auth/index.ts": "export {};\n",
  });

  const violations = await findArchitectureViolations(root);
  assert.deepEqual(
    violations.map((item) => item.rule),
    ["database-provider-composition-boundary"],
  );
});

test("rejects deep imports into shared packages", async () => {
  const root = await createFixture({
    "apps/web/src/features/app-shell/presentation/button.tsx":
      'import { Button } from "../../../../../../packages/ui/src/components/button";\n',
    "apps/web/src/features/app-shell/index.ts": 'export { Button } from "./presentation/button";\n',
  });

  const violations = await findArchitectureViolations(root);
  assert.equal(violations[0]?.rule, "shared-package-public-api");
});

test("accepts declared package.json subpath exports but rejects undeclared ones", async () => {
  const root = await createFixture({
    "apps/web/src/features/app-shell/presentation/tokens.tsx":
      'import "@paysave/ui/tokens.css";\nimport { parseFieldEncryptionKey } from "@paysave/security/crypto";\n',
    "apps/web/src/features/app-shell/index.ts": 'export {} from "./presentation/tokens";\n',
    "apps/web/src/features/other/presentation/bad.tsx":
      'import { encryptField } from "@paysave/security/field-crypto";\n',
    "apps/web/src/features/other/index.ts": 'export {} from "./presentation/bad";\n',
    "apps/web/src/features/infrastructure-dashboard/infrastructure/read-model.ts":
      'import { ProviderFactory } from "@paysave/infrastructure/server";\nimport { INFRASTRUCTURE_PROVIDER_MANIFESTS } from "@paysave/infrastructure/read-models";\n',
    "apps/web/src/features/infrastructure-dashboard/index.ts": "export {};\n",
  });

  const violations = await findArchitectureViolations(root);
  assert.ok(
    !violations.some(
      (item) =>
        item.rule === "shared-package-public-api" &&
        item.importPath.startsWith("@paysave/ui/tokens"),
    ),
  );
  assert.ok(
    !violations.some(
      (item) =>
        item.rule === "shared-package-public-api" && item.importPath === "@paysave/security/crypto",
    ),
  );
  assert.ok(
    !violations.some(
      (item) =>
        item.rule === "shared-package-public-api" &&
        item.importPath === "@paysave/infrastructure/server",
    ),
  );
  assert.ok(
    !violations.some(
      (item) =>
        item.rule === "shared-package-public-api" &&
        item.importPath === "@paysave/infrastructure/read-models",
    ),
  );
  assert.ok(
    violations.some(
      (item) =>
        item.rule === "shared-package-public-api" &&
        item.importPath === "@paysave/security/field-crypto",
    ),
  );
});

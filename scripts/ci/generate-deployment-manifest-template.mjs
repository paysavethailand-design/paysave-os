import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const outputPath = process.argv[2] ?? "deploy/deployment-manifest.json";
const manifest = {
  schemaVersion: 1,
  application: "paysave-os",
  releaseVersion: "0.1.0-ci-template",
  releaseEligibility: "blocked",
  sourceRevision: "SET_BY_CI",
  artifact: {
    file: "paysave-os-image.tar.gz",
    mediaType: "application/vnd.oci.image.layer.v1.tar+gzip",
    sha256: "SET_BY_CI",
  },
  runtime: {
    nodeMajor: 22,
    postgresMajor: 17,
    containerPort: 3000,
    healthPath: "/healthz",
    runAsNonRoot: true,
    readOnlyRootFilesystem: true,
    allowPrivilegeEscalation: false,
    dropCapabilities: ["ALL"],
    seccompProfile: "RuntimeDefault",
  },
  database: {
    changeAuthorized: false,
    migrationsIncluded: false,
    approvedBaseline: "supabase/migrations",
    blockedMigrations: [],
  },
  promotion: {
    deploy: false,
    mode: "evidence-only",
    buildOnce: true,
    promoteByDigest: true,
    environments: {
      development: { requiredApprovers: 0, productionDataAllowed: false },
      staging: { requiredApprovers: 1, productionDataAllowed: false },
      production: {
        requiredApprovers: 2,
        ctoApprovalRequired: true,
        productionDataAllowed: true,
      },
    },
  },
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`DEPLOYMENT_MANIFEST_TEMPLATE_CREATED ${outputPath}`);

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";

import { frozenReleaseIdentity } from "./release-identity.mjs";

const [imagePath, outputPath = "artifacts/deployment-manifest.json"] = process.argv.slice(2);
if (!imagePath) throw new Error("Usage: create-artifact-manifest.mjs <image.tar.gz> [output.json]");
const sha256File = async (path) =>
  new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve(hash.digest("hex")));
  });
const template = JSON.parse(await readFile("deploy/deployment-manifest.json", "utf8"));
const releaseIdentity = frozenReleaseIdentity();
const digest = await sha256File(imagePath);
template.releaseVersion = releaseIdentity.releaseVersion;
template.releaseEligibility = process.env.RELEASE_ELIGIBLE === "true" ? "passed" : "blocked";
template.sourceRevision = releaseIdentity.sourceRevision;
template.artifact.file = basename(imagePath);
template.artifact.sha256 = digest;
template.artifact.imageReference =
  process.env.IMAGE_REFERENCE ??
  `paysave-os:${template.releaseVersion}-${releaseIdentity.sourceRevision.slice(0, 12)}`;
template.createdAt = releaseIdentity.buildTime;
template.createdBy = "paysave-os-ci";
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify(template, null, 2)}
`,
);
await writeFile(
  `${dirname(outputPath)}/SHA256SUMS`,
  `${digest}  ${basename(imagePath)}
`,
);
console.log(`ARTIFACT_MANIFEST_CREATED ${outputPath} sha256=${digest}`);

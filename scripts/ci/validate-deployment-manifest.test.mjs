import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const canonical = JSON.parse(readFileSync("deploy/deployment-manifest.json", "utf8"));

function validate(runtime) {
  const directory = mkdtempSync(join(tmpdir(), "paysave-manifest-"));
  const path = join(directory, "manifest.json");
  writeFileSync(path, JSON.stringify({ ...canonical, runtime }));
  const result = spawnSync(
    process.execPath,
    ["scripts/ci/validate-deployment-manifest.mjs", path, "--allow-template"],
    {
      encoding: "utf8",
    },
  );
  rmSync(directory, { recursive: true, force: true });
  return result;
}

test("rejects runtime security controls that are unsafe or missing", () => {
  const result = validate({
    ...canonical.runtime,
    healthPath: "/login",
    readOnlyRootFilesystem: false,
    allowPrivilegeEscalation: true,
    dropCapabilities: [],
    seccompProfile: "Unconfined",
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /runtime\.healthPath must equal \/healthz/);
  assert.match(result.stderr, /runtime\.readOnlyRootFilesystem must be true/);
  assert.match(result.stderr, /runtime\.allowPrivilegeEscalation must be false/);
  assert.match(result.stderr, /runtime\.dropCapabilities must contain only ALL/);
  assert.match(result.stderr, /runtime\.seccompProfile must equal RuntimeDefault/);
});

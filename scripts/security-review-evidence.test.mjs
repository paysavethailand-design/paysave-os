import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { createSecurityReviewEvidence } from "./security-review-evidence.mjs";

async function createFixture(files) {
  const root = await mkdtemp(join(tmpdir(), "paysave-security-evidence-"));
  for (const [relativePath, content] of Object.entries(files)) {
    const path = join(root, relativePath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf8");
  }
  return root;
}

test("creates source-bound PASS evidence for a clean architecture tree", async () => {
  const root = await createFixture({
    "apps/web/src/features/example/index.ts": "export {};\n",
  });

  const evidence = await createSecurityReviewEvidence(
    root,
    () => new Date("2026-07-27T10:15:00.000Z"),
  );

  assert.equal(evidence.architectureGatePassed, true);
  assert.equal(evidence.violationCount, 0);
  assert.match(evidence.sourceDigest, /^[a-f0-9]{64}$/);
  assert.equal(evidence.verifiedAt, "2026-07-27T10:15:00.000Z");
  assert.ok(evidence.sourceFileCount > 0);
});

test("creates FAIL evidence when the architecture scanner reports a violation", async () => {
  const root = await createFixture({
    "apps/web/src/features/example/index.ts": "export {};\n",
    "apps/web/src/features/example/application/query.ts":
      'import { adapter } from "../infrastructure/adapter";\n',
  });

  const evidence = await createSecurityReviewEvidence(root);

  assert.equal(evidence.architectureGatePassed, false);
  assert.equal(evidence.violationCount, 1);
});

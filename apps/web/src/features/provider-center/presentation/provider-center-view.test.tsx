import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const presentationFiles = ["./provider-center-view.tsx", "./provider-detail-view.tsx"];

async function source(): Promise<string> {
  return (
    await Promise.all(
      presentationFiles.map((path) =>
        readFile(fileURLToPath(new URL(path, import.meta.url)), "utf8"),
      ),
    )
  ).join("\n");
}

describe("Provider Center presentation contract", () => {
  it("renders list and detail scope with responsive capability surfaces", async () => {
    const content = await source();

    for (const label of [
      "Provider Center",
      "Provider List",
      "Provider Details",
      "Health Status",
      "Version",
      "Supported Capabilities",
      "Experimental Features",
      "Connection Status",
      "EXPERIMENTAL DISABLED",
      "No registered providers",
    ]) {
      expect(content).toContain(label);
    }
    expect(content).toContain('data-layout="provider-grid"');
    expect(content).toContain('data-layout="provider-detail"');
  });

  it("does not expose execution, provider selection, or secret vocabulary", async () => {
    const content = await source();

    expect(content).not.toMatch(
      /<select|<button|ProviderExecutor|\.execute\(|createHostingerProvider/i,
    );
    expect(content).not.toMatch(/credential|secret|token|password|connection string/i);
    expect(content).not.toContain("@paysave/infrastructure");
  });
});

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const presentationFiles = [
  "./infrastructure-dashboard-view.tsx",
  "./dashboard-overview.tsx",
  "./status-panels.tsx",
  "./capability-summary.tsx",
  "./infrastructure-dashboard-copy.ts",
  "./activity-alerts.tsx",
];

async function presentationSource(): Promise<string> {
  return (
    await Promise.all(
      presentationFiles.map((path) =>
        readFile(fileURLToPath(new URL(path, import.meta.url)), "utf8"),
      ),
    )
  ).join("\n");
}

describe("InfrastructureDashboardView", () => {
  it("renders every Stage 5.3A section and explicit capability availability", async () => {
    const source = await presentationSource();

    for (const heading of [
      "Dashboard Overview",
      "Provider Status",
      "Environment Status",
      "System Health",
      "Capability Summary",
      "Recent Activities",
      "Alerts &amp; Warnings",
    ]) {
      expect(source).toContain(heading);
    }
    expect(source).toContain("NOT SUPPORTED");
    expect(source).toContain("EXPERIMENTAL DISABLED");
    expect(source).toContain("No recent infrastructure activities");
    expect(source).toContain('data-layout="mobile-capability-list"');
    expect(source).toContain('data-layout="desktop-capability-table"');
  });

  it("does not expose direct provider controls or secret vocabulary", async () => {
    const source = await presentationSource();
    expect(source).not.toContain("@paysave/infrastructure");
    expect(source).not.toMatch(
      /<select|createHostingerProvider|\.execute\(|credential|secret|token|password/i,
    );
  });
});

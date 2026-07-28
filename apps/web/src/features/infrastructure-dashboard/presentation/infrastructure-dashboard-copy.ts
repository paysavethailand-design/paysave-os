export const infrastructureDashboardSections = Object.freeze([
  "Dashboard Overview",
  "Provider Status",
  "Environment Status",
  "System Health",
  "Capability Summary",
  "Recent Activities",
  "Alerts & Warnings",
] as const);

export const infrastructureCapabilityLabels = Object.freeze({
  available: "AVAILABLE",
  unsupported: "NOT SUPPORTED",
  experimental: "EXPERIMENTAL DISABLED",
});

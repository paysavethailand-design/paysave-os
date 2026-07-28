import { CAPABILITIES, type CapabilityDescriptor } from "../core/index";
import { ManifestInfrastructureProvider } from "../shared/manifest-infrastructure-provider";
import type { ProviderExecutor } from "../shared/provider-executor";

const DOCS = {
  database: "https://supabase.com/docs/guides/database/overview",
  auth: "https://supabase.com/docs/guides/auth",
  storage: "https://supabase.com/docs/guides/storage",
  functions: "https://supabase.com/docs/guides/functions",
  functionsManagement: "https://supabase.com/docs/reference/api/v1-list-all-functions",
  realtime: "https://supabase.com/docs/guides/realtime",
  backups: "https://supabase.com/docs/guides/platform/backups",
  metrics: "https://supabase.com/docs/guides/telemetry/metrics",
  logs: "https://supabase.com/docs/guides/telemetry/logs",
  health: "https://supabase.com/docs/reference/api/v1-get-services-health",
} as const;

export const SUPABASE_CAPABILITIES: readonly CapabilityDescriptor[] = [
  {
    id: CAPABILITIES.DATABASE_POSTGRESQL_QUERY,
    plane: "data",
    category: "database",
    status: "supported",
    access: "write",
    officialReferences: [DOCS.database],
  },
  {
    id: CAPABILITIES.AUTHENTICATION_SESSION_MANAGE,
    plane: "data",
    category: "authentication",
    status: "supported",
    access: "write",
    officialReferences: [DOCS.auth],
  },
  {
    id: CAPABILITIES.STORAGE_OBJECT_MANAGE,
    plane: "data",
    category: "storage",
    status: "supported",
    access: "write",
    officialReferences: [DOCS.storage],
  },
  {
    id: CAPABILITIES.EDGE_FUNCTION_INVOKE,
    plane: "data",
    category: "edge-function",
    status: "supported",
    access: "write",
    officialReferences: [DOCS.functions],
  },
  {
    id: CAPABILITIES.EDGE_FUNCTION_MANAGE,
    plane: "control",
    category: "edge-function",
    status: "supported",
    access: "write",
    officialReferences: [DOCS.functionsManagement],
  },
  {
    id: CAPABILITIES.REALTIME_CHANNEL_SUBSCRIBE,
    plane: "data",
    category: "realtime",
    status: "supported",
    access: "read",
    officialReferences: [DOCS.realtime],
  },
  {
    id: CAPABILITIES.DATABASE_BACKUP_READ,
    plane: "control",
    category: "backup",
    status: "partial",
    access: "read",
    officialReferences: [DOCS.backups],
    limitations: ["Availability and retention depend on plan and backup type."],
  },
  {
    id: CAPABILITIES.METRICS_PLATFORM_READ,
    plane: "control",
    category: "metrics",
    status: "partial",
    access: "read",
    officialReferences: [DOCS.metrics],
    limitations: [
      "The Metrics API is documented as beta and requires a server-side service role key.",
    ],
  },
  {
    id: CAPABILITIES.LOGS_PLATFORM_READ,
    plane: "control",
    category: "logs",
    status: "supported",
    access: "read",
    officialReferences: [DOCS.logs],
  },
  {
    id: CAPABILITIES.HEALTH_SERVICE_STATUS_READ,
    plane: "control",
    category: "health",
    status: "supported",
    access: "read",
    officialReferences: [DOCS.health],
  },
];

export function createSupabaseProvider(executor: ProviderExecutor): ManifestInfrastructureProvider {
  return new ManifestInfrastructureProvider("supabase", SUPABASE_CAPABILITIES, executor);
}

import type { ReadinessCheck } from "./readiness";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface DependencyOptions {
  readonly fetcher?: Fetcher;
  readonly timeoutMs?: number;
}

interface DependencyTarget {
  readonly name: "database_dependency" | "auth_dependency" | "storage_dependency";
  readonly path: string;
  readonly headers?: Readonly<Record<string, string>>;
}

const TARGETS: readonly DependencyTarget[] = [
  {
    name: "database_dependency",
    path: "/rest/v1/roles?select=id&limit=1",
    headers: { "Accept-Profile": "iam" },
  },
  { name: "auth_dependency", path: "/auth/v1/health" },
  { name: "storage_dependency", path: "/storage/v1/status" },
];

async function isExpectedDatabasePermissionDenial(
  target: DependencyTarget,
  response: Response,
): Promise<boolean> {
  if (
    target.name !== "database_dependency" ||
    (response.status !== 401 && response.status !== 403)
  ) {
    return false;
  }
  try {
    const payload = (await response.clone().json()) as { readonly code?: unknown };
    return payload.code === "42501";
  } catch {
    return false;
  }
}

async function probe(
  baseUrl: string,
  publicApiKey: string,
  target: DependencyTarget,
  fetcher: Fetcher,
  timeoutMs: number,
): Promise<ReadinessCheck> {
  try {
    const response = await fetcher(`${baseUrl}${target.path}`, {
      method: "GET",
      headers: { apikey: publicApiKey, accept: "application/json", ...target.headers },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const available = response.ok || (await isExpectedDatabasePermissionDenial(target, response));
    return available
      ? { name: target.name, ok: true }
      : { name: target.name, ok: false, detail: "dependency_unavailable" };
  } catch {
    return { name: target.name, ok: false, detail: "dependency_unavailable" };
  }
}

/** Non-mutating public-key probes for managed Staging dependencies; no service role is used. */
export async function checkSupabaseDependencies(
  environment: NodeJS.ProcessEnv = process.env,
  options: DependencyOptions = {},
): Promise<readonly ReadinessCheck[]> {
  const baseUrl = environment.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const publishableKey = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!baseUrl || !publishableKey) {
    return TARGETS.map((target) => ({
      name: target.name,
      ok: false,
      detail: "dependency_configuration_missing",
    }));
  }
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? 2_000;
  return Promise.all(
    TARGETS.map((target) => probe(baseUrl, publishableKey, target, fetcher, timeoutMs)),
  );
}

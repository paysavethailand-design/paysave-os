import { createClient } from "npm:@supabase/supabase-js@2.110.7";
import { Webhook } from "npm:standardwebhooks@1.0.0";
import { handleClaimsHook, type HookEvent, type HookAuditEvent } from "./handler.ts";
import { SupabaseClaimSource, type SupabaseClientLike } from "./supabase-source.ts";

function requiredEnvironment(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing_required_environment:${name}`);
  return value;
}

const supabase = createClient(
  requiredEnvironment("SUPABASE_URL"),
  requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-paysave-component": "paysave-claims-hook" } },
  },
);
const source = new SupabaseClaimSource(supabase as unknown as SupabaseClientLike);
const webhookSecret = requiredEnvironment("CUSTOM_ACCESS_TOKEN_SECRET").replace(/^v1,whsec_/, "");
const webhook = new Webhook(webhookSecret);

function audit(event: HookAuditEvent): void {
  console.info(
    JSON.stringify({
      type: "paysave_auth_audit",
      ...event,
      occurredAt: new Date().toISOString(),
    }),
  );
}

Deno.serve((request) =>
  handleClaimsHook(request, {
    source,
    audit,
    verify: async (payload, headers) => webhook.verify(payload, headers) as HookEvent,
  }),
);

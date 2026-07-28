import { z } from "zod";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url().startsWith("https://"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

const serverEnvironmentSchema = z.object({
  PAYSAVE_ENABLE_DESIGN_PREVIEW: z.enum(["true", "false"]).default("false"),
});

export interface PublicEnvironment {
  readonly appUrl: string;
  readonly supabaseUrl: string;
  readonly supabasePublishableKey: string;
}

export interface ServerEnvironment {
  readonly enableDesignPreview: boolean;
}

/** Validates and normalizes public Supabase environment variables. */
export function parsePublicEnvironment(input: unknown): PublicEnvironment {
  const environment = publicEnvironmentSchema.parse(input);

  return {
    appUrl: environment.NEXT_PUBLIC_APP_URL,
    supabaseUrl: environment.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

/** Returns validated public configuration without exposing server secrets. */
export function getPublicEnvironment(): PublicEnvironment {
  return parsePublicEnvironment({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

/** Validates server-only feature switches with fail-closed defaults. */
export function parseServerEnvironment(input: unknown): ServerEnvironment {
  const environment = serverEnvironmentSchema.parse(input);

  return {
    enableDesignPreview: environment.PAYSAVE_ENABLE_DESIGN_PREVIEW === "true",
  };
}

/** Returns validated server-only configuration without exposing it to clients. */
export function getServerEnvironment(): ServerEnvironment {
  return parseServerEnvironment({
    PAYSAVE_ENABLE_DESIGN_PREVIEW: process.env.PAYSAVE_ENABLE_DESIGN_PREVIEW,
  });
}

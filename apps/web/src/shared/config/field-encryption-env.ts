import { parseFieldEncryptionKey, type FieldEncryptionKey } from "@paysave/security/crypto";
import { z } from "zod";

const fieldEncryptionEnvironmentSchema = z.object({
  PAYSAVE_FIELD_ENCRYPTION_KEY: z.base64().length(44),
  PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION: z
    .string()
    .regex(/^\d+$/)
    .default("1")
    .transform((value) => Number.parseInt(value, 10)),
});

export interface FieldEncryptionEnvironment {
  readonly fieldEncryptionKey: FieldEncryptionKey;
}

/**
 * Deliberately **not** re-exported from `@/shared/config`'s index barrel: that barrel is imported
 * by `middleware.ts` (Next.js Edge runtime), and `@paysave/security/crypto` imports `node:crypto`,
 * which the Edge bundle cannot resolve even if the code path is never executed there. Only
 * Route Handler composition roots under each feature's `server.ts` file (Node.js runtime) should
 * import this file directly.
 */
export function parseFieldEncryptionEnvironment(input: unknown): FieldEncryptionEnvironment {
  const environment = fieldEncryptionEnvironmentSchema.parse(input);

  return {
    fieldEncryptionKey: parseFieldEncryptionKey(
      environment.PAYSAVE_FIELD_ENCRYPTION_KEY,
      environment.PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION,
    ),
  };
}

/** Returns the validated field-encryption key without exposing it to the Edge/middleware bundle. */
export function getFieldEncryptionEnvironment(): FieldEncryptionEnvironment {
  return parseFieldEncryptionEnvironment({
    PAYSAVE_FIELD_ENCRYPTION_KEY: process.env.PAYSAVE_FIELD_ENCRYPTION_KEY,
    PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION: process.env.PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION,
  });
}

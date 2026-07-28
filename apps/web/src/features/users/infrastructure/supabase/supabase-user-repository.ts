import type { FieldEncryptionKey } from "@paysave/security/crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UpdateUserInput } from "../../application/dto/user-schemas";
import type {
  ListUsersParams,
  NewUserRecord,
  UserRepository,
} from "../../application/ports/user-repository";
import type { User } from "../../domain/entities/user";
import { toInsertPayload, toUpdatePayload, toUser, userRowSchema } from "./user-row";

const SCHEMA = "iam";
const TABLE = "users";
const COLUMNS =
  "id, auth_subject, display_name_encrypted, status, last_seen_at, created_at, updated_at, display_name_key_version";

function assertNoError(error: { readonly message: string } | null, context: string): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

/** `iam.users` Repository Pattern implementation using the request-scoped, RLS-bound Supabase client. */
export class SupabaseUserRepository implements UserRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly encryptionKey: FieldEncryptionKey,
  ) {}

  async list(params: ListUsersParams): Promise<readonly User[]> {
    let query = this.client
      .schema(SCHEMA)
      .from(TABLE)
      .select(COLUMNS)
      .order("id", { ascending: true })
      .limit(params.limit + 1);

    if (params.cursor) {
      query = query.gt("id", params.cursor);
    }

    const { data, error } = await query;
    assertNoError(error, "Failed to list users");
    return ((data ?? []) as readonly unknown[]).map((row) =>
      toUser(userRowSchema.parse(row), this.encryptionKey),
    );
  }

  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle();
    assertNoError(error, "Failed to load user");
    return data ? toUser(userRowSchema.parse(data), this.encryptionKey) : null;
  }

  async findByAuthSubject(authSubject: string): Promise<User | null> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .select(COLUMNS)
      .eq("auth_subject", authSubject)
      .maybeSingle();
    assertNoError(error, "Failed to load user by auth subject");
    return data ? toUser(userRowSchema.parse(data), this.encryptionKey) : null;
  }

  async create(input: NewUserRecord): Promise<User> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .insert(toInsertPayload(input, this.encryptionKey))
      .select(COLUMNS)
      .single();
    assertNoError(error, "Failed to create user");
    return toUser(userRowSchema.parse(data), this.encryptionKey);
  }

  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .update(toUpdatePayload(input, this.encryptionKey))
      .eq("id", id)
      .select(COLUMNS)
      .maybeSingle();
    assertNoError(error, "Failed to update user");
    return data ? toUser(userRowSchema.parse(data), this.encryptionKey) : null;
  }
}

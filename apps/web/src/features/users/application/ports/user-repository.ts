import type { User } from "../../domain/entities/user";
import type { CreateUserInput, UpdateUserInput } from "../dto/user-schemas";

export interface ListUsersParams {
  readonly limit: number;
  readonly cursor: string | null;
}

/** `last_seen_at` has no database default; the Application layer decides its initial value via {@link Clock}. */
export interface NewUserRecord extends CreateUserInput {
  readonly lastSeenAt: string;
}

/** Repository Pattern port for `iam.users`; encryption/decryption of `display_name_encrypted` is an Infrastructure concern. */
export interface UserRepository {
  list(params: ListUsersParams): Promise<readonly User[]>;
  findById(id: string): Promise<User | null>;
  findByAuthSubject(authSubject: string): Promise<User | null>;
  create(input: NewUserRecord): Promise<User>;
  update(id: string, input: UpdateUserInput): Promise<User | null>;
}

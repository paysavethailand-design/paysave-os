import { ConsoleAuditSink } from "@paysave/observability";
import { databaseProvider } from "@/shared/providers/database/server";
import type { BoundedPage, BoundedPageRequest } from "@/shared/lib/pagination";
import { createUser } from "./application/commands/create-user";
import { deactivateUser } from "./application/commands/deactivate-user";
import { updateUser } from "./application/commands/update-user";
import type { RequestContext } from "./application/ports/request-context";
import { getUser } from "./application/queries/get-user";
import { listUsers } from "./application/queries/list-users";
import type { User } from "./domain/entities/user";
import type { UserRepository } from "./application/ports/user-repository";

const auditSink = new ConsoleAuditSink();
const clock = { now: () => new Date() };

async function repository(): Promise<UserRepository> {
  return databaseProvider().repositories.users();
}

/** Server-only public API composition root for the users feature. */
export async function listUsersUseCase(
  pageRequest: BoundedPageRequest,
): Promise<BoundedPage<User>> {
  return listUsers(pageRequest, await repository());
}

export async function getUserUseCase(userId: string): Promise<User> {
  return getUser(userId, await repository());
}

export async function createUserUseCase(rawInput: unknown, context: RequestContext): Promise<User> {
  return createUser(rawInput, context, { repository: await repository(), auditSink, clock });
}

export async function updateUserUseCase(
  userId: string,
  rawInput: unknown,
  context: RequestContext,
): Promise<User> {
  return updateUser(userId, rawInput, context, { repository: await repository(), auditSink });
}

export async function deactivateUserUseCase(
  userId: string,
  rawInput: unknown,
  context: RequestContext,
): Promise<User> {
  return deactivateUser(userId, rawInput, context, { repository: await repository(), auditSink });
}

export type { User } from "./domain/entities/user";
export { USER_STATUS, USERS_PERMISSIONS } from "./domain/user-codes";
export type { RequestContext } from "./application/ports/request-context";

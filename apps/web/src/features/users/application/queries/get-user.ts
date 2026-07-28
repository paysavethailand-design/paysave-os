import { ApiError } from "@/shared/lib/api-error";
import type { User } from "../../domain/entities/user";
import type { UserRepository } from "../ports/user-repository";

/** Returns a single user or throws a 404 ApiError. */
export async function getUser(userId: string, repository: UserRepository): Promise<User> {
  const user = await repository.findById(userId);
  if (!user) {
    throw new ApiError("not_found", `User not found: ${userId}`);
  }
  return user;
}

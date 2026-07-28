import { describe, expect, it } from "vitest";
import { databaseProvider } from "./server";

describe("databaseProvider", () => {
  it("returns one stable hybrid provider without opening a database connection", () => {
    const first = databaseProvider();
    const second = databaseProvider();

    expect(first).toBe(second);
    expect(first.kind).toBe("supabase-auth-postgres");
    expect(first.repositories).toBeDefined();
    expect(first.unitOfWork.recoveryWorkflow).toBeTypeOf("function");
  });
});

import { createAuthServerClient } from "@/features/auth/server";
import { SupabaseAssetRepository } from "@/features/assets/infrastructure/supabase/supabase-asset-repository";
import { SupabaseInventoryAnalyticsRepository } from "@/features/assets/infrastructure/supabase/supabase-inventory-analytics-repository";
import { SupabaseCustomerRepository } from "@/features/customers/infrastructure/supabase/supabase-customer-repository";
import { SupabasePartnerRepository } from "@/features/partners/infrastructure/supabase/supabase-partner-repository";
import { SupabasePermissionRepository } from "@/features/permissions/infrastructure/supabase/supabase-permission-repository";
import { PgOperationMvpRepository } from "@/features/recovery-core/infrastructure/postgres/pg-operation-mvp-repository";
import { PgWorkflowRuntimeRepository } from "@/features/recovery-core/infrastructure/postgres/pg-workflow-runtime-repository";
import { SupabaseRecoveryCoreRepository } from "@/features/recovery-core/infrastructure/supabase/supabase-recovery-core-repository";
import { SupabaseRolePermissionRepository } from "@/features/roles/infrastructure/supabase/supabase-role-permission-repository";
import { SupabaseRoleRepository } from "@/features/roles/infrastructure/supabase/supabase-role-repository";
import { SupabaseUserRepository } from "@/features/users/infrastructure/supabase/supabase-user-repository";
import { getFieldEncryptionEnvironment } from "@/shared/config/field-encryption-env";
import type { IDatabaseProvider, RepositoryRegistry } from "./contracts";

/** Builds request-scoped persistence adapters while retaining Supabase as the identity provider. */
const repositories: RepositoryRegistry = {
  async assets() {
    return new SupabaseAssetRepository(await createAuthServerClient());
  },
  async inventoryAnalytics() {
    return new SupabaseInventoryAnalyticsRepository(await createAuthServerClient());
  },
  async customers() {
    const client = await createAuthServerClient();
    const { fieldEncryptionKey } = getFieldEncryptionEnvironment();
    return new SupabaseCustomerRepository(client, fieldEncryptionKey);
  },
  async partners() {
    return new SupabasePartnerRepository(await createAuthServerClient());
  },
  async permissions() {
    return new SupabasePermissionRepository(await createAuthServerClient());
  },
  async recoveryCore() {
    return new SupabaseRecoveryCoreRepository(await createAuthServerClient());
  },
  async roles() {
    const client = await createAuthServerClient();
    return {
      roleRepository: new SupabaseRoleRepository(client),
      rolePermissionRepository: new SupabaseRolePermissionRepository(client),
    };
  },
  async users() {
    const client = await createAuthServerClient();
    const { fieldEncryptionKey } = getFieldEncryptionEnvironment();
    return new SupabaseUserRepository(client, fieldEncryptionKey);
  },
};

const provider: IDatabaseProvider = {
  kind: "supabase-auth-postgres",
  repositories,
  unitOfWork: {
    recoveryWorkflow() {
      return new PgWorkflowRuntimeRepository();
    },
    operationMvp() {
      return new PgOperationMvpRepository();
    },
  },
};

/** Returns the process-stable provider registry; no client or connection opens until first use. */
export function databaseProvider(): IDatabaseProvider {
  return provider;
}

export type {
  IDatabaseProvider,
  RepositoryRegistry,
  RoleRepositories,
  UnitOfWorkRegistry,
} from "./contracts";

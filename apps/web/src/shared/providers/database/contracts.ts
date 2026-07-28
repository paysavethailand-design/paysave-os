import type { AssetRepository } from "@/features/assets/application/ports/asset-repository";
import type { InventoryAnalyticsRepository } from "@/features/assets/application/ports/inventory-analytics-repository";
import type { CustomerRepository } from "@/features/customers/application/ports/customer-repository";
import type { PartnerRepository } from "@/features/partners/application/ports/partner-repository";
import type { PermissionRepository } from "@/features/permissions/application/ports/permission-repository";
import type { OperationMvpRepository } from "@/features/recovery-core/application/ports/operation-mvp-repository";
import type { RecoveryCoreRepository } from "@/features/recovery-core/application/ports/recovery-core-repository";
import type { WorkflowRuntimeRepository } from "@/features/recovery-core/application/ports/workflow-runtime-repository";
import type { RolePermissionRepository } from "@/features/roles/application/ports/role-permission-repository";
import type { RoleRepository } from "@/features/roles/application/ports/role-repository";
import type { UserRepository } from "@/features/users/application/ports/user-repository";

export interface RoleRepositories {
  readonly roleRepository: RoleRepository;
  readonly rolePermissionRepository: RolePermissionRepository;
}

/** Lazy repository factories keep request-scoped Auth/JWT clients out of feature composition roots. */
export interface RepositoryRegistry {
  assets(): Promise<AssetRepository>;
  inventoryAnalytics(): Promise<InventoryAnalyticsRepository>;
  customers(): Promise<CustomerRepository>;
  partners(): Promise<PartnerRepository>;
  permissions(): Promise<PermissionRepository>;
  recoveryCore(): Promise<RecoveryCoreRepository>;
  roles(): Promise<RoleRepositories>;
  users(): Promise<UserRepository>;
}

/** Atomic command boundaries exposed by the selected database provider. */
export interface UnitOfWorkRegistry {
  recoveryWorkflow(): WorkflowRuntimeRepository;
  operationMvp(): OperationMvpRepository;
}

/** Provider-neutral composition contract consumed by server-only feature entrypoints. */
export interface IDatabaseProvider {
  readonly kind: "supabase-auth-postgres";
  readonly repositories: RepositoryRegistry;
  readonly unitOfWork: UnitOfWorkRegistry;
}

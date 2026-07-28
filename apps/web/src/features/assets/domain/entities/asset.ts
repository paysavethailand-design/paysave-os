/**
 * `asset.assets` core lifecycle only. Asset Type CRUD, identifiers, ownership history, case links
 * and inspections are out of scope for Backend Sprint #1 — see the Sprint Report.
 */
export interface Asset {
  readonly id: string;
  readonly partnerId: string;
  readonly assetTypeId: string;
  readonly businessObjectId: string;
  readonly displayRef: string;
  readonly currentStatusCode: string;
  readonly currentOwnerCustomerId: string | null;
  readonly versionNo: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

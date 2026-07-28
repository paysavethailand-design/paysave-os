# Database Seeds

Stage 1 ไม่มี seed data

เมื่อได้รับอนุมัติ ให้ใช้ synthetic/deterministic data เท่านั้น ห้ามเก็บข้อมูลลูกค้า พนักงาน หรือ production identifier ใน repository

## Backend Sprint #1

- `0001_backend_sprint1_permission_catalog.sql`: idempotent `iam.permissions` reference rows for the
  permission codes the Sprint #1 API checks. Deterministic, non-production reference data only —
  no customer/employee data, no schema change, and no migration file was touched.

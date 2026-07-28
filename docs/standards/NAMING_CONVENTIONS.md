# Naming Conventions

## Files and folders

| Item                       | Convention             | Example                    | เหตุผล                        |
| -------------------------- | ---------------------- | -------------------------- | ----------------------------- |
| source/runtime folder/file | `kebab-case`           | `case-assignment.ts`       | consistent across macOS/Linux |
| React component file       | `kebab-case.tsx`       | `profile-menu.tsx`         | file path predictable         |
| test                       | `<subject>.test.ts(x)` | `navigation.test.ts`       | colocated discovery           |
| type declaration           | `kebab-case.ts`        | `auth-context.ts`          | same rule as source           |
| migration                  | `NNNN_description.sql` | `0003_case_core.sql`       | deterministic order           |
| ADR                        | `NNNN-title.md`        | `0001-modular-monolith.md` | immutable decision history    |

### Documentation exceptions

- Stable architecture, security and operating-standard documents may use `UPPER_SNAKE_CASE.md` เพื่อให้แยกจาก source artifact ชัดเจน เช่น `FOUNDATION_ARCHITECTURE.md`
- ADR และ implementation plan ยังคงใช้ prefix + `kebab-case`
- ชื่อมาตรฐานของ platform เช่น `README.md`, `LICENSE` และ `CHANGELOG.md` คงตาม ecosystem convention
- Legacy document ที่มีผู้ใช้อ้างอิงแล้วไม่ต้อง rename โดยไม่มี migration/link-check plan

## TypeScript symbols

| Symbol                              | Convention                 | Example                   |
| ----------------------------------- | -------------------------- | ------------------------- |
| component/class/type/interface/enum | `PascalCase`               | `AuthContext`, `CaseCard` |
| function/variable                   | `camelCase`                | `getAuthContext`          |
| boolean                             | `is/has/can/should` prefix | `hasPermission`           |
| constant                            | `camelCase` by default     | `defaultPageSize`         |
| true global invariant/env key       | `SCREAMING_SNAKE_CASE`     | `MAX_UPLOAD_BYTES`        |
| generic type                        | descriptive PascalCase     | `TResult`, `TContext`     |
| event                               | past tense                 | `CaseAssigned`            |
| command/use case                    | imperative verb            | `AssignCase`              |
| query                               | `Get/List/Search` prefix   | `ListAssignedCases`       |

## Database

- schema/table/column/index/constraint: `snake_case`
- table เป็น plural noun: `cases`, `case_assignments`
- primary key: `id`; foreign key: `<entity>_id`
- timestamps: `created_at`, `updated_at`, optional `deleted_at`
- boolean: `is_`/`has_` prefix
- index: `idx_<table>__<columns>`
- unique constraint: `uq_<table>__<columns>`
- foreign key: `fk_<table>__<column>__<target>`
- check constraint: `ck_<table>__<rule>`

## Routes and environment

- URL segment: plural `kebab-case`, เช่น `/case-assignments`
- Dynamic param: descriptive camelCase, เช่น `[caseId]`
- Search params: camelCase เมื่อ app เป็นผู้ควบคุม contract
- Environment variables: `SCREAMING_SNAKE_CASE`; browser-safe ต้องขึ้นต้น `NEXT_PUBLIC_`

## Prohibited vague names

หลีกเลี่ยง `data`, `info`, `item`, `temp`, `misc`, `helper`, `manager`, `service` หากไม่มีบริบทที่ทำให้ owner/intent ชัดเจน

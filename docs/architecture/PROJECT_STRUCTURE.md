# Project Folder Structure

## Source of truth

โครงสร้างจริงและ dependency graph อยู่ที่ `ARCHITECTURE_TREE.md` เอกสารนี้กำหนด ownership ระดับ root เท่านั้น

```text
paysave-os/
├── apps/                 # Deployable applications
├── packages/             # Versioned shared boundaries with public APIs
├── database/             # Migration/test/seed lifecycle
├── config/               # Tool-neutral repository configuration
├── docs/                 # Architecture, standards, ADRs and plans
├── scripts/              # Deterministic repository automation
└── docker/               # Local/CI infrastructure definitions
```

## Ownership rules

- `apps/web/src/app`: Next.js route composition เท่านั้น; import Feature ผ่าน public entrypoint
- `apps/web/src/features`: Feature-first ownership; private layer ห้ามถูก deep import จากภายนอก
- `apps/web/src/shared`: Web-only building blocks ที่ไม่มี business semantics
- `packages/ui`: เจ้าของ Shared Components และ `components.json` ของ shadcn
- `packages/security`: framework-independent security primitives
- Reserved package ต้องมี README contract และยังไม่เปิด runtime จนกว่าจะอนุมัติ

## Removed ambiguity

ลบ empty/unowned folders `packages/application`, `packages/data-access`, `packages/domain` แล้ว เพราะ layer เหล่านี้ต้องอยู่ภายใน Feature ไม่ใช่เป็น global package ที่ไม่มี owner

## Forbidden catch-all folders

- global `src/components` ที่ปน feature UI
- global `src/services` ที่รวม integration ทุก owner
- global `src/types` ที่รวม domain type ทุก feature
- `src/utils` ที่ไม่มี ownership rule
- feature/package deep import

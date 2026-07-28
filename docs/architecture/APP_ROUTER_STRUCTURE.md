# Next.js App Router Structure

## Current route tree

```text
src/app/
├── layout.tsx                        # Root HTML, global providers, metadata
├── globals.css
├── page.tsx                          # Authenticated dashboard composition
├── unauthorized/page.tsx
├── (auth)/
│   ├── sign-in/page.tsx
│   └── preview/layout/page.tsx       # Stage 1 design preview only
└── auth/
    └── callback/route.ts             # Existing authentication callback
```

Business route groups such as `(workspace)/cases`, customers, payments, reports and settings remain uncreated until their module blueprint is approved. Operational API/webhook routes are also not scaffolded in Stage 1.

## Rules

1. ใช้ `(auth)` สำหรับเส้นทางยืนยันตัวตนปัจจุบัน; เพิ่ม `(workspace)` เมื่อ Blueprint ของ Business Module ได้รับอนุมัติ โดย Route Group ไม่เปลี่ยน URL
2. `page.tsx` ต้องบาง: parse route input → authorize → call Feature Public API → render
3. Route import Feature ได้เฉพาะ `@/features/<name>`, `@/features/<name>/server` หรือ `@/features/<name>/actions`
4. Dynamic param ใช้ชื่อชัด เช่น `[caseId]` ไม่ใช้ `[id]` เมื่อ route ซ้อนกัน
5. `loading.tsx` และ `error.tsx` วางระดับที่ต้อง isolate failure จริง ไม่สร้างทุก folder
6. Route Handler ไม่ใช้แทน internal service layer
7. Webhook ต้อง verify signature, idempotency และ replay protection ก่อน parse business payload
8. ไม่ import service-role client ใน Client Component
9. Default เป็น Server Component; Client Component ต้องมีเหตุผลด้าน interaction/browser API

## Data mutation

- Server Action: form/mutation ภายใน web app
- Route Handler: external caller หรือ protocol-specific response
- ทุก mutation: schema validation, server authorization, tenant scope, audit context

## Caching

ทุก query ต้องเลือกอย่างชัดเจน:

- `no-store` สำหรับข้อมูลสิทธิ์/session/ข้อมูลสดที่ sensitive
- tagged revalidation สำหรับข้อมูลอ่านซ้ำที่ยอมรับความล่าช้าได้
- ห้ามพึ่ง default cache โดยไม่บันทึกเหตุผลใน code review

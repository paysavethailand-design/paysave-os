# PAYSAVE OS — Stage 1 Foundation Architecture

**สถานะ:** Accepted — Architecture Gate Approved 2026-07-20  
**วันที่:** 2026-07-20  
**ขอบเขต:** โครงสร้างและมาตรฐานเท่านั้น ไม่เพิ่ม Business Logic

## 1. เป้าหมาย

PAYSAVE OS ใช้ **Modular Monolith ใน TypeScript Monorepo** เพื่อให้เริ่มพัฒนาเร็วแบบระบบเดียว แต่แยกขอบเขตแต่ละ Domain ชัดเจนพอที่จะทดสอบ เปลี่ยนทีม หรือแยก Service ในอนาคตได้โดยไม่ผูกกันตั้งแต่ต้น

หลักสำคัญ:

1. **App Router เป็น Delivery Layer** — Route มีหน้าที่ประกอบหน้า อ่าน Params และเรียก Use Case เท่านั้น
2. **Feature เป็นเจ้าของ Business Capability** — โค้ดของ Cases, Customers หรือ Payments ไม่กระจายตามโฟลเดอร์เทคนิคระดับแอป
3. **Dependency ชี้เข้าด้านใน** — Presentation → Application → Domain; Infrastructure implement Port ของ Application
4. **Shared Package ต้องมีเหตุผลจริง** — ไม่ย้ายโค้ดไป Shared เพียงเพราะถูกใช้สองครั้ง
5. **Security และ Tenant Scope เป็น Boundary** — ตรวจสิทธิ์ฝั่ง Server ทุกครั้ง; Sidebar เป็น UX ไม่ใช่ Security Control
6. **Database Changes เป็น Migration-only** — ไม่มีการแก้ Schema ด้วย Dashboard แบบไร้ประวัติ

## 2. Architecture style

```text
Browser
  → Next.js App Router (routing/composition)
    → Feature Presentation (React/RSC/Server Actions)
      → Feature Application (use cases/ports)
        → Feature Domain (entities/value objects/policies)
      ← Feature Infrastructure (Supabase/PostgreSQL adapters)
    → Shared Packages (UI, security, contracts, observability)
```

### เหตุผลที่เลือก Modular Monolith

- Stage 1 ยังไม่ต้องแบกรับ operational complexity ของ Microservices
- Transaction และ Authorization ตรวจสอบง่ายกว่าเมื่ออยู่ใน deployment เดียว
- Feature boundary เตรียมทางแยก service ภายหลังโดยไม่ออกแบบ distributed system ล่วงหน้า
- เหมาะกับทีมที่ต้องการความเร็ว แต่ยังรักษา ownership และ auditability

## 3. Dependency rules

| Layer            | ใช้ได้                         | ห้ามใช้โดยตรง                | เหตุผล                                          |
| ---------------- | ------------------------------ | ---------------------------- | ----------------------------------------------- |
| `domain`         | TypeScript มาตรฐาน             | React, Next.js, Supabase     | Domain ต้องทดสอบได้โดยไม่พึ่ง Framework         |
| `application`    | Domain, ports, contracts       | UI, concrete Supabase client | Use case ไม่ผูกผู้ให้บริการ                     |
| `infrastructure` | Application ports, SDK         | Presentation                 | Adapter ไม่ควรรู้จักหน้าจอ                      |
| `presentation`   | Application API, `@paysave/ui` | SQL, service-role key        | UI ไม่ข้าม Boundary ไป Data Source              |
| `app`            | Feature public API             | Feature internals            | Route เป็น Composition Root ไม่ใช่ที่เก็บ Logic |

Feature-to-feature ห้าม import internal path โดยตรง หากต้องสื่อสารให้ใช้ public contract, application service ที่เปิดเผย หรือ event contract ที่อนุมัติแล้ว

## 4. Data and security boundaries

- Browser ใช้เฉพาะ `NEXT_PUBLIC_SUPABASE_URL` และ publishable key
- Service-role key และ `DATABASE_URL` เป็น server-only และห้าม import เข้า Client Component
- RLS เป็นแนวป้องกันข้อมูลหลักใน PostgreSQL; application guard เป็นชั้นเสริม
- ทุกข้อมูล tenant-scoped ต้องมี tenant/partner context ที่ผ่านการตรวจจาก Server
- Mutation สำคัญต้องมี actor, timestamp, correlation ID และ audit event ใน Stage ที่ได้รับอนุมัติ
- ไม่มี SQL/DDL ใหม่ในเอกสาร Foundation ชุดนี้

## 5. Rendering policy

- ใช้ **React Server Component เป็นค่าเริ่มต้น** เพื่อลด Client JavaScript
- เพิ่ม `"use client"` เฉพาะ interaction, browser API หรือ third-party client hook
- Server Action ใช้สำหรับ mutation ที่ผูกกับหน้าและต้อง validate input ใหม่ฝั่ง Server
- Route Handler ใช้เฉพาะ integration boundary, webhook, file response หรือ API ที่มีผู้ใช้ภายนอก
- การอ่านข้อมูลหลักเกิดบน Server และ cache policy ต้องระบุชัดต่อ query

## 6. Testing strategy

- Domain/Application: unit test แบบเร็ว ไม่มี network
- Infrastructure: integration test กับ disposable Supabase/PostgreSQL
- Presentation: component/accessibility test เฉพาะ interaction สำคัญ
- App Router: route authorization และ smoke test
- Migration: parse, apply บน DB เปล่า, แล้ว run integrity tests
- Architecture: `npm run architecture:check` ตรวจ public API, dependency direction, shared folders และ forbidden deep import แบบ fail-closed

## 7. Approval gates

หลังอนุมัติ Stage 1 จึงเริ่ม Stage ถัดไปตามลำดับ:

1. ยืนยัน Domain Map และ Module Ownership
2. อนุมัติ Database Blueprint/DDL แยกต่างหาก
3. สร้าง Feature แรกด้วย TDD และ Server-side Authorization
4. เชื่อม Supabase เฉพาะ Adapter ของ Feature นั้น

เอกสารอ้างอิง:

- `ARCHITECTURE_TREE.md`
- `PROJECT_STRUCTURE.md`
- `FEATURE_STRUCTURE.md`
- `APP_ROUTER_STRUCTURE.md`
- `SHARED_PACKAGES.md`
- `../security/ENVIRONMENT_VARIABLES.md`
- `../standards/CODING_STANDARDS.md`
- `../standards/NAMING_CONVENTIONS.md`

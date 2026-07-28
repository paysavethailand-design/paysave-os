# Coding Standards

## TypeScript

- เปิด `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- หลีกเลี่ยง `any`; ใช้ `unknown` แล้ว narrow ด้วย schema/type guard
- Export type ด้วย `export type`; import type ด้วย `import type`
- Public function/component ต้องมี return type เมื่อ inference ไม่อธิบาย contract ชัด
- ไม่มี non-null assertion (`!`) โดยไม่มี invariant ที่พิสูจน์ได้
- Validate input ที่ trust boundary ด้วย Zod หรือ schema ที่อนุมัติ

## React / Next.js

- Server Component เป็น default
- `"use client"` เฉพาะ component ที่ต้องมี state/effect/browser API
- Component ทำหน้าที่เดียว; data shaping ไป view-model/application layer
- ห้าม fetch database ใน shared UI component
- ใช้ Server Action/Route Handler โดย validate และ authorize ฝั่ง Server ทุกครั้ง
- ใช้ semantic HTML, keyboard navigation, visible focus และ WCAG AA

## Feature boundaries

- Route import ผ่าน Feature public API
- Domain ไม่มี Framework import
- Repository interface อยู่ Application; implementation อยู่ Infrastructure
- ห้าม circular dependency และ feature-to-feature deep import
- Shared utility ต้องมีชื่อที่บอก intent; ห้ามสร้าง `helpers.ts` ขนาดใหญ่

## Error handling

- แยก expected domain/application error ออกจาก unexpected infrastructure error
- ข้อความผู้ใช้ไม่เปิดเผย stack, SQL, token หรือข้อมูลภายใน
- Log ใช้ structured object + correlation ID; ห้าม log secret/PII โดยไม่ mask
- Catch error เฉพาะเมื่อ recover, translate หรือเพิ่ม context ได้

## Tests

- TDD สำหรับ policy, parser, state transition และ permission behavior
- Test ชื่ออธิบาย behavior ไม่ผูก implementation
- Unit test ไม่มี network/time dependency; inject clock/id generator เมื่อจำเป็น
- Integration test ใช้ disposable resource และ cleanup deterministic
- Regression gate: lint → typecheck → test → build → dependency audit

## Comments and documentation

- Comment อธิบาย **เหตุผล/ข้อจำกัด** ไม่ทวน syntax
- Public function ที่มี policy หรือ side effect ต้องมี JSDoc สั้น
- Decision ที่กระทบหลาย module บันทึก ADR
- TODO ต้องมี owner หรือ issue reference; ห้ามทิ้ง TODO ไม่มีกำหนด

## Definition of Done

- ผ่าน acceptance criteria และ boundary rules
- มี tests ตามความเสี่ยง
- ไม่มี secret/hardcoded production identifier
- lint/typecheck/test/build/audit ผ่าน
- docs/env/example อัปเดตเมื่อ contract เปลี่ยน
- migration มี rollback/forward-fix plan และผ่าน disposable DB เมื่อมี DB change

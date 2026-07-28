# ADR-0001: Modular Monolith in a TypeScript Monorepo

- **Status:** Accepted
- **Approved:** 2026-07-20 — Architecture Gate Approved
- **Decision owners:** PAYSAVE OS Architecture

## Context

PAYSAVE OS ต้องรองรับหลาย business capability และทีมพัฒนาในอนาคต แต่ Stage 1 ยังไม่ควรรับ operational complexity ของ distributed transactions, service discovery, duplicated authorization และ cross-service observability

## Proposed decision

ใช้ npm workspaces monorepo โดยมี Next.js application เป็น deployable unit หลัก และแยก capability เป็น feature boundary แบบ Domain/Application/Infrastructure/Presentation

Shared package เปิดเมื่อมี stable cross-boundary contract เท่านั้น PostgreSQL schema เปลี่ยนผ่าน versioned migrations ที่ review แยกจาก application code

## Consequences

### Positive

- พัฒนาและ deploy ง่ายในระยะแรก
- Transaction, RLS และ audit boundary ตรวจสอบในระบบเดียว
- Feature ownership และ dependency direction ชัดเจน
- สามารถแยก service ภายหลังจาก contract ที่พิสูจน์แล้ว

### Trade-offs

- ต้องมี automated boundary checks เพื่อป้องกัน monolith กลายเป็น coupled codebase
- Deployment ยัง scale เป็นหน่วยเดียวจนกว่าจะมีเหตุผลแยก service
- Shared package ต้องมี owner และ version discipline

## Rejected alternatives

- **Microservices from Stage 1:** ความซับซ้อนสูงเกิน requirement ที่ได้รับอนุมัติ
- **Single flat Next.js `lib/components/services` structure:** เริ่มง่ายแต่ ownership และ dependency จะเสื่อมเมื่อระบบโต
- **Separate repository per module:** ทำให้ refactor contract และ atomic change ยากก่อน boundary มีเสถียรภาพ

## Approval condition

เปลี่ยนสถานะเป็น `Accepted` หลังผู้อนุมัติยืนยัน Architecture, Feature Map และ Shared Package Boundaries ในเอกสาร Stage 1

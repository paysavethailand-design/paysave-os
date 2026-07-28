# Feature Structure

## Canonical feature

```text
features/<feature-name>/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── policies/
│   ├── events/
│   └── types/
├── application/
│   ├── commands/
│   ├── queries/
│   ├── ports/
│   ├── dto/
│   └── services/
├── infrastructure/
│   ├── repositories/
│   ├── services/
│   ├── supabase/
│   └── mappers/
├── presentation/
│   ├── components/
│   ├── forms/
│   ├── hooks/
│   ├── server/
│   └── view-models/
├── index.ts                         # Browser-safe/default public API
├── server.ts                        # Optional server-only public API
└── actions.ts                       # Optional Server Action public API
```

สร้าง subfolder เมื่อมี artifact หรือ README contract จริงเท่านั้น; ห้ามใช้ empty folder เป็นหลักฐานว่า architecture เสร็จ

## Dependency direction

```text
presentation ─→ application ─→ domain
infrastructure ─→ application ─→ domain
app route ─→ index.ts | server.ts | actions.ts
feature A ─→ feature B public entrypoint
```

- `domain`: TypeScript บริสุทธิ์ ไม่มี React/Next/Supabase
- `application`: orchestration/ports; ห้าม import concrete infrastructure
- `infrastructure`: implementation ของ port และ provider SDK
- `presentation/server`: Next.js-specific guards/composition ที่เรียก application/infrastructure ได้
- `services`: ต้องมี owner ชัด; business services อยู่ feature-local
- `types`: domain type อยู่ใน feature; cross-boundary DTO อยู่ `@paysave/contracts`

## Public API rule

ภายนอก Feature ห้าม import `domain/`, `application/`, `infrastructure/` หรือ `presentation/` โดยตรง ทุก Feature ต้องมี `index.ts`; `server.ts` และ `actions.ts` เพิ่มเฉพาะเมื่อ runtime boundary ต้องแยก

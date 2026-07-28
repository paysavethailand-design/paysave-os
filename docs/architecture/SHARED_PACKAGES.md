# Shared Layer and Package Structure

## Web shared layer

```text
apps/web/src/shared/
├── config/       # Typed runtime configuration + public index
├── hooks/        # Generic web hooks only
├── lib/          # Pure web helpers only
├── providers/    # App-level React providers + public index
├── services/     # Shared platform adapters only
├── types/        # Framework-wide web types only
└── README.md
```

Shared layer ห้ามมี business rule, feature copy, repository implementation หรือ service-role credential

## Shared packages

| Package                  | Owner                  | Allowed                                       | Forbidden                   |
| ------------------------ | ---------------------- | --------------------------------------------- | --------------------------- |
| `@paysave/ui`            | Design System          | shadcn primitives, tokens, generic UI hooks   | business copy/data fetching |
| `@paysave/security`      | Security primitives    | auth context, permission types, pure policies | UI/provider admin client    |
| `@paysave/contracts`     | Cross-boundary schemas | DTO/event schemas/versioning                  | repository implementation   |
| `@paysave/database`      | DB boundary            | generated types/server client contract        | UI/service role in browser  |
| `@paysave/observability` | Telemetry              | logger/correlation contracts                  | business decisions          |
| `@paysave/testing`       | Test support           | builders/fixtures/setup                       | production side effects     |
| `@paysave/config`        | Tool config            | TS/ESLint/Prettier presets                    | runtime feature code        |

Reserved packages มี README contract แต่ไม่มี runtime implementation จนกว่าจะอนุมัติ

## Import rules

```ts
// Allowed
import { Button } from "@paysave/ui";
import { hasPermission } from "@paysave/security";

// Forbidden
import { Button } from "../../../../packages/ui/src/components/button";
import { privateRepository } from "@/features/cases/infrastructure/private-repository";
```

Package public API เปิดผ่าน `exports` และ `src/index.ts`; automated architecture check ป้องกัน deep import

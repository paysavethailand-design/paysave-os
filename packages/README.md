# packages

Reusable workspace boundaries shared by deployable applications. Runtime packages expose a public API; reserved packages contain only an ownership contract until separately approved.

## Active runtime packages

- `security/` — framework-independent authorization, permission and verified auth-context primitives.
- `ui/` — reusable PAYSAVE design primitives, tokens and shadcn configuration.

## Reserved boundaries

- `contracts/` — cross-feature API/event DTO schemas and versioning rules.
- `database/` — generated database types and server-side persistence contracts.
- `config/` — shared TypeScript, ESLint and formatting presets.
- `observability/` — logging, metrics, tracing and correlation contracts.
- `testing/` — shared test builders, fixtures and setup.

`domain`, `application` and `infrastructure` are feature-owned layers under `apps/web/src/features/<feature>/`; they are intentionally not horizontal root packages. Direct imports into `packages/*/src/*` are forbidden—consumers use each package public API.

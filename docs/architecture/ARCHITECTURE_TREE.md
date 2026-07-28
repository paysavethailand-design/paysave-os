# PAYSAVE OS Architecture Tree

**Status:** Accepted — Architecture Gate Approved 2026-07-20  
**Scope:** Folder/import/dependency/public API/shared layer/feature boundary only  
**Out of scope:** Business Logic, UI changes, API additions

## Current architecture tree

```text
paysave-os/
├── apps/
│   └── web/
│       ├── public/                      # Static assets; never secrets or PII
│       │   ├── fonts/
│       │   ├── icons/
│       │   ├── images/
│       │   └── locales/
│       ├── src/
│       │   ├── app/                         # Next.js composition roots only
│       │   │   ├── (auth)/
│       │   │   │   ├── preview/layout/page.tsx
│       │   │   │   └── sign-in/page.tsx
│       │   │   ├── auth/callback/route.ts
│       │   │   ├── unauthorized/page.tsx
│       │   │   ├── globals.css
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx
│       │   ├── features/                    # Feature-first modules
│       │   │   ├── app-shell/
│       │   │   │   ├── domain/
│       │   │   │   │   ├── breadcrumbs.ts
│       │   │   │   │   └── navigation.ts
│       │   │   │   ├── presentation/
│       │   │   │   └── index.ts             # Feature public API
│       │   │   └── auth/
│       │   │       ├── domain/
│       │   │       │   └── types/README.md
│       │   │       ├── application/
│       │   │       │   ├── services/README.md
│       │   │       │   ├── route-authorization.ts
│       │   │       │   └── session-navigation.ts
│       │   │       ├── infrastructure/
│       │   │       │   ├── services/README.md
│       │   │       │   └── supabase/
│       │   │       │       ├── browser-client.ts
│       │   │       │       ├── get-auth-context.ts
│       │   │       │       ├── server-client.ts
│       │   │       │       └── update-session.ts
│       │   │       ├── presentation/
│       │   │       │   ├── server/
│       │   │       │   │   ├── require-auth.ts
│       │   │       │   │   └── require-permission.ts
│       │   │       │   ├── sign-in-actions.ts
│       │   │       │   ├── sign-in-form.tsx
│       │   │       │   └── sign-in-schema.ts
│       │   │       ├── index.ts              # Browser-safe public API
│       │   │       ├── server.ts             # Server-only public API
│       │   │       └── actions.ts            # Server Action public API
│       │   ├── shared/                       # Web-only, no business semantics
│       │   │   ├── config/
│       │   │   │   ├── env.ts
│       │   │   │   └── index.ts
│       │   │   ├── hooks/README.md
│       │   │   ├── lib/README.md
│       │   │   ├── providers/
│       │   │   │   ├── theme-provider.tsx
│       │   │   │   └── index.ts
│       │   │   ├── services/README.md
│       │   │   ├── types/README.md
│       │   │   └── README.md
│       │   └── middleware.ts
│       ├── .env.example
│       ├── next.config.ts
│       ├── postcss.config.mjs
│       └── tsconfig.json
├── packages/
│   ├── ui/
│   │   ├── components.json                  # shadcn owner config
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/README.md
│   │   │   ├── hooks/index.ts
│   │   │   ├── lib/cn.ts
│   │   │   ├── styles/
│   │   │   └── index.ts                    # Package public API
│   │   └── tests/
│   ├── security/
│   │   ├── src/
│   │   │   ├── auth-context.ts
│   │   │   ├── authorization.ts
│   │   │   └── index.ts                    # Package public API
│   │   └── tests/
│   ├── contracts/README.md                  # Reserved boundary
│   ├── database/README.md                   # Reserved boundary
│   ├── observability/README.md              # Reserved boundary
│   ├── testing/README.md                    # Reserved boundary
│   └── config/README.md                     # Reserved boundary
├── database/
│   ├── migrations/
│   ├── tests/
│   ├── seeds/
│   └── README.md
├── config/
│   ├── tailwind/
│   ├── eslint/
│   ├── prettier/
│   ├── typescript/
│   └── environments/
├── scripts/
│   ├── check-architecture.mjs
│   ├── check-architecture.test.mjs
│   └── README.md
├── docs/
│   ├── architecture/
│   ├── adr/
│   ├── security/
│   ├── standards/
│   └── plans/
├── docker/
├── package.json
├── prettier.config.mjs
└── tsconfig.base.json
```

## Enforced dependency graph

```text
app ───────────────→ feature public entrypoint
feature A ─────────→ feature B public entrypoint only
presentation ──────→ application ──────→ domain
infrastructure ────→ application/domain
feature/shared ────→ package public API

Forbidden:
application ─X→ infrastructure
app ─X→ feature private folder
feature A ─X→ feature B private folder
consumer ─X→ packages/*/src/*
```

## Public entrypoint policy

- `index.ts`: browser-safe/default feature API.
- `server.ts`: server-only composition API.
- `actions.ts`: Server Action API intended for other boundaries.
- Package consumers import from `@paysave/ui` or `@paysave/security`; direct `packages/*/src/*` imports are forbidden.
- Internal files may use relative imports inside their owning feature.

## Shared layer policy

- `components`: reusable design primitives are owned by `@paysave/ui`; no duplicate app-level component dump.
- `hooks`: generic UI/web hooks only; feature hooks remain feature-local.
- `lib`: pure helpers only; no data access or business vocabulary.
- `services`: shared platform adapters only; business services remain feature-owned.
- `types`: framework-wide web types only; domain types remain feature-owned and cross-boundary DTOs go to `@paysave/contracts`.
- `config`: typed environment/tool configuration only.

## Review remediation: 10 changes and reasons

1. **Removed `packages/application`, `packages/data-access`, `packages/domain`:** horizontal global layers had no owner and encouraged unrelated features to couple through generic packages.
2. **Added `index.ts` to every feature:** consumers now have a stable public contract instead of knowing private folder layout.
3. **Changed App Router imports to feature entrypoints:** routes remain composition roots and cannot couple to presentation/application/infrastructure details.
4. **Moved Supabase-backed auth context into `infrastructure/supabase`:** concrete provider access no longer points outward from the application layer.
5. **Moved Next.js redirect guards into `presentation/server`:** redirect behavior is delivery-framework composition, not framework-independent application policy.
6. **Added `auth/server.ts` and `auth/actions.ts`:** browser, server and Server Action exports are explicit and do not mix runtime boundaries accidentally.
7. **Changed app-shell → auth import to `auth/actions`:** cross-feature collaboration now crosses a declared public boundary.
8. **Created governed `shared/{config,hooks,lib,providers,services,types}` boundaries:** requested shared folders exist with narrow ownership rules instead of becoming catch-all directories.
9. **Made `packages/ui/components.json` the documented shadcn source of truth and created its hooks path:** CLI aliases now resolve to real package-owned paths without duplicating shared components in the web app.
10. **Added `scripts/check-architecture.mjs` with failing-first tests:** CI can fail closed on missing feature APIs, forbidden deep imports, reversed dependencies, missing shared folders and unowned horizontal packages.

All changes in this remediation are structural, import-only, documentation or repository tooling. No Business Logic, visual UI behavior or API surface was added.

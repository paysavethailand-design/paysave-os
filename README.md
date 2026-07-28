# PAYSAVE OS

Enterprise operations platform built as a TypeScript monorepo.

## Stage status

- **Stage 1 — Foundation:** architecture, boundaries, tooling, UI foundation and project conventions.
- **Business modules:** require explicit approval before implementation.
- **Database:** PostgreSQL/Supabase migrations stay separate from application code and require migration review.

## Technology

Next.js 15 · React 19 · TypeScript · Tailwind CSS · shadcn/ui · Supabase · PostgreSQL

## Workspace

```text
apps/web        Next.js delivery application
packages/ui     Shared design system
packages/security  Authentication/authorization contracts
packages/*      Reserved shared capabilities documented for later approval
database        Versioned migrations and database verification
docs            Architecture, security, standards and plans
config          Tool-neutral shared configuration artifacts
scripts         Repository automation only
docker          Local/CI infrastructure definitions only
```

## Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run format:check
```

Read `docs/architecture/FOUNDATION_ARCHITECTURE.md` before adding a module.

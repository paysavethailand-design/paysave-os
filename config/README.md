# config

Shared, non-secret configuration for the monorepo.

- `eslint/` — linting standards.
- `typescript/` — strict TypeScript base configurations.
- `tailwind/` — shared Tailwind design configuration.
- `prettier/` — formatting standards.
- `environments/` — environment variable contracts and safe templates only.

Runtime secrets must be stored in approved Vercel/Supabase secret stores, never committed here.

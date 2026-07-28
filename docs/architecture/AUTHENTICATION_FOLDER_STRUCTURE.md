# PAYSAVE Authentication Folder Structure

```text
features/auth/
├── domain/
│   └── types/README.md
├── application/
│   ├── services/README.md
│   ├── route-authorization.ts
│   └── session-navigation.ts
├── infrastructure/
│   ├── services/README.md
│   └── supabase/
│       ├── browser-client.ts
│       ├── get-auth-context.ts
│       ├── server-client.ts
│       └── update-session.ts
├── presentation/
│   ├── server/
│   │   ├── require-auth.ts
│   │   └── require-permission.ts
│   ├── sign-in-actions.ts
│   ├── sign-in-form.tsx
│   └── sign-in-schema.ts
├── index.ts
├── server.ts
└── actions.ts
```

## Boundary reasons

- Pure route/session policies remain in `application`.
- Supabase-backed session lookup moved to `infrastructure`.
- Next.js redirect guards moved to `presentation/server` because they depend on delivery framework behavior.
- External consumers use `index.ts`, `server.ts`, or `actions.ts`; private layer imports are forbidden.
- This change moves existing files only and does not alter authentication business behavior.

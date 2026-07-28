# ADR-0003: Use Local PostgreSQL on the Development Mac Before Supabase

- **Status:** Accepted
- **Date:** 2026-07-22
- **Decision owner:** BB

## Context

Backend Sprint #1 was implemented against approved PostgreSQL migrations M001–M016, while its current runtime adapters still use Supabase Auth and Supabase/PostgREST clients. BB does not want to provision or use Supabase at this stage and wants the current Mac to host the database.

Local port `5432` is already occupied by an SSH tunnel. Docker Desktop and the `postgres:17-alpine` image are available on the Mac.

## Decision

Use PostgreSQL 17 in an isolated Docker container on this Mac for the current development and database-integration phase.

- Container: `paysave-local-postgres`
- Database: `paysave_local`
- Host binding: `127.0.0.1:55432`
- Persistent volume: `paysave_local_pg17`
- Credentials: generated locally in `.env.local-db`, mode `600`, ignored by source control
- Schema: approved migrations M001–M016 only
- Seed: Backend Sprint #1 permission catalog only
- Supabase: not provisioned or used for this database phase

## Security constraints

- Do not expose or forward port `55432` to the internet.
- Do not put database credentials in source code, Markdown, chat, or client-side environment variables.
- Do not import Production data or credentials.
- Do not use the owner credential as the future application credential.
- Create a least-privilege application role only when the Direct PostgreSQL Adapter is designed and reviewed.

## Verification evidence

The local instance was created and exercised on PostgreSQL 17.10:

- M001–M016 clean apply: PASS
- M001–M016 replay: PASS
- Container restart and persistent-volume verification: PASS
- Approved logical-root tables represented by M001–M016: 114
- RLS policies: 342
- `pgcrypto`: installed
- Backend Sprint #1 permission catalog: 12 entries
- Container health: healthy
- Effective host binding: `127.0.0.1:55432`

The 114-table expectation is the sum of approved migration reports: 16 + 14 + 37 + 32 + 15. The 161-table figure belongs to the full logical design and includes 47 tables not represented by authorized M001–M016 migrations.

## Consequences

### Positive

- No Supabase account, token, or remote database is required.
- Database state stays isolated on this Mac.
- Approved PostgreSQL migrations can be tested against a real persistent PostgreSQL instance.

### Negative

- Docker Desktop must be running for the database to be available.
- This Mac is a development host, not a Production database platform.
- Local data availability depends on this Mac and the Docker volume unless backups are added.
- The current Next.js app cannot yet run without Supabase because Auth and Repository adapters remain Supabase-specific.

## Required next architecture gate

Before the application uses this database without Supabase, approve and implement a separate Local Runtime Integration Sprint covering:

1. Direct PostgreSQL server-only connection pool.
2. Least-privilege database role and grants.
3. Transaction-scoped RLS claim propagation.
4. Replacement of Supabase repository adapters.
5. A local authentication/session design replacing Supabase Auth.
6. Live database integration tests, backup, restore, and failure handling.

This ADR does not approve Production hosting on the Mac or internet exposure of PostgreSQL.

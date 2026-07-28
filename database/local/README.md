# PAYSAVE Local PostgreSQL on this Mac

This setup runs PostgreSQL 17 in Docker on the current Mac without Supabase.

## Security boundary

- Bind address: `127.0.0.1` only
- Host port: `55432` because local port `5432` is already occupied by an SSH tunnel
- Persistent named volume: `paysave_local_pg17`
- Credentials: `.env.local-db`, mode `600`, ignored by `.gitignore`
- No internet-facing database port
- No Production data or credentials

## Commands

```bash
docker compose --env-file .env.local-db -f docker/postgres.local.yml up -d
bash database/local/apply-approved-migrations.sh
bash database/local/verify-local-database.sh
bash database/local/backup-local-database.sh
bash database/local/run-local-database-verification.sh
```

The full verification runner creates a validated backup, restores it into the guarded disposable database `paysave_local_verification`, loads synthetic benchmark fixtures only in that disposable database, verifies indexes and query plans, runs `pgbench`, writes evidence to `docs/database/evidence/local-database-verification/`, then drops the disposable database automatically.

Backups are written outside the repository to `~/.paysave/local-db/backups` with restrictive permissions. The backup script validates the custom-format archive with `pg_restore --list` before accepting it.

Stop without deleting data:

```bash
docker compose --env-file .env.local-db -f docker/postgres.local.yml stop
```

Destroying the named volume permanently deletes the local database and must not be done casually.

## Verification-only limitation

The current Next.js backend uses Supabase Auth and Supabase/PostgREST repository adapters. This PostgreSQL instance is authorized only for migration verification, performance benchmarks, backup/restore drills, query-plan analysis and index verification.

Do not create a local application runtime, Authentication implementation, Repository adapter, Session/JWT substitute, or RLS design change. Return to Stage 4.0 Staging Database Integration only when Supabase Staging is ready.

Do not expose port `55432`, add router forwarding, or reuse these local credentials outside this Mac.

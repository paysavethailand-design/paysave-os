# PAYSAVE OS Consolidated Production Setup

This file consolidates all production SQL from existing migrations into a single executable script.

## File

`supabase/sql/production_setup.sql`

## How to Execute

### 1. Supabase SQL Editor (Recommended for one-time setup)

1. Go to your Supabase project Dashboard > SQL Editor
2. Create a new query
3. Copy the entire content of `production_setup.sql`
4. Paste and click **Run**
5. Execute once. The script uses `IF NOT EXISTS`, `CREATE OR REPLACE`, and `ON CONFLICT` to be idempotent.

### 2. Supabase CLI

```bash
supabase db reset --linked   # optional clean
# Then paste content into SQL Editor or use psql with connection string from supabase
psql "your-connection-string" -f supabase/sql/production_setup.sql
```

## Rollback

The script is wrapped in BEGIN; ... COMMIT;

- To rollback: Use Supabase Dashboard > Database > Backups, or manually drop tables if needed.
- No automatic rollback script provided (use `DROP TABLE IF EXISTS` carefully in a separate transaction if required).

## Order of Execution (Enforced in file)

- Functions
- Tables
- Foreign Keys (via ALTER after tables)
- Indexes
- Views
- Materialized Views
- Triggers (after tables)
- RLS Policies (after tables)
- Storage policies
- Seed data (last)

## Verification After Run

Run these in SQL Editor:

```sql
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('partners','employees','recovery_cases', ...);
SELECT COUNT(*) FROM partners;  -- expect 25+
SELECT COUNT(*) FROM recovery_cases; -- expect ~1200
```

This script allows installing a fresh PAYSAVE OS database in one go.

Derived strictly from existing migration files without new schema or business logic changes.

# PostgreSQL and migrations

Only Node connects to PostgreSQL, using pg. MySQL dumps informed the schema; no records were imported. Set DATABASE_URL locally or reference `${{Postgres.DATABASE_URL}}` in Railway. See [RAILWAY.md](../RAILWAY.md).

`npm run start:api` applies pending numbered migrations, prepares volume storage and migrates legacy blobs before listening. `npm run db:migrate` runs schema changes alone. Transactions, an advisory lock and schema_migrations make reruns safe. Failed SQL rolls back the pending batch.

- 001_initial.sql creates the schema.
- 002_volume_storage.sql adds paths and the cleanup queue.
- 003_auth_sessions.sql adds session versions, challenges and attempt counts. Pending old OTP/reset codes are deliberately cleared; users request new ones.
- 004_content_format.sql identifies old legacy-cipher files. New uploads explicitly use raw_csv to preserve values.

Add future changes as 005_description.sql. Never edit a deployed migration. Code rollback does not reverse schema changes.

Identifiers are UUIDs, timestamps are timestamptz, database sessions use UTC and email uniqueness is case-insensitive. The quoted fullName column preserves its spelling. The inherited daily limit counts currently retained uploads per user; deleting an upload releases a slot.

Do not execute MySQL dumps against PostgreSQL. A later import must preserve hashes and bytes, validate UUIDs/email collisions and interpret source timestamps correctly. Back up database and upload volume together.

Run `npm test` for embedded PostgreSQL and HTTP tests. TEST_DATABASE_URL enables an additional live PostgreSQL test in an isolated schema, removed afterward. CI uses PostgreSQL 17.

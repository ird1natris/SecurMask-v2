# PostgreSQL setup

The Node API now uses PostgreSQL through pg; the React and Flask apps do not connect directly to the database. The supplied MySQL dumps were used only to define the schema. Existing accounts, OTPs and uploaded files have not been migrated.

## Local setup

1. Create an empty PostgreSQL database named securmask.
2. In server/, run `npm ci`.
3. Copy .env.example to .env, set DATABASE_URL, and fill in the application's signing secret, email and reCAPTCHA credentials.
4. Schema migration is automatic through the API start command; `npm run db:migrate` remains available separately.
5. Run `npm run start:api`. Start Flask separately, or use the existing `npm start` command to start both backends.

The driver also accepts PGHOST, PGPORT, PGUSER, PGPASSWORD and PGDATABASE when DATABASE_URL is unset. The former ENVIRONMENT, IRDINA_DB_* and AIVEN_DB_* settings are no longer used.

## Railway

1. Add a PostgreSQL service to the same Railway project/environment as the API.
2. On the API service, reference the PostgreSQL service's DATABASE_URL. If the database service is named Postgres, use `${{Postgres.DATABASE_URL}}`.
3. Set the API root directory to /server and its start command to `npm run start:api`.
4. Set its pre-deploy command to `npm run db:migrate`.
5. Attach the API upload volume and follow [persistent storage setup](STORAGE.md).
6. Supply the application's other environment variables from .env.example.

Use the database's private connection URL for services in the same Railway environment. A local computer needs the public connection URL. Follow the database provider's TLS requirements; this code does not disable certificate validation.

This completes database configuration only. The frontend/API localhost URLs, Flask dependencies/production startup, CORS and production cookie configuration still need the deployment preparation previously identified.

Railway PostgreSQL documentation: https://docs.railway.com/databases/postgresql
Driver query documentation: https://node-postgres.com/features/queries

## Schema and migration behavior

- UUIDs replace char(36) identifiers.
- File contents now live on the API upload volume; PostgreSQL stores paths, IVs and signatures. Legacy bytea columns are retained until file migration completes.
- Identity columns replace MySQL auto-increment.
- timestamptz stores instants; API database sessions use UTC. Daily upload limits reset at midnight UTC.
- A unique index on lower(email) and matching queries preserve case-insensitive email behavior. PostgreSQL does not reproduce MySQL's accent-insensitive collation exactly.
- The quoted "fullName" column preserves the existing field name.
- Foreign keys retain the original no-cascade behavior.

The migration command applies the schema in a transaction and records its version in schema_migrations. An advisory lock serializes concurrent runs. Rerunning it preserves data. Existing unversioned tables cause a failure and rollback rather than being overwritten.

Do not import the original MySQL SQL files directly into PostgreSQL. Migrating existing records is a separate task: validate UUIDs and email collisions, preserve binary bytes and password hashes, interpret old timestamps using the original database timezone, and retain the existing signing secret if old file signatures must remain valid. Expired OTP/reset records normally need not be transferred.

## Verification

Run `npm test` from server/. Tests use a disposable, in-memory PGlite PostgreSQL engine and execute the SQL statements extracted from the API. They cover migration reruns and rollback, email uniqueness, parameter safety, password updates, OTP timestamps, encrypted file round trips, signatures, daily counts, deletion and foreign keys.

File-route HTTP tests use a stub processor; tests do not connect to Railway or exercise real email/Flask. A deployed PostgreSQL connection and end-to-end application smoke test are still required before going live.


## Automatic migrations on deployment

Enable GitHub autodeploy for the API's deployment branch and use npm run start:api as its Railway start command (root directory /server). Each resulting deployment checks pending schema changes, migrates remaining database-stored files on the mounted volume, and only then starts the API. Restarts also check safely; completed work is skipped.

The recommended Railway pre-deploy command remains npm run db:migrate so schema failures stop the deployment earlier. API startup repeats the check as a fallback and finds no pending schema work when pre-deploy succeeded. Flask does not run migrations.

Add new schema changes as sequential files such as migrations/003_add_file_size.sql. The runner discovers numbered SQL files automatically and records applied filenames in schema_migrations. Never edit an already-applied migration to introduce a change; add a new file. This is versioned migration, not automatic model-to-schema synchronization. Keep changes compatible with the previous app version during deployment; rolling back code does not roll back the database.

The runner keeps its transaction and advisory lock. A failure rolls back pending schema changes and prevents the new API from starting. For legacy file migration, already-completed records remain moved and retries resume the remaining records.

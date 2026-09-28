# Persistent file storage

Classifile stores new file contents on the Node API's filesystem and metadata in PostgreSQL. Originals retain the existing AES encryption; masked output is stored as processed content. Files are never exposed through a static public directory. Access requires login and ownership.

## Railway setup

1. Attach a dedicated volume to the Node API service at /data/uploads.
2. Set UPLOAD_DIR=/data/uploads and NODE_ENV=production on that service. RAILWAY_VOLUME_MOUNT_PATH is also accepted when UPLOAD_DIR is unset.
3. Keep DATABASE_URL pointing to the PostgreSQL service and set FLASK_URL to the processor's reachable private HTTP URL, including its port.
4. Use npm run db:migrate as the pre-deploy command. Migration 002 adds storage paths and a cleanup queue without deleting legacy content.
5. Use npm run start:api as the start command. It checks schema migrations, migrates remaining legacy files after the volume is mounted, then starts the API. A migration failure prevents startup.
6. Enable backups for both the PostgreSQL service and the upload volume; restore them from a coordinated recovery point.

Only the Node API uses this volume. Flask receives content over HTTP. Mounting the volume on Flask or PostgreSQL instead will not persist API uploads.

Railway mounts volumes at runtime, not during build or pre-deploy. File migration now runs automatically through npm run start:api; no temporary start command is needed. Do not put files:migrate in the pre-deploy command. You can still run npm run files:migrate manually inside the running container.

The file migration moves one record per transaction, keeps existing encryption bytes and IVs, and clears database blobs only after the volume write succeeds. It can be rerun safely. Legacy database-only originals remain readable until migration. The original MySQL dumps are not imported by this command.

Railway references:
- https://docs.railway.com/volumes
- https://docs.railway.com/volumes/reference

## Local development

Without a configured mount, development uses server/uploads/ (ignored by Git). Production requires an explicit directory or Railway mount variable to avoid silently defaulting to local development storage.

Run npm run start:api to migrate and start automatically; npm run db:migrate remains available for schema-only checks. Configure UPLOAD_DIR if testing an alternate directory. No S3/R2 credentials are needed.

## Limits and consistency

- Uploads accept CSV/XLSX filenames with a 10 MiB file limit; the processor must still parse and validate the content.
- Processed and masked output are also limited to 10 MiB before persistence.
- Five uploads per user per UTC day are enforced under a database row lock.
- The API still buffers requests and processing results in memory; this is not a streaming redesign.
- Filenames on disk are generated UUIDs, not user-provided paths.
- Writes use a temporary file followed by rename. Failed database writes trigger cleanup of new files.
- Deletions and replacements enqueue old paths transactionally. Failed physical cleanup is retried at API startup and after subsequent masking/deletion operations.
- Disk and database commits cannot be one atomic transaction. A process crash or uncertain database COMMIT can leave an unreferenced file; bytes are retained rather than risk deleting a committed file. Periodic reconciliation may be needed.
- Volume-backed Railway services currently cannot use replicas and experience brief redeployment downtime.

The authenticated file routes no longer log file contents or decryption keys. Other previously identified production issues outside these routes still need deployment preparation.

## Tests

npm test exercises disposable filesystem storage and embedded PostgreSQL, including HTTP file flows with a stub processor. Real Railway mounting, PostgreSQL networking, email, and Flask processing still require a deployed smoke test.

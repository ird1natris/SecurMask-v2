# Persistent storage

Encrypted originals and plaintext masked output live on the API volume; PostgreSQL stores ownership, paths, IVs and signatures. Disk filenames are generated UUIDs. There is no public static upload directory. User file keys are not stored by the API.

Attach an API volume at /data/uploads and set UPLOAD_DIR accordingly. Production requires UPLOAD_DIR or RAILWAY_VOLUME_MOUNT_PATH. Flask processes HTTP payloads in memory and does not mount this volume. See [RAILWAY.md](../RAILWAY.md).

Startup checks schema and migrates legacy blobs after the volume is mounted. Do not run files:migrate in build/pre-deploy. `npm run files:migrate` is available inside the runtime container. It clears each database blob only after its volume copy succeeds; retries resume safely.

## Limits and consistency

- Browser uploads: 5 MiB. API and processed outputs: 10 MiB.
- Processor: 100,000 rows, 200 columns, 50 MiB expanded XLSX.
- Per-user database locking serializes daily upload counts, using UTC dates.
- Writes use temporary files and rename before metadata commits.
- Replacement/deletion queues old paths transactionally; failed deletion retries at startup and later masking/deletion.
- Crashes or uncertain commits can leave orphaned files. Ambiguous bytes are retained to avoid deleting committed content; reconciliation may be needed.
- One API replica; volume-backed redeployments have brief downtime.
- Back up and restore PostgreSQL and upload volume together.

New files use raw_csv before AES encryption. Existing files retain legacy-cipher recovery. Data lost by old preprocessing cannot be reconstructed.

The browser keeps its own account-specific IndexedDB catalog and previews. Cross-device synchronization and browser-cache encryption are not implemented. The old browser timer deleting server files was removed; deletion is explicit.

Development uses server/uploads, ignored by Git. No S3/R2 credentials are required. Tests cover persistence, owner checks, cleanup retries, legacy moves and HTTP flows. CI also tests real PostgreSQL/Flask and production containers.

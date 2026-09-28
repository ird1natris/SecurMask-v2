# SecurMask

**Share the data. Keep the details private.**

SecurMask is a student-developed CSV/XLSX privacy workbench. Upload a dataset, choose sensitive columns to mask, download the result, and recover the encrypted original with your file key.

## Original work and subsequent contributions

SecurMask was originally developed by **Irdina Batrisyia**. The original student project is available at [SecurMask-v1](https://github.com/ird1natris/SecurMask-v1). This repository continues that work and preserves its original Git history and author attribution.

Our subsequent contributions focus on **refactoring, maintenance and deployment support** for the existing student project. They include the database migration, authentication updates, persistent file storage, deployment infrastructure and verification described below. These contributions do not replace or reattribute the student's original work.

### Temporary Classifile name

During the refactoring and deployment work, the project was temporarily named **Classifile**. We have returned to **SecurMask** as the project identity to maintain continuity with the original student work. Historical Classifile commits remain as an accurate record of that development stage.

The repository is currently hosted at [itsFiz/SecurMask](https://github.com/itsFiz/SecurMask). Application branding, the original logo, email copy and planning documents now use SecurMask. The GitHub repository has also been renamed to SecurMask. Existing browser-storage namespaces are retained internally so saved files and preferences remain accessible.

### Attribution and license

The original **Copyright (c) 2024 Irdina Batrisyia** notice and [MIT license](LICENSE) are preserved. Original and subsequent contributions remain traceable through Git history. The student appearing in GitHub's contributors list reflects authorship of the original code; it is not an accidental grant of repository access.

## Architecture

This is a monorepo with three deployable services:

| Directory / entry point | Service |
| --- | --- |
| client/ | React/Vite, served by Caddy; proxies /api to Node |
| server/start-api.js | Express API, authentication, PostgreSQL migrations, upload volume |
| server/main_app.py | Private Flask/Gunicorn dataset processor |

PostgreSQL is a fourth Railway service. Only the web service needs a public domain. The root and secure_mask package manifests are inherited artifacts, not additional deployed services.

## Refactoring and deployment contributions

- PostgreSQL with numbered migrations applied automatically before API startup.
- Persistent volume storage, owner checks, bounded uploads and retryable file cleanup.
- Same-origin API routing, production cookies, request-origin validation and rate limits.
- Passwordless email sign-in with expiring single-use codes, attempt limits and resend cooldowns. New accounts are created only after code verification.
- Resend HTTPS email delivery, with optional SMTP.
- Private processor authentication, production Gunicorn startup and health endpoints.
- CSV values preserved before encryption; older files retain their recovery path.
- Account-specific browser caches and escaped column previews.
- No installed dependencies, secrets or uploaded datasets tracked in Git.

## Deploy on Railway

Follow [RAILWAY.md](RAILWAY.md) for all four services, environment variables, volume setup, autodeploy and verification. Dockerfiles are included for each application service. Deployment requires a Railway project and a verified email sender.

## Local development

Use Node 22 or 24, Python 3.12, and PostgreSQL 17.

1. Run `npm ci` in both `client/` and `server/`.
2. For a new local setup, create a PostgreSQL database called `securmask` to match the environment example. Existing databases do not need renaming; retain their DATABASE_URL.
3. Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`. Configure email, database and two independent secrets.
4. Create and activate a Python virtual environment in `server/.venv`; run `pip install -r requirements.txt` from `server/`.
5. From `server/` run `npm start`. This starts Flask on 5000 and Node on 8081; migrations run automatically.
6. From `client/` run `npm run dev` and use `http://localhost:5173`.

Use `npm run start:api` for Node alone. The Vite development proxy forwards /api requests.

## Verification

- `cd server && npm test` - passwordless authentication, migrations, volume storage and HTTP file flows.
- `cd server && python -m unittest test_processor -v` - real CSV/XLSX preservation and processor access controls.
- `cd client && npm run build` - frontend production build.
- Set `FLASK_TEST_URL` and matching `PROCESSOR_SECRET` when running Node tests to exercise the real processor.
- Set `TEST_DATABASE_URL` to a disposable PostgreSQL database to enable the live PostgreSQL test. It uses and removes a dedicated test schema.

[GitHub Actions](.github/workflows/ci.yml) uses Node 22, Python 3.12 and PostgreSQL 17, tests real Flask integration, builds all three images, and smoke-tests the Caddy proxy and API restart/migration path.

## Data handling and current limits

The API stores encrypted originals and plaintext masked outputs on its private volume. Encryption keys are supplied by the user and are not stored by the API. Keep the key: it is required for recovery. Encryption uses the inherited AES-256-CBC format; this is not an end-to-end encrypted service because processing decrypts data on the server.

The UI still caches dataset content in IndexedDB on the current browser, separated by account. It is not a cross-device file library; clearing browser data loses that local catalog. Browser caches are not encrypted at rest. Use a trusted browser profile for sensitive datasets. Masking rules are heuristic and may retain partial values; inspect output before sharing.

The browser upload limit is 5 MiB; the API ceiling is 10 MiB. Processing is bounded to 100,000 rows, 200 columns and 50 MiB expanded XLSX data. Excel precision already lost in numeric cells cannot be recovered. Files are processed in memory. Start with one replica per service.

See [database notes](server/POSTGRES.md) and [storage notes](server/STORAGE.md) for migration and backup behavior. The supplied MySQL dumps were used for schema design only; their records have not been imported.

Previously committed node_modules were removed from the current tree. They remain in historical commits because upstream history is preserved. Install dependencies with `npm ci`.

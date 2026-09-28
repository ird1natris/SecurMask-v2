# Classifile

**Share the data. Keep the details private.**

Classifile is a CSV/XLSX privacy workbench. Upload a dataset, choose sensitive columns to mask, download the result, and recover the encrypted original with your file key.

## Origin and attribution

Classifile is a refactor of [SecurMask-v1](https://github.com/ird1natris/SecurMask-v1), originally authored by Irdina Batrisyia. The inherited Git history explains why GitHub lists the upstream author as a contributor; it does not imply involvement in this refactor or repository access. The original [MIT copyright notice](LICENSE) is preserved.

The refactor is maintained in [itsFiz/Classifile](https://github.com/itsFiz/Classifile).

## Architecture

This is a monorepo with three deployable services:

| Directory / entry point | Service |
| --- | --- |
| client/ | React/Vite, served by Caddy; proxies /api to Node |
| server/start-api.js | Express API, authentication, PostgreSQL migrations, upload volume |
| server/main_app.py | Private Flask/Gunicorn dataset processor |

PostgreSQL is a fourth Railway service. Only the web service needs a public domain. The root and secure_mask package manifests are inherited artifacts, not additional deployed services.

## Refactor changes

- PostgreSQL with numbered migrations applied automatically before API startup.
- Persistent volume storage, owner checks, bounded uploads and retryable file cleanup.
- Same-origin API routing, production cookies, request-origin validation and rate limits.
- Password-bound login challenges, expiring single-use login/reset codes, attempt limits, and session invalidation after a password reset.
- Resend HTTPS email delivery, with optional SMTP.
- Private processor authentication, production Gunicorn startup and health endpoints.
- CSV values preserved before encryption; older files retain their recovery path.
- Account-specific browser caches, escaped column previews and Classifile branding.
- No installed dependencies, secrets or uploaded datasets tracked in Git.

## Deploy on Railway

Follow [RAILWAY.md](RAILWAY.md) for all four services, environment variables, volume setup, autodeploy and verification. Dockerfiles are included for each application service. Deployment still requires your Railway project, verified email sender and reCAPTCHA credentials.

## Local development

Use Node 22 or 24, Python 3.12, and PostgreSQL 17.

1. Run `npm ci` in both `client/` and `server/`.
2. Create a PostgreSQL database called `classifile`.
3. Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`. Configure email, reCAPTCHA, database and two independent secrets.
4. Create and activate a Python virtual environment in `server/.venv`; run `pip install -r requirements.txt` from `server/`.
5. From `server/` run `npm start`. This starts Flask on 5000 and Node on 8081; migrations run automatically.
6. From `client/` run `npm run dev` and use `http://localhost:5173`.

Use `npm run start:api` for Node alone. The Vite development proxy forwards /api requests. Register localhost in your reCAPTCHA v2 checkbox configuration.

## Verification

- `cd server && npm test` â€” authentication, migrations, volume storage and HTTP file flows.
- `cd server && python -m unittest test_processor -v` â€” real CSV/XLSX preservation and processor access controls.
- `cd client && npm run build` â€” frontend production build.
- Set `FLASK_TEST_URL` and matching `PROCESSOR_SECRET` when running Node tests to exercise the real processor.
- Set `TEST_DATABASE_URL` to a disposable PostgreSQL database to enable the live PostgreSQL test. It uses and removes a dedicated test schema.

[GitHub Actions](.github/workflows/ci.yml) uses Node 22, Python 3.12 and PostgreSQL 17, tests real Flask integration, builds all three images, and smoke-tests the Caddy proxy and API restart/migration path.

## Data handling and current limits

The API stores encrypted originals and plaintext masked outputs on its private volume. Encryption keys are supplied by the user and are not stored by the API. Keep the key: it is required for recovery. Encryption uses the inherited AES-256-CBC format; this is not an end-to-end encrypted service because processing decrypts data on the server.

The UI still caches dataset content in IndexedDB on the current browser, separated by account. It is not a cross-device file library; clearing browser data loses that local catalog. Browser caches are not encrypted at rest. Use a trusted browser profile for sensitive datasets. Masking rules are heuristic and may retain partial values; inspect output before sharing.

The browser upload limit is 5 MiB; the API ceiling is 10 MiB. Processing is bounded to 100,000 rows, 200 columns and 50 MiB expanded XLSX data. Excel precision already lost in numeric cells cannot be recovered. Files are processed in memory. Start with one replica per service.

See [database notes](server/POSTGRES.md) and [storage notes](server/STORAGE.md) for migration and backup behavior. The supplied MySQL dumps were used for schema design only; their records have not been imported.

Previously committed node_modules were removed from the current tree. They remain in historical commits because upstream history is preserved. Install dependencies with `npm ci`.

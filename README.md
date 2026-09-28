# Classifile

**Share the data. Keep the details private.**

Classifile is a privacy workbench for CSV and Excel datasets. Users can identify sensitive columns, apply masking rules, and recover encrypted original data using their key.

## Project origin and attribution

Classifile is a refactor of [SecurMask-v1](https://github.com/ird1natris/SecurMask-v1), originally authored by Irdina Batrisyia. This repository carries forward the original Git history, so GitHub may list the original author among its contributors. That reflects authorship of the upstream code; it does not by itself indicate involvement in the current Classifile refactor or repository access.

The Classifile refactor is maintained in [itsFiz/Classifile](https://github.com/itsFiz/Classifile). The original MIT license and copyright notice are preserved in [LICENSE](LICENSE).

## What has changed

- Replaced MySQL with PostgreSQL and versioned SQL migrations.
- Moved new file contents to filesystem storage suitable for a Railway persistent volume; PostgreSQL retains metadata.
- Added authentication and ownership checks to file operations.
- Added upload limits, transactional cleanup tracking, and a migration path for legacy database-stored files.
- Added automatic schema and legacy-file migration before API startup.
- Added database, storage, and HTTP file-flow integration tests.

The user interface and some email templates still use the original SecurMask branding while the refactor is in progress.

## Application structure

| Directory | Purpose |
| --- | --- |
| client/ | React and Vite frontend |
| server/server.js | Express API, accounts and authentication |
| server/file-routes.js | Authenticated file operations |
| server/main_app.py | Flask masking and data processing |
| server/migrations/ | PostgreSQL schema migrations |
| server/test/ | Database and storage integration tests |

The secure_mask/ directory contains a legacy package manifest, not the active frontend.

## Local development

Use a supported Node.js LTS release compatible with the dependencies, Python, and PostgreSQL.

1. Clone this repository.
2. Run npm ci in client/ and server/ to install their locked dependencies.
3. Create an empty PostgreSQL database and copy server/.env.example to server/.env.
4. Configure the database connection, signing secret, email credentials and reCAPTCHA settings.
5. Install Python dependencies from server/requirements.txt. The current requirements still need faker and fuzzywuzzy added; install those too for local processing.
6. In server/, run npm start to launch the Node API and Flask development server. The API applies pending migrations automatically.
7. In client/, run npm run dev.

Use npm run start:api from server/ to start only the API. New schema changes belong in sequential SQL files such as 003_add_file_size.sql; already-applied migrations are skipped.

## File storage

Development defaults to server/uploads/, which is ignored by Git. Production requires UPLOAD_DIR or a Railway volume mount variable. Original content is encrypted; masked output is stored as processed content. File access is restricted to its owner.

See [PostgreSQL setup](server/POSTGRES.md) and [persistent storage setup](server/STORAGE.md) for environment variables, migration behavior and Railway mounting instructions.

## Verification

- Run npm test in server/ for the database and file-storage tests.
- Run npm run build in client/ for the frontend production build.

Tests use disposable filesystem storage and embedded PostgreSQL. HTTP file-flow tests stub the processor; they do not replace a live PostgreSQL, Flask and email smoke test.

## Deployment status

The refactor is not yet ready for a complete public Railway deployment. Remaining work includes replacing frontend localhost URLs, production routing and cookie configuration, an appropriate email-delivery integration, Python production dependencies, health endpoints, and the remaining authentication fixes identified during review.

The intended deployment has a frontend, Node API, Flask processor and PostgreSQL service, with a dedicated upload volume attached to the API.

## Repository hygiene

Installed node_modules directories are not source files and must not be committed. Install dependencies with npm ci; keep package.json and package-lock.json tracked. Environment secrets and local uploads must remain outside Git.

Previously committed dependencies have been removed from the current tree. They remain in historical commits because the upstream history is preserved.

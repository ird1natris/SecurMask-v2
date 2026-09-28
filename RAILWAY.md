# Deploy SecurMask on Railway

Deploy main from [itsFiz/Classifile](https://github.com/itsFiz/Classifile). Create one project with four services named exactly as below.

## 1. Prepare credentials

- Create a Resend API key and verify your sending domain. Use a sender such as SecurMask <noreply@your-domain.com>.
- Generate two independent random secrets by running `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` twice. Use one for SECRET_KEY, another for PROCESSOR_SECRET. Keep them stable.
- Never put private credentials in VITE_ variables: these are public build inputs.

## 2. PostgreSQL

Add Railway PostgreSQL and name it `Postgres`. Keep its database volume. Migrations create the schema; do not import the original MySQL dumps.

## 3. Private processor

Add a repository service named `processor`.

| Setting | Value |
| --- | --- |
| Root directory | /server |
| Builder | Dockerfile |
| Start command | Empty; use image CMD |
| Health check | /health |
| Replicas | 1 |
| Public domain / volume | None |

Variables:

```dotenv
RAILWAY_DOCKERFILE_PATH=Dockerfile.processor
NODE_ENV=production
PORT=5000
PYTHONUNBUFFERED=1
PROCESSOR_SECRET=<second random secret>
```

The image runs Gunicorn on [::]:5000 with one worker/thread and a 120-second timeout. Keep port 5000. Disable serverless sleeping so uploads do not wait for cold starts.

## 4. Private API and upload volume

Add a repository service named `api`.

| Setting | Value |
| --- | --- |
| Root directory | /server |
| Builder | Dockerfile |
| Start command | Empty; image runs npm run start:api |
| Pre-deploy command | Empty; migrations run at startup |
| Health check | /health |
| Health check timeout | 300 seconds; increase for a large legacy migration |
| Replicas | 1 |
| Public domain | None |
| Volume mount | /data/uploads |

Attach a **dedicated volume to api** at /data/uploads. PostgreSQL's volume does not store API uploads.

Variables (Railway resolves the reference expressions):

```dotenv
RAILWAY_DOCKERFILE_PATH=Dockerfile.api
NODE_ENV=production
PORT=8081
HOST=::
DATABASE_URL=${{Postgres.DATABASE_URL}}
UPLOAD_DIR=/data/uploads
FLASK_URL=http://${{processor.RAILWAY_PRIVATE_DOMAIN}}:5000
SECRET_KEY=<first random secret>
PROCESSOR_SECRET=${{processor.PROCESSOR_SECRET}}
APP_ORIGIN=https://<web-domain>
EMAIL_PROVIDER=resend
EMAIL_FROM=SecurMask <noreply@your-verified-domain.com>
RESEND_API_KEY=<your Resend key>
```

For an existing deployment, change only the display name in EMAIL_FROM to SecurMask, keeping the same verified sender address. Keep the existing database URL, secrets, upload volume and domains. Redeploy web and api to update the visible branding.

Set EMAIL_FROM literally in the variable editor. APP_ORIGIN is the exact HTTPS scheme and hostname used by the browser, without a path. Disable serverless sleeping.

Resend uses HTTPS. Railway only enables SMTP on Pro and above; use Resend on Free/Trial/Hobby. Optional SMTP variables are in server/.env.example.

## 5. Public web

Add a repository service named `web`.

| Setting | Value |
| --- | --- |
| Root directory | /client |
| Builder | Dockerfile (default Dockerfile) |
| Start command | Empty; use Caddy image CMD |
| Health check | /health |
| Replicas | 1 |
| Volume | None |

Variables:

```dotenv
PORT=3000
API_UPSTREAM=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:8081
VITE_API_BASE_URL=/api
```

Generate a public domain targeting port 3000. Set the API APP_ORIGIN to that HTTPS origin. Redeploy API afterward. Changes to VITE_ variables require rebuilding web.

The browser calls /api on the web domain; Caddy strips that prefix and forwards to the private API. Only the API calls Flask. Browser variables must not contain private Railway hostnames.

## 6. Resources and autodeploy

Start with one replica each. A reasonable initial allocation is about 512 MiB for web, 512 MiBâ€“1 GiB for API, 1 GiB for processor, plus PostgreSQL. These are starting allocations, not measured minimums; monitor memory during XLSX processing. Size upload storage for your retention needs.

Enable GitHub autodeploy from main for all three application services. Every API deployment/restart applies pending numbered migrations under a database advisory lock, migrates old database blobs onto the mounted volume, then starts listening. A push runs migrations only when it triggers API deployment.

Add future changes as server/migrations/006_description.sql and later files. Never rewrite an applied migration. Code rollback does not undo schema changes; keep changes compatible with the previous code. Leave watch paths unset unless you ensure api and processor both watch /server and web watches /client.

Volumes exist at runtime, not during build/pre-deploy. Keep legacy file migration in startup. An optional schema-only pre-deploy command `npm run db:migrate` is safe but redundant. Volume-backed API redeployments have a brief interruption and cannot use replicas. Rate limits are in-process; shared rate-limit storage is required before scaling the API.

## 7. Verify before using real datasets

1. Confirm all service health checks are green.
2. Open https://<web-domain>/health and https://<web-domain>/api/health.
3. Enter your email and verify the sign-in code. New accounts are created automatically after verification.
4. Upload a small CSV with a name and text identifier 00123.
5. Mask the name and check the identifier remains unchanged.
6. Download the signed result and recover the original with its key.
7. Log out and confirm protected access fails. Sign back in using a new emailed code.
8. Redeploy API and confirm the existing file still works in the same browser.
9. Enable PostgreSQL and API-volume backups and test coordinated restoration.

The UI catalog is browser-local, separated by account. Cross-device browsing is not implemented. Clearing browser data removes its catalog and cached content, independently of server persistence.

## Troubleshooting

- **502 on /api:** verify API_UPSTREAM, service names, port 8081 and API logs.
- **Unhealthy API:** verify database connection, volume mount, mail settings and migration logs.
- **OTP delivery:** check Resend key, verified sender and provider logs. Codes expire after five minutes and resends have cooldowns.
- **403 origin:** APP_ORIGIN must match the browser origin.
- **Processor errors:** check FLASK_URL, matching PROCESSOR_SECRET, processor health and file limits.
- **Legacy recovery differences:** old lossy preprocessing cannot be reversed perfectly.

References: [Docker builds](https://docs.railway.com/builds/dockerfiles), [private networking](https://docs.railway.com/networking/private-networking), [volumes](https://docs.railway.com/volumes), [outbound SMTP](https://docs.railway.com/networking/outbound-networking), [Resend API](https://resend.com/docs/api-reference/emails/send-email).

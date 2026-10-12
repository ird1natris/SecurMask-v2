# UI revamp verification

Verified locally on 12 October 2026. Implementation lives on `revamp/uiux`; `archive/original-ui` preserves commit `2854975`. No remote push or deployment was performed.

## Implemented

- Warm light theme, local IBM Plex fonts, neutral surfaces, no gradients, responsive labeled dock.
- Email-code login, one-file upload, encrypted original, column selection, original/masked previews, signed CSV export, recovery, server-backed searchable/filterable library, profile, feedback, and help.
- Draft selections remain in memory across dock navigation. Reload warns before losing a task. File keys are not persisted; keys are cleared after successful use. Server encryption and signed-export formats are unchanged.
- The key input now accepts the API's existing minimum of eight characters rather than the old UI's arbitrary exact-eight-character restriction.
- Owner-scoped `GET /files` returns only metadata. `GET /masked-file?id=...` retrieves masked content after ownership checks. Unmasked files require the original key through the existing recovery endpoint; no plaintext original preview endpoint was added.
- Manifest, normal/maskable icons, Apple touch icon, asset-only service worker, offline screen, installation guidance, and an explicit update action in Settings.
- Local profile preferences remain device-specific. New dataset workflows do not write content to IndexedDB. Settings and sign-out can clear legacy dataset caches.

## Checks completed

| Check | Result |
| --- | --- |
| React/Vite production build and generated PWA | Pass |
| ESLint for new/rewritten frontend components, entry points, changed utilities, and Vite configuration | Pass |
| Prettier for new/rewritten frontend and browser test | Pass |
| `git diff --check` | Pass |
| Server `npm test` | 11 pass; 1 live-PostgreSQL test skipped because `TEST_DATABASE_URL` was not configured |
| Python `python -m unittest test_processor -v` | 4 pass, including real CSV value preservation, XLSX parsing, and private processor checks |
| `node scripts/verify-ui.mjs` | Pass |

The browser regression test runs against the production build with real email-code authentication (mail captured in memory), API ownership, encryption, signing, and file storage. PostgreSQL is supplied by isolated PGlite. Its processor is deterministic; the separate Python suite covers the real processor. It does not send emails or use production data.

Browser coverage includes sign-in, upload, column selection, navigation preserving selections, masking, signed download, a fresh browser context finding server files without an IndexedDB catalog, wrong-key rejection, original recovery, key-field clearing, profile saving, logout, and offline reload. Manifest/icon retrieval and absence of API requests in Cache Storage are asserted. Layout checks cover 360px/390px mobile widths and 1440px desktop. Screenshots of desktop workspace/editor and mobile workspace/files were visually inspected.

## Remaining release checks

- Install and exercise the app on physical iPhone/iPad, Android, and Safari Add to Dock. Chromium automation does not establish native installed-mode correctness on those platforms.
- Exercise upgrade from an older installed build while a real task is active, mobile keyboard behavior, and screen-reader navigation on target devices.
- Run the optional live PostgreSQL integration test against a disposable test database and normal staging deployment checks.
- Conduct the five-person usability study proposed in the PRD. Its success targets are not yet measured.
- The existing inactive legacy components remain in the repository. Whole-repository lint cleanup and a TypeScript migration are separate maintenance work; scoped lint above covers this implementation.

## Reproduce

Install dependencies in `client/` and `server/`, then build the client. Run `node scripts/verify-ui.mjs` from the repository root. Chrome must be installed, or set `PLAYWRIGHT_EXECUTABLE_PATH` to a compatible Chromium executable.

The test creates a temporary database/storage directory and removes it afterward. Screenshots remain under ignored `.artifacts/revamp/`. Use the README's normal environment setup for a persistent development backend; the browser fixture is not a production service.

Deploy client and API together; no schema migration is needed for the library endpoints. Production requires HTTPS and the existing database, mail, storage, and processor configuration. No Go rewrite was introduced.

# SecurMask Workshop

Standalone browser-only app with a guided fictional practice exercise and a Files workspace for CSV/XLSX imports. Files are parsed in a browser worker and never sent to a server. No authentication, API, analytics, or database. Files and choices live in memory and reset on reload; the PWA caches application assets and the fictional sample only.

## Development

Use Node 22 or 24. From this directory:

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

The workshop does not change the existing `client/` and `server/` applications. The original repository history and root MIT attribution to Irdina Batrisyia are retained.

## Railway

Create a separate service connected to the desired release branch, with root directory `/workshop`, Dockerfile builder, watch path `/workshop/**`, and health check `/health`. The Dockerfile builds the PWA and serves it with Caddy on Railway's PORT. Give this service its own HTTPS domain. It needs no environment secrets or database. Leave existing services and their branch configuration unchanged until their deployed commit has been verified.

PWA installation requires HTTPS outside localhost. Installation is optional. App updates require confirmation and reset in-memory choices. Test actual iOS/Android installation before the workshop.

## Exercise behaviour

Selected names become stable per-row practice IDs; phone and clinical-note values are removed; actual ages become their containing ten-year band; all supplied towns generalise to Pahang. Unselected fields retain their original values. These rules are deliberately limited to the supplied fixture, not a general clinical anonymisation engine. Export requires acknowledging the review, but does not certify anonymity or permission to share.

## Design

Light ivory surfaces, ink text, muted olive controls, IBM Plex type, an accessible four-destination dock, and no gradients. Guidance consulted: [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), minimal Swiss layout, React semantics and accessibility checklists. No third-party skill code is bundled into the application.

## Files workspace

CSV and XLSX up to 5 MB, 10,000 data rows, 100 columns. CSV must use UTF-8. Select a visible worksheet for XLSX; formulas are rejected with instructions to export values first. Headers must be unique and non-empty. Preview shows the first 20 rows; export contains all rows of the selected sheet. Formatting and other worksheets are not exported. Rules are explicit: keep, remove values, replace with per-row IDs, or actual ten-year age bands (whole ages 0–120). Blank cells remain blank. Formula-like values are escaped in CSV exports. No automatic PII detection or anonymity guarantee. Clear file terminates processing and drops the in-memory dataset.

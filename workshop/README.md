# SecurMask Workshop

Standalone browser-only practice app using six supplied fictional records. No uploads, authentication, API, analytics, database, or real patient data. Exercise choices live in memory and reset on reload; the PWA caches the app and its fictional sample for offline use.

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

Light ivory surfaces, ink text, muted olive controls, IBM Plex type, an accessible three-destination dock, and no gradients. Guidance consulted: [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), minimal Swiss layout, React semantics and accessibility checklists. No third-party skill code is bundled into the application.

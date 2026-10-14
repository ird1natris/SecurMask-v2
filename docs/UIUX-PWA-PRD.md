# SecurMask — UI/UX & PWA product requirements

Status: initial implementation complete on `revamp/uiux`; see UIUX-VERIFICATION.md for validation and remaining device checks.
Date: 12 October 2026
Owner: Irdina Batrisyia

## 1. Product decision

Build a polished, light-mode privacy utility for preparing CSV/XLSX datasets for sharing. The experience should feel calm, professional, modern, and immediately understandable. The product is a working tool, not a marketing dashboard.

Core promise: choose a file, decide which columns to mask, inspect the result, download it. Recover an encrypted original using the file key when needed.

Retain React/Vite. Introduce TypeScript incrementally in rewritten components. Keep Express, PostgreSQL, and the Python processor for the first release. Treat a Go API migration as a separate, optional project with compatibility gates.

Provide an installable PWA and a compact, labeled navigation dock. OS installation and the in-app navigation dock are separate features; support both.

## 2. Baseline and branch strategy

- `main`: unchanged cloned baseline, commit `2854975`.
- `archive/original-ui`: local branch preserving that baseline.
- `revamp/uiux`: active local branch containing the implementation and this PRD.
- No branches have been pushed; no deployment has been changed.
- The earlier sidebar, hero banner, and metric cards were replaced with the dock and focused file workflow.
- The production build and browser regression checks pass. Desktop/mobile screenshots were inspected. Native installed-mode checks remain before release.

## 3. Audience and jobs

Primary audience assumption: individual students, researchers, analysts, and small teams preparing spreadsheet data for sharing. Validate with the owner before optimizing for enterprise administration.

| Job | Product response |
| --- | --- |
| Share a spreadsheet without exposing personal details | A guided masking workflow with real before/after samples |
| Understand what a rule changes | Per-column explanations and explicit unchanged values |
| Get back the original | Separate recovery flow using signed export and original file key |
| Find previous work | Searchable file library with truthful persistence and availability states |
| Use the tool like an app | Standalone launch, home-screen/Dock icon, stable navigation |

## 4. Design direction: quiet precision

### Visual language

- Warm off-white canvas, white working surfaces, charcoal text, fine neutral borders.
- One restrained accent: ink blue for the primary action and selection. Green is reserved for success states, not large brand panels. Final accent can change after visual exploration without affecting the system.
- Proposed tokens: canvas `#F7F6F2`, surface `#FFFFFF`, text `#242522`, secondary text `#666963`, border `#E3E4DE`, action `#2F455C`.
- Self-host one readable interface typeface, provisionally IBM Plex Sans; use IBM Plex Mono only for keys, counts, and spreadsheet samples. Check final font licensing and contrast during implementation.
- A restrained type scale: 14–16px body, 20–24px section titles, 28–36px screen titles. Avoid oversized slogans inside the app.
- 8px spacing foundation; comfortable 24–32px page gutters on desktop and 16px on mobile.
- 8–12px component radii. Reserve a larger radius for the dock. Avoid pill-shaped styling on every control.
- Thin borders define structure. A subtle shadow is appropriate for the dock and dialogs, not every panel.
- Consistent 18–20px line icons paired with labels. Tooltips supplement labels, never replace essential ones.
- Motion serves feedback: approximately 120–180ms state transitions. Respect reduced-motion preferences.

### Explicit exclusions

No gradients, glow effects, glassmorphism, purple/cyan neon accents, floating decorative blobs, oversized security illustrations, fabricated analytics, rotating taglines, emoji navigation, or stock SaaS card grids. Preserve SecurMask identity and original author attribution. Claims must describe actual behavior; do not imply end-to-end encryption, guaranteed anonymity, or offline processing.

### What makes it distinctive

Use the dataset itself as the visual centerpiece. Show a carefully laid out spreadsheet preview, restrained highlighted cells, explicit rule labels, and a clear review summary. Strong typography and spacing should create the aesthetic; decoration is secondary.

## 5. Information architecture and dock

Dock destinations: **Workspace · Files · Recover · Settings**.

- Desktop: centered compact bottom dock with icons and persistent text labels. Top bar contains the brand, current task/file name, and contextual help/account access.
- Mobile: bottom navigation occupying the safe area, using the same order and labels. Avoid hover-only behavior or magnification effects.
- Workspace opens directly into upload or the current task. Files opens the library. Recover opens a dedicated recovery screen.
- Keep the navigation dock stable during ordinary navigation. A task's primary action belongs next to the task or in a separate action footer above the dock.
- Reserve content padding for dock, action footer, and `env(safe-area-inset-bottom)`. Test short viewports, landscape, zoom, and onscreen keyboards.
- Switching destinations during unsaved work must preserve the draft or offer a clear discard choice. Do not persist file keys to accomplish this.
- Every destination has a real URL; browser Back works. Keep legacy routes working through redirects where necessary.
- Help, feedback, and project attribution live under Settings or contextual help; they do not compete with the main task.

## 6. Core experience

### A. Sign in

One focused email form, one primary action, and a brief explanation of email-code sign-in. Show delivery, expiry, invalid-code, resend cooldown, and network error states inline. Allow changing the email without restarting the app. Support paste and OS one-time-code autofill.

Avoid a decorative split-screen marketing composition on small screens. Never conflate the sign-in code with a file encryption key.

### B. Workspace: upload → configure → review → export

1. **Upload:** one prominent drop area plus a normal keyboard-accessible file chooser. Display CSV/XLSX support and 5 MiB limit before selection. Start with one file per task; batch work is out of scope.
2. **Validate:** show the chosen filename, size, detected columns, and sample rows. Reject unsupported, empty, oversized, or malformed input with a specific correction. Cancellation of the picker does nothing.
3. **Protect original:** explain the purpose of the file key before submission. Preserve existing key constraints until the encryption contract is separately reviewed. Require the user to acknowledge keeping the key. Never store keys in persistent browser state, telemetry, or service-worker caches.
4. **Configure:** show columns in a scannable list/table with sample values, a mask toggle, and a rule selector. Values remain unchanged unless explicitly selected. Use only masking rules supported by the processor; inventory them before implementation. Do not imply automatic PII detection or AI classification.
5. **Review:** show original and masked samples with selected rules and the number of selected columns. On mobile, use a labeled original/masked toggle. Treat samples as samples, not proof that every sensitive value was removed.
6. **Export:** download the signed masked CSV using the existing contract. Explain that retaining its filename/signature and the file key enables recovery while the server original remains available. Offer “Open files” and “Mask another file.”

Show actual named processing stages and an indeterminate indicator when the server exposes no progress. Do not invent percentage progress. On failure, preserve recoverable choices in memory and let the user retry without accidental duplicate uploads.

The existing signed CSV format is part of the compatibility contract. Do not silently strip its signature or alter file naming as part of a cosmetic redesign.

### C. Files

Desktop uses a clean table; mobile uses concise file rows. Fields: filename, format, uploaded time, masking state, and available actions. Search by name and filter by state. Sort by newest first. No fake statistics.

States include empty, loading, ready to mask, masked, unavailable/expired original, error, and no search results. Actions use verbs: Open, Download, Recover, Delete. Recovery is offered only when the necessary original and key can still be used. Confirm destructive deletion with the filename.

### D. Recover

Separate route and dock item. Accept the existing signed masked CSV, verify it, request the original file key, and present recovered data with a download action. Distinguish invalid signature, missing/expired original, wrong key, expired session, and connectivity failure. Clear the key after completion or cancellation. Do not call recovery “undo masking” without explaining the stored-original requirement.

### E. Settings

Profile, account sign-out, install instructions, browser-storage controls, help/feedback, and project attribution. Explain whether a setting changes the account or only the local device. Saving a profile should have an explicit success state. Editing must never replace real values with their display-masked versions.

## 7. PWA requirements

### Install and launch

- Serve over HTTPS in production. Supply a web app manifest with stable ID, name/short name, start URL, scope, standalone display, neutral background/theme colors, and suitable regular/maskable icons plus an Apple touch icon.
- Provide “Install SecurMask” in Settings. Use a browser installation prompt only where supported; otherwise show appropriate platform instructions. Installation is user-initiated. Do not promise one universal automatic install flow.
- Support iPhone/iPad Add to Home Screen, Android install, desktop Chromium installation, and Safari Add to Dock on supported macOS.
- Hide redundant install prompts when already running standalone.
- Launch gracefully with or without a valid session. Deep links and reloads resolve through the deployed web server.
- Validate authentication and local-storage behavior in installed mode; do not assume it shares browser-tab state.

### Offline and update behavior

- First release is **online for sign-in, processing, recovery, and server-backed files**.
- Cache only versioned public app assets and a neutral offline shell. API responses, uploads, previews, downloads, credentials, file keys, and recovered data must not enter service-worker caches.
- Offline shell explains connectivity requirements and offers retry. No pretend success, background upload queue, or automatic replay of file operations.
- An offline launch must not reveal a previous user's dataset.
- Offer “Update available” at a safe moment. Never force reload during upload, masking, key entry, review, or download.
- Log out clears sensitive in-memory/session state and any deliberately retained local data under the agreed storage policy. Public app assets may remain cached.

### The library continuity decision

The pre-revamp IndexedDB catalogs were browser/account scoped. The implementation now uses owner-scoped server metadata and authenticated masked-content retrieval. Installed web apps may use separate storage contexts. PWA installation alone does not make previous files available or sync them.

Recommended public-release requirement: add an authenticated, owner-scoped server metadata library before advertising a consistent browser-to-installed-app experience. Inspect the existing PostgreSQL schema and retention behavior first. Display only files that actually remain available; do not recreate deleted/expired originals.

Prototype fallback: retain local catalogs with a prominent “Files on this device/browser” label and explain installation differences. This is acceptable for a visual prototype, not an invisible limitation in a polished release.

Server metadata alone cannot recreate a missing original preview. Define a safe authenticated preview/download path for each state, or show an honest unavailable state. Do not store decrypted original data just to make the library look populated.

## 8. Architecture decision

Current verified stack: React 18 + Vite frontend; Node/Express email authentication and file API; PostgreSQL; private Flask/Pandas/OpenPyXL processing; Caddy reverse proxy and Railway deployment.

| Option | Benefit | Cost/risk | Recommendation |
| --- | --- | --- | --- |
| React + existing Node API + Python | Preserves tested behavior; focuses effort on usability and PWA | Existing service boundaries remain | First release |
| React + Go API + Python | Viable typed API and deployment model if Go is a long-term team preference | Port auth, uploads, migrations, rate limits, storage, and tests; Python still remains | Separate later milestone |
| React + Go for API and processor | Potentially fewer runtime languages | Reimplement spreadsheet semantics, masking, encryption/recovery compatibility | Do not combine with this redesign |

Go supports relational access and PostgreSQL drivers, so feasibility is not the obstacle. The decision is scope and compatibility. No repository evidence currently demonstrates that Node is the bottleneck. Benchmark realistic datasets before making performance claims; Python processing may dominate end-to-end latency.

Introduce TypeScript for new frontend components and API contracts incrementally. Avoid a framework migration or global-state library unless a concrete requirement justifies it. PWA support does not require Next.js or a native wrapper.

If Go is chosen later: document API contracts, port a small endpoint first, run the existing auth/storage/file contract tests against both services, verify original recovery and signed exports against historical fixtures, preserve database/data formats, and retain a reversible cutover. Preserve secure cookies, origin validation, ownership checks, rate limits, and bounded uploads. Replacing the API and replacing the processor are separate decisions.

## 9. Delivery sequence

1. **Visual specification:** two grayscale-first explorations of the same core flow; choose typography, layout, density, and dock treatment. Show Workspace, column editor, and mobile Files before styling every page.
2. **Component foundation:** tokens, buttons, fields, focus styles, dock, dialogs, file rows, statuses, responsive data preview. Review real screenshots, empty/error states, and keyboard behavior.
3. **Working flow:** integrate sign-in, one-file upload, rule selection, review, export, recovery, and library. Replace blocking alert chains with clear inline stages where feasible.
4. **PWA and persistence:** manifest/icons, offline shell, safe update lifecycle, install guidance, and the chosen library continuity solution.
5. **Verification and release:** validate supported browser/installed modes, retention/recovery compatibility, accessibility, and real backend flows. Keep original branch available throughout.

Milestones are ordered by dependencies, not time estimates. Estimate after visual direction and library scope are agreed.

## 10. Acceptance criteria

- A first-time user can identify how to upload a file within five seconds during a small usability test.
- At least four of five representative test users can mask one selected column and export without instruction; use non-sensitive fixtures. These are proposed targets, not achieved metrics.
- No gradients or decorative metric cards in the signed-in UI. Typography, component spacing, and action colors follow shared tokens.
- Layout works from 360px mobile width through desktop; page-level horizontal overflow is absent. Spreadsheet scrolling remains intentionally inside its viewport.
- All interactive controls work by keyboard, have visible focus and accessible names, and do not rely on color alone. Aim for WCAG 2.2 AA; verify contrast and 200% zoom. Touch targets aim for at least 44px.
- Dialogs manage focus and return it on close. Long filenames, loading/error states, empty files, invalid uploads, missing originals, and interrupted requests have reviewed designs.
- Dock never covers a row action, dialog action, text field, or export action, including with the mobile keyboard open.
- Install/launch, session expiry, reload/deep links, offline fallback, safe updates, and uninstall/reinstall storage behavior are manually verified across supported platforms.
- DevTools/cache inspection confirms sensitive network responses are absent from service-worker caches. Logout followed by offline launch exposes no prior dataset.
- CSV/XLSX fixtures preserve unselected values, headers, leading zeros, dates, and supported numeric precision according to existing behavior. Masked export/recovery remains compatible with existing file signatures and keys.
- Production build and relevant API/processor checks pass. Visual approval requires desktop and mobile screenshots, not build output alone.

## 11. Scope boundaries and open decisions

First release excludes dark mode, collaboration, billing, team administration, automated AI classification, native mobile wrappers, push notifications, background processing queues, and an all-Go rewrite.

Proposed defaults: light only; charcoal and warm white with ink-blue actions; dock on desktop and mobile; one file per masking task; existing backend; online processing; server-backed metadata library for public release.

Decisions to revisit after design exploration: accent hue and typeface; whether server-library work belongs in the initial public release or a clearly labeled prototype stage; whether Go is an explicit learning/maintenance objective independent of performance.

## 12. Reference notes

Repository evidence: `README.md`, `client/package.json`, `server/package.json`, `server/auth.js`, `server/file-routes.js`, `server/main_app.py`, `client/src/utils/indexedDBUtils.js`.

- PWA installation varies by browser/platform: https://web.dev/learn/pwa/installation
- Service-worker caching behavior and strategy: https://web.dev/learn/pwa/caching
- Safari web apps and Add to Dock, including separate website data: https://support.apple.com/en-us/104996
- WebKit Home Screen web apps and manifest behavior: https://webkit.org/blog/13878/
- Go relational database support: https://go.dev/doc/database/

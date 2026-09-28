# SecurMask frontend revamp — product requirements

Status: ready for implementation planning  
Date: 2026-09-28  
Scope: complete frontend experience, responsive design system, React Hot Toast, installable PWA
Brand constraint: preserve SecurMask, the original student attribution and the existing SecurMask logo. This is a UI refactor, not a replacement product identity.  
This document specifies the revamp; it does not mean the interface or PWA has already been implemented.

## 1. Product intent

Turn SecurMask from a collection of prototype screens into a distinctive, coherent workspace for preparing datasets to share. The core journey is:

**Sign in with email → import a dataset → choose columns → mask → review → download.**

Recovery of the original remains a separate, clearly named journey requiring the original file key. Users should understand their next action, the state of their file, and what has actually happened without reading technical documentation.

Audience: students, researchers, analysts and small teams working with CSV/XLSX datasets. The interface must feel intentional on a laptop and equally considered as an installed phone app.

### Outcomes

- A first-time user can find Import immediately and complete the main workflow without guidance.
- Desktop feels like a focused data workspace; mobile is designed for touch rather than a compressed desktop.
- Status feedback is consistent, non-blocking and tied to real operations.
- The visual identity is recognizably SecurMask across login, workspace, dialogs, tables and PWA.
- Existing accounts, file ownership, encryption keys and supported processing behavior continue to work.

## 2. Inspiration and creative direction

The user supplied two Lerak references: a restrained desktop dashboard and a dark mobile app with an elevated central dock action. They are visual inspiration only.

Borrow:
- Editorial heading hierarchy, tight composition and generous negative space.
- A dark navigation frame contrasted against calm content surfaces.
- One clear primary action and purposeful asymmetry.
- Mobile cards with strong information hierarchy.
- A floating, rounded dock with a raised central action.

Do not copy the football branding, badges, photos, stripe composition, red identity, wording or decorative statistics. Do not recreate the screenshots as a template with SecurMask labels.

### Direction: “The Private Edit”

A contemporary document workspace: warm paper, deep green ink, sharp citron accents, small folio labels and abstract redaction marks. Confident and tactile, without adding stock security imagery or a generic gradient dashboard. Retain the original SecurMask logo; the proposed palette is for supporting interface surfaces and controls.

Core visual motif: stacked document edges and selective redaction bars. Use these in empty states and one restrained feature panel, alongside the original logo. Do not replace or redraw the student’s brand mark. Create them as lightweight SVG/CSS, never as text baked into raster mockups.

Sample product copy:
- Overview: “Ready for a cleaner share.”
- Import: “Bring in a dataset.”
- Review: “Check the details before you share.”
- Empty files: “Your next dataset starts here.”
- Recovery: “Recover the original with your file key.”

These are creative proposals; avoid copy implying guaranteed anonymity or that every sensitive value has been detected.

## 3. Design system

### Palette

Implement semantic CSS variables, mapped into Tailwind. Components must use tokens rather than unrelated hex values.

| Token | Value | Role |
| --- | --- | --- |
| paper | #F5F3EC | Main canvas |
| surface | #FFFFFF | Tables, forms and panels |
| surface-muted | #ECEFE6 | Recessed controls and secondary sections |
| ink | #172522 | Primary text, sidebar, mobile dock |
| ink-raised | #243831 | Dark feature panels |
| forest | #255B4B | Links, selected controls on light surfaces |
| citron | #D8F36A | Primary accents on ink; action fills with ink text |
| muted-text | #59665F | Secondary copy on light surfaces |
| border | #D7DDD3 | Decorative separators and panel outlines |
| success | #236645 | Success text/icon, paired with pale green |
| warning | #8C4A14 | Warning text/icon, paired with pale amber |
| danger | #B33440 | Error/destructive text, paired with pale rose |

Citron uses ink text, never white. Do not use the pale decorative border as the sole boundary for an interactive control; inputs and focus indicators need stronger contrast.

The first release uses a paper canvas with ink navigation and selected ink feature panels on every device. Mobile gains depth through its dock and feature cards, not a completely different brand. A full alternate dark theme is a later enhancement, not a prerequisite.

Verify final text contrast at least 4.5:1 for normal text, 3:1 for large text, and 3:1 for meaningful control boundaries/focus indicators. Adjust token pairings if measurement fails.

### Typography and layout

- Proposed type pairing: Manrope for headings, Inter for body/UI, IBM Plex Mono for file metadata and selected data labels. Self-host a minimal set of WOFF2 weights after checking distribution licenses; use system fallbacks.
- Body: 14–16 px desktop, at least 16 px for mobile form inputs. Metadata may be 12–13 px; avoid unreadable microcopy.
- Display heading: 40–48 px desktop, 28–34 px mobile. Keep uppercase to short eyebrow labels.
- Use tabular numerals for counts and sizes. Table values remain selectable.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64 px.
- Corners: 10 px controls, 16 px panels, 24 px sheets, fully rounded dock.
- Shadows: subtle on panels; stronger on floating surfaces only. Fine borders carry most structure.
- Use Lucide consistently. Replace mixed raster navigation icons and redundant icon libraries.
- Avoid an equal-card grid for every screen. Use lists, section dividers, tables and open space deliberately.

### Responsive composition

| Width | Layout |
| --- | --- |
| Under 768 px | Single column, compact header, floating bottom dock |
| 768–1199 px | Compact navigation rail, flexible workspace |
| 1200 px and above | 232–248 px sidebar, spacious content area |

General content width caps around 1440 px; dataset workspaces may expand beyond that. Pages scroll naturally. Use 100dvh where needed, not fixed-height layouts that clip content. Horizontal overflow belongs inside the data table, never on the whole page.

## 4. Navigation and mobile/PWA dock

### Desktop shell

Build one shared AppShell rather than reproducing sidebar/header offsets in every page.

Primary sidebar:
1. Overview
2. Files
3. Recover original

Secondary area: Settings, Help, account menu and sign out.

Header: current page/breadcrumb, contextual file name when applicable, and the relevant primary action. Do not add a decorative search field or notification bell without working behavior.

### Mobile dock

Five positions, left to right:

**Home · Files · Import · Recover · Settings**

- Import is a button opening the import sheet; it is not a fake navigation destination.
- Home, Files, Recover and Settings are links with route-aware active states.
- Ink capsule, restrained translucency, fine highlight border, soft shadow.
- Raised citron Import button, 56–60 px diameter, with a 24 px upload/plus icon and a visible “Import” label.
- Side items have 20–22 px icons and 11–12 px labels. Active state includes shape/weight/indicator as well as color.
- Dock body approximately 68–76 px high; horizontal inset 12–16 px and max width around 480 px.
- Position above env(safe-area-inset-bottom). Reserve enough page bottom padding for the entire dock and raised action.
- Solid-color fallback when backdrop blur is unavailable; no heavy animated glow.
- Minimum 44×44 px touch targets, preferably 48 px.
- Hide the dock on login and while a blocking full-screen sheet is active. Restore it after dismissal.
- When the virtual keyboard is open, dock placement must not obstruct inputs or submit buttons. Keep the form usable even where keyboard detection APIs differ.
- Keep identical navigation semantics in a normal mobile browser and standalone PWA.
- No hover-dependent controls, invisible gesture-only actions, or dock bounce on every navigation.

## 5. Screen requirements

### A. Passwordless sign-in

- Desktop: concise email/code form beside an abstract document composition, not the old stock illustration.
- Mobile: a focused single-column form with the brand mark and enough space for the keyboard.
- Explain that the same email flow signs in existing users and creates new accounts after verification.
- Email step: labelled input, validation and “Send sign-in code”.
- Verification step: one accessible six-digit input supporting paste and one-time-code autofill; show destination, resend cooldown, expiry guidance and “Use another email”.
- Disable duplicate requests. Keep delivery/validation failures beside the form.
- Successful verification returns to an intended safe internal route when possible.
- No password fields, password-reset links or CAPTCHA.
- Never put the email code, session token or file key in a toast, URL, persistent UI state or analytics.

### B. Overview

- Editorial title and one primary Import action.
- One dark feature panel explaining the immediate workflow, using synthetic document graphics.
- Recent files list with genuine local metadata and clear next actions.
- Optional compact counts: files available in this browser and files with a local masked result, if the data supports them.
- All summaries explicitly reflect this browser's catalog. Do not show invented cloud totals, security scores, breach statistics or unsupported “files protected” claims.
- New-user state emphasizes the three-step workflow instead of an empty dashboard of zeros.
- “Try a sample” may use a bundled, clearly labelled synthetic CSV. It must follow the same real processing flow and upload limits; no simulated success.

### C. Files

Rename “Folders” to “Files”; there is no real folder model today.

Desktop list/table: name, format, available status, uploaded date and actions. Show size only if captured reliably. Mobile uses compact file rows/cards with the same information.

Required:
- Search local file names, sort, filter by available status, clear filters.
- Distinguish empty catalog, no search matches, loading and unavailable local data.
- Account-specific IndexedDB remains the launch data source.
- Disclose “Files available in this browser” in a quiet but visible location.
- Explicit delete confirmation explains that the action removes the server upload and related local entry. No pretend Undo after a permanent server delete.
- Network failures preserve the existing row and explain whether the action can be retried.
- A missing local record must not produce a blank screen or imply that the server file was deleted.

### D. Import flow

Use one reusable flow launched from header, overview, files or dock.

1. Choose one CSV/XLSX file by picker or drag/drop.
2. Validate type and current 5 MiB UI limit.
3. Detect columns through the API and show a compact summary.
4. Set/confirm a file encryption key using existing backend-compatible validation.
5. Explain that the key is not saved by SecurMask and is required for recovery.
6. Upload and confirm completion before adding the persistent local record.
7. Continue directly to the masking workspace.

The backend ceiling remains 10 MiB; the revamp must not silently increase the UI limit. The server currently limits retained uploads per user per UTC day. Do not calculate an authoritative remaining allowance from incomplete browser-local data.

Show truthful stages: Reading file → Checking columns → Uploading → Ready. Show upload percentage only when measured from byte transfer; processing is indeterminate. Never animate a fabricated 0–100% processing counter.

Cancelling a client request does not guarantee server rollback. Do not automatically retry uploads after an ambiguous network failure; explain the uncertain result and avoid creating accidental duplicates.

### E. Masking workspace

- File header with name, known row/column counts and available status.
- Desktop: column-selection panel alongside a large data preview; sticky action area.
- Mobile: “Columns” and “Preview” views, with a reachable Run masking action.
- Search/select columns, select all/clear, show selection count.
- Use the processor's current default masking behavior. Do not expose technique dropdowns that the API does not accept.
- Remove or clearly defer the current non-functional custom-mask UI.
- “Run masking” requests the file key in a focused dialog/sheet. No CAPTCHA.
- Disable repeated submission while running. Preserve selection after recoverable errors.
- Masking failures leave original data intact and do not mark the file completed.

Review after processing:
- Show the actual returned output, with selected column headers identified.
- Allow a clear Original / Masked comparison where original data is available locally and the user deliberately opens it.
- Explain that unselected columns remain unchanged and masking may retain partial values.
- A result is “Ready to review”, not “Guaranteed anonymous”.
- Download and recover remain distinct actions.

Tables need sticky headers, constrained horizontal scrolling, keyboard access, clear truncation/expand behavior, and pagination or virtualization. Never render all 100,000 supported rows into the DOM.

### F. Download and recover

Download:
- Preserve the existing signing and verification format.
- Clearly distinguish masked CSV from recovered original CSV.
- Only announce “Download started” after a valid response/blob and browser download initiation. Do not claim the file was saved to disk.
- Signature errors must block the affected recovery/export flow and provide a next step.

Recovery:
- Dedicated destination from sidebar/dock.
- Preserve the current supported signed-file identification and signature-verification path; do not infer a new API.
- Explain that recovery requires the matching stored original, ownership and the original encryption key.
- Wrong key, invalid signature, missing stored file, expired session and offline state have distinct, understandable outcomes.
- For XLSX imports, describe recovered output as CSV rather than promising restoration of workbook sheets, formatting or formulas.

### G. Settings and help

- Explain email-code authentication; keep sign out easy to find.
- Profile preferences are browser-local unless a server profile endpoint is separately added. Do not imply changing a display email changes the login identity.
- Explain file-key handling and the local catalog limitation in plain language.
- Offer “Clear data from this browser” with explicit scope and confirmation; it must not delete server uploads.
- Provide an install entry point where supported.
- Help replaces long generic marketing content with concise upload, masking, key, recovery and storage guidance.
- Do not show an unverified inherited support address or a non-functional feedback action.

## 6. Status feedback — React Hot Toast

Use react-hot-toast as the single global toast system. Mount one themed Toaster at the application root so notifications survive route changes. Use stable operation IDs; update the existing toast instead of stacking duplicate loading/success messages.

| Event | Feedback |
| --- | --- |
| Code requested | “Code sent. Check your email.” plus persistent verification form |
| Code rejected/expired | Inline form error; no duplicate toast |
| Upload running | Persistent progress in upload UI; one loading toast only if useful outside it |
| Upload complete | “File imported.” |
| Masking running | “Masking your selected columns…” with disabled action |
| Masking complete | “Masked file ready to review.” |
| Download initiated | “Download started.” |
| File deleted | “File deleted.” after server confirmation |
| Request failed | Brief actionable error toast plus persistent error at the affected control |
| Session expired | One deduplicated notice and sign-in redirect |
| Offline | Persistent connection banner; avoid a toast on every failed request |

Behavior:
- Use toast.promise for suitable request lifecycles; use explicit loading/update handling for measured upload stages.
- Success around 3–4 seconds, transient errors around 6 seconds. Important failures also remain inline until resolved.
- Desktop top-right; mobile top-center beneath safe-area/header, away from the dock.
- Limit simultaneous visible notifications to three and deduplicate repeated network/auth failures.
- Style with SecurMask typography, semantic colors, subtle borders and Lucide icons.
- No sensitive cell contents, keys, OTPs or raw server errors in toast messages.
- Polite live-region announcements for normal status, restrained alert behavior for errors. Loading updates must not repeatedly interrupt screen readers.
- Toasts never replace destructive confirmation, key entry, durable progress or validation.
- Replace native alert() and SweetAlert2 status popups. Replace SweetAlert2 confirmations with accessible, reusable dialogs; remove its dependency once unused.

Implementation reference: [React Hot Toast documentation](https://react-hot-toast.com/docs).

## 7. PWA scope and privacy

PWA here means an installable, responsive application shell with deliberate offline behavior. It does not mean offline masking or background processing.

Launch requirements:
- Web manifest with SecurMask name, stable app ID, start URL, scope, standalone display and matching theme/background colors.
- Proper 192/512 icons, maskable artwork and Apple touch icon. Icons must be real exported assets, not stretched screenshots.
- HTTPS production delivery, install affordance where supported, and contextual manual installation guidance where browser support differs.
- No forced install prompt on first visit.
- Service worker precaches only public static shell assets: HTML, CSS, JS, icons and fonts.
- Explicitly exclude /api, authenticated responses, dataset payloads, generated downloads, keys and OTPs from service-worker caches.
- Offline launch shows a branded reconnect screen. No new login, upload, masking, recovery or download requests are queued for later.
- Do not expose cached dataset previews after an offline launch without fresh session validation.
- Existing IndexedDB data is a separate browser-local store, not a new offline authorization mechanism.
- On logout/account switch, clear in-memory previews, keys and sensitive session state; never leak one account's catalog into another.
- Service-worker updates show “Update available” and wait for user action when idle. Do not reload during uploads, masking or unsaved selections.
- Cache names are versioned; old static caches are cleaned after activation.
- Test standalone mode, safe areas, keyboard interaction and update recovery on real mobile browsers.

References: [MDN installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) and [offline operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation).

## 8. Frontend architecture and migration

Keep React, Vite, React Router and Tailwind. This is a frontend revamp, not a backend/platform rewrite.

Suggested ownership:

| Area | Responsibility |
| --- | --- |
| app/ | Router, authentication boundary, shared shell, providers, Toaster |
| components/ui/ | Button, input, badge, dialog, sheet, skeleton, empty/error state |
| components/navigation/ | Sidebar, header, mobile dock |
| features/auth/ | Email-code login |
| features/files/ | Catalog, import, record lookup and deletion |
| features/masking/ | Selection, preview, processing and review |
| features/recovery/ | Signature/key recovery workflow |
| lib/ | API client, normalized errors, download helpers, IndexedDB adapter |
| styles/ | Tokens and base typography |
| pwa/ | Install/update UI and service-worker registration |

- Consolidate API calls around the existing apiUrl helper and credentialed requests.
- Reuse the current authenticated endpoints; verify contracts before rewriting callers.
- Separate server data, browser-local records, form state and transient operation state.
- Keep keys in memory only; clear on submit completion, dismissal, logout and route exit.
- Do not send dataset contents or authentication material to analytics/error-reporting services.
- Keep schema-compatible IndexedDB records or provide a tested versioned migration. Do not erase users' existing catalogs during the redesign.
- Lazy-load heavy XLSX parsing and workspaces; do not ship spreadsheet libraries on the login route.
- Review legacy dependencies, including the current securemask file:.. entry, before removing them; prove the client installs/builds independently.
- Preserve /api proxy routing and the existing Railway web Docker build.

### Routes and compatibility

Keep / as email login and /homepage as Overview initially. /folder becomes the Files view and /setting stays Settings. Add /recover. Legacy /register and /forgot-password continue redirecting to login.

Introduce a durable frontend file route such as /files/:fileId only with record resolution from the authenticated user's local catalog. Missing records receive an explanatory recovery state. /display must have a reload-safe fallback; relying solely on router location.state is insufficient.

### Existing API boundaries

Browser calls /api; the proxy removes the prefix.

- Authentication: POST /login, POST /resend-otp, POST /verify-otp-login, GET /verifyToken, POST /logout.
- Files: POST /detect_columns, POST /upload, POST /mask, POST /file.
- Integrity/deletion: POST /generate-signature, POST /verify-signature, DELETE /deleteFile.
- No server file-list, folder tree, job-progress or general custom-mask endpoint exists today.

Cloud file browsing, durable activity history, accurate global quotas and resumable background jobs require separate API work. Do not represent them as finished frontend features.

## 9. Motion and accessibility

- Interaction transitions: roughly 120–180 ms; sheets/panels: 180–240 ms.
- Small opacity/translation transitions only. No parallax, looping security animation or ornamental dashboard counters.
- Honor prefers-reduced-motion.
- Visible focus on every control, complete keyboard navigation, semantic landmarks and a skip link.
- Dialog/sheet focus trapping, Escape handling, labelled title and focus return.
- Support 200% zoom and narrow 320 px layouts without lost controls.
- Error and selection states use text/icons in addition to color.
- Use accessible labels for icon buttons; decorative imagery has empty alt text.
- Large-data tables maintain understandable column headers and reading order.
- Import remains usable without drag/drop; column actions remain usable without hover.

## 10. Delivery phases

1. **Inventory and foundation** — map existing flows, capture baseline screenshots, establish tokens/type and integrate the original brand mark and accessible UI primitives.
2. **Shell and authentication** — responsive AppShell, sidebar, dock and email-code login; install one Toaster and normalized API errors.
3. **Core files workflow** — Overview, Files, unified import, masking workspace, real result review, export and recovery. Preserve existing records and endpoints.
4. **Settings and cleanup** — honest local preferences/help, replace legacy alerts/dialogs, remove unused assets and dependencies.
5. **PWA and resilience** — manifest/icons, safe static caching, installation, offline and update states.
6. **QA and release** — visual/functional/accessibility checks, CI/container verification, production smoke test.

Each phase must produce functional screens with loading, empty, error and success states. Do not finish a polished dashboard while leaving the actual masking flow on the old UI.

## 11. Acceptance criteria

### Visual and responsive

- Approved direction is expressed consistently across every route; no old purple gradients, stock login illustration or mixed navigation systems remain.
- Screenshot review covers 360×800, 390×844, 768×1024, 1440×900 and 1920×1080.
- At 320 px and 200% zoom, actions remain reachable; only table content may scroll horizontally.
- Dock, sheets, toasts and keyboards never obscure primary controls or the last list item.
- Keyboard, focus, contrast and reduced-motion checks pass.
- Product screens contain no decorative or fabricated data.

### Functional

- Existing and new accounts complete passwordless login; expiry, resend cooldown, wrong-code and delivery failures are usable.
- CSV/XLSX import, column detection, masking, signed download, recovery and deletion work against the real API/processor.
- Unauthenticated requests remain rejected and cross-account file access remains blocked.
- Codes and file keys are absent from persistent client storage, URLs and logs introduced by this work.
- Wrong-key and signature errors do not produce downloadable error payloads.
- Ambiguous network failures never produce false success or automatic duplicate uploads.
- Existing IndexedDB records remain usable; account switching never reveals another catalog.
- Refresh/deep-link/missing-record states resolve predictably.

### Feedback and PWA

- All mutation feedback uses the specified inline/progress/toast conventions.
- No native alert() or SweetAlert2 status popup remains in the active frontend.
- PWA launches in standalone mode where supported; mobile browser mode remains fully usable.
- Offline launch gives a reconnect state; inspecting Cache Storage shows no API responses or dataset contents.
- An available service-worker update does not interrupt active work.
- Install guidance is platform-appropriate and dismissible.

### Engineering and performance

- Clean npm ci, frontend build, existing API/processor tests and Docker CI pass.
- Add focused component/end-to-end tests for login, import, selection/review, recovery errors, dock navigation, toast deduplication and offline/update behavior.
- Target login's initial JavaScript at no more than 200 KiB gzip through route/library splitting; report measured results and justify any exception.
- A 10,000-row preview stays interactive and uses a bounded DOM (target no more than 100 rendered body rows at once).
- Run accessibility automation plus manual keyboard/mobile checks; automated scores alone are not acceptance.
- No real datasets are added to test fixtures, screenshots or the repository.

## 12. Explicitly deferred

- Server-backed cross-device catalog and real folder management.
- Arbitrary masking techniques, templates or per-cell rule editors.
- Team roles, collaboration, billing, sharing links and audit trails.
- Native apps, push notifications, background uploads and offline masking.
- A claim of end-to-end encryption, certified anonymization or guaranteed PII detection.
- Full theme switching beyond the initial Paper/Ink composition.

These can be separate follow-up requirements. They must not appear as working controls in this release.

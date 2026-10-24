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

CSV and XLSX up to 5 MB, 10,000 data rows, 100 columns. CSV must use UTF-8. Select a visible worksheet for XLSX; formula cells use the value last saved in the file (formulas are never evaluated or exported); a formula with no saved value is shown blank and an error such as #REF! is shown as saved. Merged cells keep their value in the top-left cell only. Columns that are empty in every row are dropped; blank headers are named by column letter (Column C) and repeated headers are numbered (Status (2)). In a CSV, a row with more values than the header is rejected. Preview shows the first 20 rows; export contains all rows of the selected sheet. CSV export contains values only, without formatting or other worksheets. For XLSX uploads, a masked XLSX export rebuilds the selected worksheet from the original file: formatting is kept, and formulas that only use that sheet are kept without their saved results so Excel recalculates them from the masked data. Formulas in masked columns, array formulas, and formulas that use other sheets, other files, defined names or text matching masked values are replaced with their values. Notes in masked cells are removed. Other worksheets, defined names, charts and pivot tables are not exported. Rules are explicit: keep, remove values, replace with column-heading-based row IDs (Name 0001), hide all characters with X, partially hide emails (first local character and domain remain), hide phones except their last four digits, hide text except its last four characters, or actual ten-year age bands (whole ages 0–120). Blank cells remain blank. Formula-like values are escaped in CSV exports. Optional pattern-based sensitive-field suggestions; no anonymity guarantee. Clear file terminates processing and drops the in-memory dataset.

Partial masking retains length and selected details; it is not anonymisation. Invalid emails are fully hidden. Phone and text values with four or fewer digits/characters are fully hidden. Preview and export use the same rules.

### Smart suggestions and protection score

“Suggest sensitive fields” reviews English/Malay headings and up to 200 evenly distributed nonblank values per column locally. Suggestions include a heuristic confidence percentage and matching evidence. Strong suggestions are selected by default; ambiguous numbers, free text, and mixed ages require review. Bulk selection and a sensitive-column filter support wide files. Existing rules (including explicit Keep) are preserved unless replacement is selected. Applying suggestions never bypasses the preview/download review gate.

Confidence is not a calibrated probability: heading-only evidence = 80; heading + value pattern = 55 + 40 × match fraction; value-only emails = 70 + 25 × fraction; ambiguous numbers = 40 + 25 × fraction. Value-only matches require at least half the sample to match. Pattern scores with fewer than five samples are capped at 85. Header matches take precedence over ambiguous value-only matches.

After reviewing a file, protection coverage checks actual output across all nonblank cells in detected columns. Changed full replacements receive 1 point, compatible partial masking 0.5, unchanged or incompatible output 0; score = points / detected cells × 100. These weights are product heuristics, not a privacy-risk measurement. No detections yields no score, never a 100% safe claim. The report lists residual details and unclassified columns. Even 100% coverage cannot establish anonymity or detect all sensitive information. Changing rules invalidates the result and score; changing worksheets/files also resets suggestions.

### Workshop conveniences

Files offers “Try a sample” when no file is open. It loads six entirely fictional participants (example.com email addresses and fictional 555 phone numbers) through the normal CSV reader, works offline once the app is cached, and supports the same suggestion/review/export flow. Clear the current file first to return to the sample button. The sample includes a practice task about sharing session attendance counts.

“Undo applied suggestions” restores the exact rules from before the most recent batch, including explicit Keep choices, and invalidates the preview, score, and download acknowledgement. It is available after review/export and while moving between dock tabs. A manual rule change clears undo so later edits cannot be silently lost; changing worksheet/file or clearing the file also clears it. The protection report reminds participants to keep only what their task requires instead of chasing 100%.

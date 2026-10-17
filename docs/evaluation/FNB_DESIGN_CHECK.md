# F&B v0.41 design check

Disposition: preserve incumbent system; scoped extension ready to ship. Fresh documenter check after the final UI review, dated 2026-10-17. This ordinary Operate extension introduces no approved visual-world replacement, system-token revision, or new asset.

## Authority and comparison

Read `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `.impeccable/briefs/fnb-availability.md`, `docs/FNB_OPERATIONS.md`, [FNB_UI_REVIEW.md](FNB_UI_REVIEW.md), and [fnb-release.json](fnb-release.json), following the impeccable `reference/document.md` guidance. Compared the finished captures and scoped source in `public/styles.css`, `public/staff.css`, `public/live-views.js`, `public/staff-workspace.js`, and `public/guide-content.js` with incumbent `69a6f03` and incoming `fe073d0`. Current HEAD `84fed1e` adds documentation after the incumbent implementation.

The pinned Neighborhood Kedai identity remains cream/terracotta with locally hosted Nunito Sans under the `Nunito` CSS alias, warm brown dark mode, written statuses, native forms, and separate owner/staff navigation. Existing recipes, ledgers, capacity/waste/ETA, guide arrows, and explicit confirmation flows remain the integration context. No new raster asset or alternate visual language was introduced.

## Finished evidence

Opened all eight authoritative full-page captures at original detail under `.impeccable/review/fnb/`:

| Surface | Desktop | Phone | Observed result |
| --- | --- | --- | --- |
| Cashier | `cashier-desktop.png` (1440 x 1237) | `cashier-mobile-dark.png` (390 x 1650) | Status words and a separate selected-low explanation remain readable; the phone form stacks with reachable actions. |
| Owner activity | `activity-desktop.png` (1440 x 2496) | `activity-mobile.png` (390 x 2817) | Name and role accompany each new action in the established separated history list. |
| Registration | `auth-desktop.png` (1440 x 1155) | `auth-mobile.png` (320 x 1305) | Adopted entry buttons, guide choices, and labeled native fields wrap within the existing auth shell. |
| Empty stock | `empty-stock-desktop.png` (1440 x 1081) | `empty-stock-mobile-dark.png` (320 x 1319) | First-ingredient actions explain the next step; dependent actions are disabled; warm light/dark surfaces persist. |

The closed native menu label truncates on the narrow phone; its separate warning remains readable. The order quantity field describes the requested amount, not available portions. Source restricts selectable menus to configured `ok/low`, disables unavailable/unknown options, and associates the live `role="status"` explanation through `aria-describedby`; updating its text preserves the form. Owner history uses name/role lines and the honest `Pelaku belum tercatat` fallback. Guide version 7 explains the same cashier states. These extend existing patterns rather than establish new system primitives.

The fresh UI review reports `ship` with no material fix. Its capture review agrees with this check. The parent's own inspection used one batched pass; this documenter pass makes no UI correction or further polish. Fixed phone navigation appearing at the viewport boundary inside long captures is expected full-page capture behavior.

## Preserved authority and inherited drift

`DESIGN.md` and `.impeccable/design.json` were left byte-identical. SHA-256 checked against the pinned values:

| File | SHA-256 |
| --- | --- |
| `DESIGN.md` | `769ec61803fcbc4bbaad840a21df02c1fceb8996f7894891dfd5637c04491c04` |
| `.impeccable/design.json` | `c31fbfcb60ab61b3b4152b3a87e8b22ca5e1abf008039ea8dc469584c742b51f` |

The existing single detector report, `data/fnb-detector.json`, contains 113 findings: 99 font-size, one radius, and 12 color advisories, plus one cream-palette warning. Cream is explicitly user-pinned. Advisory values remain reported drift; this check neither repairs nor canonizes them. No context or detector rerun was performed.

Comparison with `fe073d0` attributes the button shadows/hover lift, filled secondary and text-action treatments, revised field border/padding/focus, dashed empty states, drawer sizing, and kitchen layout changes to the adopted incoming source. Several differ from the older system prose/specimens, including flat/direct-color button behavior and field dimensions. They are retained as requested upstream integration, not silently promoted into new DESIGN.md rules. Main stylesheet differences from incoming retain the already-established kitchen capacity/waste/catalog/ETA rules. The F&B-specific warning adds only semantic ink, spacing, and empty-note hiding in `staff.css`.

## Supporting validation and bounds

[Release evidence](fnb-release.json) records final `npm test` exit 0, verified process session 37060: 253 Node + 51 browser tests = 304 unique passes, zero failures, with UTF-16LE log `data/fnb-npm-test-final.log`. This documenter did not rerun tests or launch another browser/server. [Runtime evidence](fnb-runtime.json) records 14 anonymous HTTP checks, actual owner/cashier/kitchen demo logins, staff 403 guards, and unchanged demo business data. The [live-data](fnb-data-preservation.json) and [legacy-demo](fnb-legacy-demo-preservation.json) reports preserve all original rows/columns across 29 tables with eight additive nullable actor columns and valid integrity/foreign keys.

Captures use isolated synthetic fixtures. The separate opt-in demo has nine ingredients, seven menus, four active orders, and three roles; it does not seed production data or change models. Visual review and these automated checks do not establish field accuracy or production security. Staff pairing, deployment/HTTPS, cross-device validation, and a real kitchen pilot remain open. The sole write by this documenter is this check record.

# Integration design check — v0.40

**Compatible with the incumbent system; reviewer disposition: ship within the branch integration scope.** This is the documentation check for the [Operate direction contract](../../.impeccable/briefs/branch-integration.md), not a redesign or deployment approval. The final [UI review](INTEGRATION_UI_REVIEW.md) reports no open material finding; its punctuation correction is resolved.

## Comparison and identity

Compared PRODUCT.md, DESIGN.md and `.impeccable/design.json` with the [integration notes](../BRANCH_INTEGRATION.md), final `public/styles.css`, `public/staff.css`, `public/index.html`, `public/guide.js`, `public/guide-content.js`, `public/guide-layout.js`, `public/guide-state.js`, `public/kitchen-view.js` and `public/catalog-screen.js`. Git comparisons used feature source `5318dfd` and incoming interface `b6bae4d`.

The result extends the existing **Neighborhood Kedai** identity in code. Light canvas `#fcfaf6`, paper `#fffdf9`, brown ink `#382c24` and terracotta `#a3452b` retain their semantic assignments. Warm brown dark surfaces and peach actions remain paired. Locally hosted Nunito Sans under the `Nunito` alias, tabular quantities, written status labels, bordered panels, visible focus and reduced-motion handling remain the shared language. No new visual world or asset set was introduced; no new-design approval was needed for this integration.

The incoming stylesheet largely reformats the incumbent system and refines auth/theme controls, navigation, button states and guide geometry. The merged stylesheet also retains the feature branch's capacity, partial-waste, catalog-inbox and ETA rules. `index.html` still loads the staff stylesheet; the cashier/kitchen shells and standalone catalog keep their separate tasks and reuse the same semantic styling.

Guide version 6 preserves role-specific help, explicit next/back/skip/pause controls and per-page introduction progress after UI registration. A running tour is protected from replacement by autoplay. Capacity and waste forms retain labels, units, limits, explicit confirmation and return controls. Item ETA is labeled **Perkiraan selesai**, approximate values use `~`, and missing legacy ETA is omitted. These are extensions of existing operational components rather than new design primitives.

## Reviewed evidence

The UI reviewer opened all eight final captures at original detail. This documentation pass relies on that visual assessment and source comparison; it did not repeat browser operation or capture review.

| Evidence | Covered state |
| --- | --- |
| [Auth desktop](../../.impeccable/review/integration/auth-desktop.png), [auth mobile](../../.impeccable/review/integration/auth-mobile.png) | Registration, theme/help controls, field focus and 320 px layout |
| [Guide mobile dark](../../.impeccable/review/integration/guide-mobile-dark.png) | Real target, arrow geometry and visible tour controls |
| [Capacity/waste desktop](../../.impeccable/review/integration/capacity-waste-desktop.png), [mobile](../../.impeccable/review/integration/capacity-waste-mobile.png) | Capacity warning, labeled fields and explicit partial-waste confirmation |
| [Kitchen dark](../../.impeccable/review/integration/kitchen-dark.png) | Warm dark shell and corrected command-feedback punctuation |
| [Cashier mobile](../../.impeccable/review/integration/cashier-mobile.png), [catalog mobile](../../.impeccable/review/integration/catalog-mobile.png) | Role/intake shortcut, quantity controls, totals and request confirmation |

The [release evidence](integration-release.json) records **246 Node tests + 49 browser cases = 295 passed**, exit 0, in `data/integration-npm-test-release.log` (UTF-16LE). The copy-only punctuation follow-up records one repeated case passed, exit 0, in `data/integration-copy-check.log`; it does not increase the unique total. Fourteen read-only runtime checks also pass. Capture values are isolated synthetic fixtures.

## Preserved records and existing drift

SHA-256 checks match the pinned files; neither design document was modified:

| File | SHA-256 |
| --- | --- |
| `DESIGN.md` | `769ec61803fcbc4bbaad840a21df02c1fceb8996f7894891dfd5637c04491c04` |
| `.impeccable/design.json` | `c31fbfcb60ab61b3b4152b3a87e8b22ca5e1abf008039ea8dc469584c742b51f` |

The existing `data/integration-detector.json` contains 119 findings: 106 font-size, three radius, eight color advisories and two cream-palette warnings. As recorded in the UI review, numeric/color values already occur in the source branches; cream is explicitly pinned. Documentation does not yet enumerate every shipped size, radius, color or operational component. This preexisting documentation drift is recorded without repairing DESIGN.md or its sidecar. No context or detector rerun was performed.

[Live preservation](integration-data-preservation.json) and [separate demo preservation](integration-demo-preservation.json) both pass **at migration time**: all 27 original tables retain their row counts and hashes over original columns, with 29 tables after migration. Migration-time live rows remain 28; demo rows remain 2,338. Both integrity checks are `ok`. SHA-256 of these evidence files is respectively `7677a896867604a1eb569f31176385e716ca4176ea91e2352c5ae57ce7fe190e` and `fb5ff74402c0362d32702db98e64a117a0e5f38ad41b1c77ec822eb9bb453ff9`.

The release evidence separately records the post-restart comparison: every live business table remains identical, while one session and its `account_sessions` link are absent. Remaining session rows are unchanged, with no additions. The cause is not asserted and no session was restored. All 29 demo tables remain unchanged. Migration-time preservation must not be read as strict equality of every live table after restart.

## Limits

This check establishes integration compatibility within the reviewed surfaces. Screenshots do not establish authorization, persistence, ETA arithmetic or complete accessibility. Public deployment, HTTPS/host configuration, cross-device pilot testing, real-kitchen ETA accuracy and the two-second voice target remain open. No model training, new benchmark result or field-accuracy claim follows from this check.
